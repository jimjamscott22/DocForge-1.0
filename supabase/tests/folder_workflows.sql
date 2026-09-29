-- Run against a disposable/test Supabase database as postgres, after schema.sql
-- or the documented migrations. All fixtures and injected failures roll back.
begin;

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.folders (id, user_id, name, parent_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Parent', null),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Target', '20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Child', '20000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Grandchild', '20000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Other owner', null);

insert into public.documents (title, storage_path, created_by, folder_id)
select 'Needle ' || n, n || case when n % 2 = 0 then '.txt' else '.pdf' end,
  '10000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid
from generate_series(1, 45) n;
insert into public.documents (title, storage_path, created_by, folder_id) values
  ('Needle elsewhere', 'elsewhere.txt', '10000000-0000-0000-0000-000000000001', null),
  ('Needle private', 'private.txt', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005');

do $$
declare n integer; total bigint;
begin
  select count(*), max(total_count) into n, total from public.search_documents(
    'Needle', auth.uid(), 'date_desc', 'all', 20, 40, '20000000-0000-0000-0000-000000000002');
  assert n = 5 and total = 45, 'folder search must count before pagination';
  select count(*), max(total_count) into n, total from public.search_documents(
    'Needle', auth.uid(), 'name_asc', 'txt', 20, 20, '20000000-0000-0000-0000-000000000002');
  assert n = 2 and total = 22, 'folder and file-type filters must combine before pagination';
  select max(total_count) into total from public.search_documents('Needle', auth.uid());
  assert total = 46, 'all-documents search must include other folders but exclude other owners';
  begin
    perform public.search_documents('Needle', '10000000-0000-0000-0000-000000000002');
    raise exception 'expected ownership rejection';
  exception when insufficient_privilege then null;
  end;
  assert not has_function_privilege('anon', 'public.delete_folder(uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.search_documents(text,uuid,text,text,integer,integer,uuid)', 'execute');
  assert has_function_privilege('authenticated', 'public.delete_folder(uuid)', 'execute');
end;
$$;

-- Inject a failure AFTER document moves and child reparenting have happened.
create function public.docforge_test_delete_failure() returns trigger language plpgsql as $$
begin raise exception 'injected_delete_failure'; end;
$$;
create trigger docforge_test_delete_failure before delete on public.folders
for each row execute function public.docforge_test_delete_failure();
do $$
begin
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected injected failure';
  exception when raise_exception then
    if sqlerrm <> 'injected_delete_failure' then raise; end if;
  end;
  assert (select count(*) = 45 from public.documents where folder_id = '20000000-0000-0000-0000-000000000002'), 'document moves must roll back';
  assert (select parent_id = '20000000-0000-0000-0000-000000000002' from public.folders where id = '20000000-0000-0000-0000-000000000003'), 'reparenting must roll back';
  assert exists (select 1 from public.folders where id = '20000000-0000-0000-0000-000000000002'), 'target must survive a failure';
end;
$$;
drop trigger docforge_test_delete_failure on public.folders;
drop function public.docforge_test_delete_failure();

do $$
begin
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000005');
    raise exception 'expected other-owner rejection';
  exception when no_data_found then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected unauthenticated rejection';
  exception when invalid_authorization_specification then null;
  end;
  perform set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
end;
$$;

-- Legacy foreign-owner references must never be followed by CASCADE.
insert into public.folders (id, user_id, name, parent_id) values
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Foreign child', '20000000-0000-0000-0000-000000000002');
do $$
begin
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected foreign-child rejection';
  exception when insufficient_privilege then null;
  end;
  assert exists (select 1 from public.folders where id = '20000000-0000-0000-0000-000000000006');
  assert (select count(*) = 45 from public.documents where folder_id = '20000000-0000-0000-0000-000000000002');
end;
$$;
delete from public.folders where id = '20000000-0000-0000-0000-000000000006';

insert into public.documents (title, storage_path, created_by, folder_id) values
  ('Foreign reference', 'foreign.txt', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');
do $$
begin
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected foreign-document rejection';
  exception when insufficient_privilege then null;
  end;
  assert (select folder_id = '20000000-0000-0000-0000-000000000002' from public.documents where title = 'Foreign reference');
end;
$$;
delete from public.documents where title = 'Foreign reference';

update public.folders set parent_id = '20000000-0000-0000-0000-000000000005'
where id = '20000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected foreign-parent rejection';
  exception when insufficient_privilege then null;
  end;
end;
$$;
update public.folders set parent_id = '20000000-0000-0000-0000-000000000001'
where id = '20000000-0000-0000-0000-000000000002';

set local role authenticated;
select public.delete_folder('20000000-0000-0000-0000-000000000002');
reset role;
do $$
begin
  assert not exists (select 1 from public.folders where id = '20000000-0000-0000-0000-000000000002');
  assert (select count(*) = 46 from public.documents where created_by = auth.uid() and folder_id is null);
  assert (select parent_id = '20000000-0000-0000-0000-000000000001' from public.folders where id = '20000000-0000-0000-0000-000000000003');
  assert (select parent_id = '20000000-0000-0000-0000-000000000003' from public.folders where id = '20000000-0000-0000-0000-000000000004'), 'grandchildren must survive';
  begin
    perform public.delete_folder('20000000-0000-0000-0000-000000000002');
    raise exception 'expected missing-folder rejection';
  exception when no_data_found then null;
  end;
end;
$$;
-- Deleting a root folder reparents its children to root, preserving descendants.
select public.delete_folder('20000000-0000-0000-0000-000000000001');
do $$
begin
  assert (select parent_id is null from public.folders where id = '20000000-0000-0000-0000-000000000003');
  assert exists (select 1 from public.documents where title = 'Needle private');
end;
$$;

rollback;
