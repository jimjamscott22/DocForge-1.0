-- Add folder context to search results
-- ------------------------------------------------------------
-- Caller identity for SECURITY DEFINER RPCs
-- ------------------------------------------------------------
-- SECURITY DEFINER bypasses RLS, so the functions below must not trust a
-- uuid passed in by the caller — those RPCs are exposed by PostgREST at
-- /rest/v1/rpc/<name> and anyone holding the public anon key can call them
-- directly. Identity comes from auth.uid(); a mismatched argument raises.
-- Kept in sync with supabase/rpc_auth_hardening_migration.sql.
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
-- Lock down EXECUTE on the SECURITY DEFINER RPCs
-- ------------------------------------------------------------
-- Postgres grants EXECUTE TO PUBLIC on new functions by default, which reaches
-- the anon role and therefore anyone with the public anon key.
revoke execute on function public.docforge_caller_id(uuid) from public;
revoke execute on function public.docforge_caller_id(uuid) from anon;
revoke execute on function public.docforge_caller_id(uuid) from authenticated;

revoke execute on function public.search_documents(text, uuid) from public;
revoke execute on function public.search_documents(text, uuid) from anon;
grant  execute on function public.search_documents(text, uuid) to authenticated, service_role;
