-- Add sort/file-type filtering and LIMIT/OFFSET pagination to search_documents
-- ------------------------------------------------------------
-- Problem
--   search_documents(search_query, user_id) always returned up to 50 rows,
--   ranked by relevance only, with no way to sort, filter by file type, or
--   page through results. page.tsx worked around this by fetching every
--   document and sorting/filtering in JS (see docs/REFACTORING.md #3).
--
-- Fix
--   New optional parameters (p_sort, p_file_type, p_limit, p_offset) push
--   sorting, file-type filtering (matched against storage_path, same rule
--   as web/src/lib/fileType.ts's classify()), and pagination into SQL. A
--   count(*) over() window column returns the total matching row count
--   alongside each page so the caller can compute page count without a
--   second query.
--
-- Compatibility
--   This changes the function's argument list, so `create or replace` would
--   create a second overload rather than replacing the old one — drop the
--   old 2-arg signature first. Uses `drop function if exists` so this is
--   safe to run regardless of whether rpc_auth_hardening_migration.sql has
--   already run.
--
-- Run order
--   AFTER schema.sql. Order relative to the other migration files does not
--   matter — this migration is self-contained and does not depend on their
--   definitions. Idempotent; safe to re-run.
-- ============================================================

drop function if exists public.search_documents(text, uuid);

create or replace function public.search_documents(
  search_query text,
  user_id uuid,
  p_sort text default 'date_desc',
  p_file_type text default 'all',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamptz,
  folder_id uuid,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid    uuid := public.docforge_caller_id(user_id);
  v_query  tsquery := websearch_to_tsquery('english', search_query);
  v_limit  integer := least(greatest(p_limit, 1), 100);
  v_offset integer := greatest(p_offset, 0);
begin
  return query
  select
    d.id,
    d.title,
    d.storage_path,
    d.file_size_bytes,
    d.created_at,
    d.folder_id,
    count(*) over() as total_count
  from public.documents d
  where d.created_by = v_uid
    and d.search_vector @@ v_query
    and (
      p_file_type = 'all'
      or (p_file_type = 'pdf' and d.storage_path ilike '%.pdf')
      or (p_file_type = 'img' and (
            d.storage_path ilike '%.png' or d.storage_path ilike '%.jpg'
            or d.storage_path ilike '%.jpeg' or d.storage_path ilike '%.gif'
          ))
      or (p_file_type = 'txt' and (
            d.storage_path ilike '%.md' or d.storage_path ilike '%.txt'
          ))
      or (p_file_type = 'doc' and (
            d.storage_path ilike '%.doc' or d.storage_path ilike '%.docx'
          ))
      or (p_file_type = 'other' and not (
            d.storage_path ilike '%.pdf' or d.storage_path ilike '%.png' or d.storage_path ilike '%.jpg'
            or d.storage_path ilike '%.jpeg' or d.storage_path ilike '%.gif' or d.storage_path ilike '%.md'
            or d.storage_path ilike '%.txt' or d.storage_path ilike '%.doc' or d.storage_path ilike '%.docx'
          ))
    )
  order by
    case when p_sort = 'date_desc' then d.created_at end desc,
    case when p_sort = 'date_asc' then d.created_at end asc,
    case when p_sort = 'name_asc' then d.title end asc,
    case when p_sort = 'name_desc' then d.title end desc,
    case when p_sort = 'size_asc' then d.file_size_bytes end asc,
    case when p_sort = 'size_desc' then d.file_size_bytes end desc,
    ts_rank(d.search_vector, v_query) desc,
    d.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke execute on function public.search_documents(text, uuid, text, text, integer, integer) from public;
revoke execute on function public.search_documents(text, uuid, text, text, integer, integer) from anon;
grant  execute on function public.search_documents(text, uuid, text, text, integer, integer) to authenticated, service_role;
