-- ============================================================
-- DocForge — RPC authorization hardening
-- ============================================================
-- Problem
--   Every SECURITY DEFINER function in this schema bypasses RLS and then
--   re-implements the ownership check against a *caller-supplied* uuid
--   parameter (user_id / p_created_by / p_restored_by) instead of auth.uid().
--   The RLS policies on the same tables use auth.uid() correctly, so the two
--   layers express one rule two different ways.
--
--   No GRANT/REVOKE existed anywhere in supabase/*.sql, so these functions kept
--   Postgres' default EXECUTE TO PUBLIC and PostgREST exposes them at
--   /rest/v1/rpc/<name> to the anon and authenticated roles. Any signed-in user
--   could call them directly and substitute another user's uuid:
--     - search_documents            -> read another user's documents
--     - restore_document_version    -> roll back another user's document
--     - upsert_document_with_version-> overwrite another user's document
--   The application itself always passes the authenticated user.id, so this is
--   not reachable through the app — only by calling the RPC endpoint directly.
--
-- Fix
--   Derive identity from auth.uid() inside the function and reject a mismatched
--   parameter loudly, then lock EXECUTE down to authenticated + service_role.
--   auth.uid() reads the request's JWT claim GUC, not the current role, so it
--   still resolves correctly inside SECURITY DEFINER.
--
-- Compatibility
--   All three signatures are unchanged, so no application code changes are
--   required. Every current caller already passes the authenticated user id:
--     web/src/app/page.tsx:60                    search_documents
--     web/src/app/api/upload/route.ts:147        upsert_document_with_version
--     web/src/app/api/import-url/route.ts:207    upsert_document_with_version
--     web/src/app/api/documents/[id]/versions/[versionId]/restore/route.ts:25
--   All of them use the session client (createSupabaseServerClient), never the
--   service-role admin client, so auth.uid() is always populated.
--
-- Run order
--   AFTER schema.sql, versioning_migration.sql and
--   search_folder_context_migration.sql — those files still contain the old
--   definitions and would overwrite this one. Idempotent; safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Single place that resolves "who is calling"
-- ------------------------------------------------------------
-- Returns the authenticated caller's uuid. If a claimed id is supplied and does
-- not match, raises rather than silently scoping down, so a mis-wired caller
-- fails visibly instead of quietly reading nothing.
--
-- service_role is allowed to act on behalf of a given user: it already bypasses
-- RLS entirely, so refusing it here would buy no security while breaking any
-- future background job. Nothing in the app uses that path today.
create or replace function public.docforge_caller_id(p_claimed uuid)
returns uuid
language plpgsql
stable
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role = 'service_role' then
    return coalesce(p_claimed, v_uid);
  end if;

  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = '28000';
  end if;

  if p_claimed is not null and p_claimed <> v_uid then
    raise exception 'user_mismatch'
      using errcode = '42501';
  end if;

  return v_uid;
end;
$$;

-- Only the SECURITY DEFINER functions below need this, and they call it as the
-- function owner, so no role needs a direct grant.
revoke execute on function public.docforge_caller_id(uuid) from public;
revoke execute on function public.docforge_caller_id(uuid) from anon;
revoke execute on function public.docforge_caller_id(uuid) from authenticated;


-- ------------------------------------------------------------
-- 2. search_documents — scope to auth.uid(), not the user_id argument
-- ------------------------------------------------------------
-- Signature and return type are unchanged. user_id is retained for
-- compatibility and is now validated against auth.uid() rather than trusted.
create or replace function public.search_documents(
  search_query text,
  user_id uuid
)
returns table (
  id uuid,
  title text,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamptz,
  folder_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.docforge_caller_id(user_id);
begin
  return query
  select
    d.id,
    d.title,
    d.storage_path,
    d.file_size_bytes,
    d.created_at,
    d.folder_id
  from public.documents d
  where d.created_by = v_uid
    and d.search_vector @@ websearch_to_tsquery('english', search_query)
  order by ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) desc,
           d.created_at desc
  limit 50;
end;
$$;


-- ------------------------------------------------------------
-- 3. upsert_document_with_version — write as auth.uid()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_document_with_version(
  p_document_id     uuid,
  p_title           text,
  p_storage_path    text,
  p_file_size_bytes bigint,
  p_content_type    text,
  p_created_by      uuid,
  p_content_text    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            uuid := public.docforge_caller_id(p_created_by);
  v_doc_id         uuid;
  v_version_number integer;
  v_doc            jsonb;
BEGIN
  IF p_document_id IS NOT NULL THEN
    UPDATE public.documents
    SET storage_path    = p_storage_path,
        file_size_bytes = p_file_size_bytes,
        content_text    = COALESCE(p_content_text, content_text),
        updated_at      = now()
    WHERE id = p_document_id
      AND created_by = v_uid
    RETURNING id INTO v_doc_id;

    IF v_doc_id IS NULL THEN
      RAISE EXCEPTION 'document_not_found';
    END IF;
  ELSE
    INSERT INTO public.documents (title, storage_path, file_size_bytes, created_by, content_text)
    VALUES (p_title, p_storage_path, p_file_size_bytes, v_uid, p_content_text)
    RETURNING id INTO v_doc_id;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM public.document_versions
  WHERE document_id = v_doc_id;

  INSERT INTO public.document_versions
    (document_id, version_number, storage_path, file_size_bytes, content_type, uploaded_by)
  VALUES
    (v_doc_id, v_version_number, p_storage_path, p_file_size_bytes, p_content_type, v_uid);

  SELECT to_jsonb(d) INTO v_doc
  FROM public.documents d
  WHERE d.id = v_doc_id;

  RETURN v_doc;
END;
$$;


-- ------------------------------------------------------------
-- 4. restore_document_version — restore as auth.uid()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_document_version(
  p_document_id uuid,
  p_version_id  uuid,
  p_restored_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := public.docforge_caller_id(p_restored_by);
  v_version      public.document_versions%ROWTYPE;
  v_next_version integer;
  v_doc          jsonb;
BEGIN
  SELECT dv.* INTO v_version
  FROM public.document_versions dv
  JOIN public.documents d ON d.id = dv.document_id
  WHERE dv.id = p_version_id
    AND dv.document_id = p_document_id
    AND d.created_by = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  UPDATE public.documents
  SET storage_path    = v_version.storage_path,
      file_size_bytes = v_version.file_size_bytes,
      updated_at      = now()
  WHERE id = p_document_id
    AND created_by = v_uid;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.document_versions
  WHERE document_id = p_document_id;

  INSERT INTO public.document_versions
    (document_id, version_number, storage_path, file_size_bytes, content_type, uploaded_by)
  VALUES
    (p_document_id, v_next_version, v_version.storage_path, v_version.file_size_bytes,
     v_version.content_type, v_uid);

  SELECT to_jsonb(d) INTO v_doc
  FROM public.documents d
  WHERE d.id = p_document_id;

  RETURN v_doc;
END;
$$;


-- ------------------------------------------------------------
-- 5. Lock down EXECUTE
-- ------------------------------------------------------------
-- Postgres grants EXECUTE TO PUBLIC on new functions by default, and PostgREST
-- exposes public-schema functions as RPC endpoints. Drop the implicit grant and
-- re-grant only to the roles that should have it. anon is revoked explicitly:
-- none of these are callable without a session.
revoke execute on function public.search_documents(text, uuid) from public;
revoke execute on function public.search_documents(text, uuid) from anon;
grant  execute on function public.search_documents(text, uuid) to authenticated, service_role;

revoke execute on function public.upsert_document_with_version(uuid, text, text, bigint, text, uuid, text) from public;
revoke execute on function public.upsert_document_with_version(uuid, text, text, bigint, text, uuid, text) from anon;
grant  execute on function public.upsert_document_with_version(uuid, text, text, bigint, text, uuid, text) to authenticated, service_role;

revoke execute on function public.restore_document_version(uuid, uuid, uuid) from public;
revoke execute on function public.restore_document_version(uuid, uuid, uuid) from anon;
grant  execute on function public.restore_document_version(uuid, uuid, uuid) to authenticated, service_role;


-- ------------------------------------------------------------
-- 6. Verification
-- ------------------------------------------------------------
-- Every SECURITY DEFINER function in public should appear here with EXECUTE
-- granted only to authenticated / service_role — never PUBLIC or anon.
--
--   select p.proname,
--          p.prosecdef as security_definer,
--          coalesce(array_agg(distinct r.grantee) filter (where r.grantee is not null), '{}') as grantees
--   from pg_proc p
--   left join information_schema.routine_privileges r
--     on r.specific_name = p.proname || '_' || p.oid
--    and r.privilege_type = 'EXECUTE'
--   where p.pronamespace = 'public'::regnamespace
--     and p.prosecdef
--   group by 1, 2
--   order by 1;
