-- Add folder context to search results
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
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.title,
    d.storage_path,
    d.file_size_bytes,
    d.created_at,
    d.folder_id
  from public.documents d
  where d.created_by = user_id
    and d.search_vector @@ websearch_to_tsquery('english', search_query)
  order by ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) desc,
           d.created_at desc
  limit 50;
$$;
