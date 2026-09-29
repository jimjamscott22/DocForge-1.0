-- Apply after folder_migration.sql. Fresh installs use schema.sql instead.
begin;

-- Authenticated, atomic folder deletion. A failed statement rolls back the RPC.
create or replace function public.delete_folder(p_folder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_parent_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Serialize deletions of this user's tree in a consistent lock order.
  -- FOR UPDATE also blocks new FK references to folders being removed.
  perform id from public.folders
    where user_id = v_uid order by id for update;

  select parent_id into v_parent_id from public.folders
    where id = p_folder_id and user_id = v_uid;
  if not found then
    raise exception 'folder_not_found' using errcode = 'P0002';
  end if;

  -- Older schemas allow foreign-owner references. Never move into or cascade
  -- through another user's tree.
  if exists (
    select 1 from public.folders
      where id = v_parent_id and user_id <> v_uid
  ) or exists (
    select 1 from public.folders
      where parent_id = p_folder_id and user_id <> v_uid
  ) or exists (
    select 1 from public.documents
      where folder_id = p_folder_id and created_by <> v_uid
  ) then
    raise exception 'folder_ownership_conflict' using errcode = '42501';
  end if;

  update public.documents set folder_id = null
    where folder_id = p_folder_id and created_by = v_uid;
  update public.folders set parent_id = v_parent_id, updated_at = now()
    where parent_id = p_folder_id and user_id = v_uid;
  delete from public.folders where id = p_folder_id and user_id = v_uid;
end;
$$;

revoke execute on function public.delete_folder(uuid) from public, anon;
grant execute on function public.delete_folder(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
