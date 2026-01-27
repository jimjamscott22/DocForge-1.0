-- DocForge Supabase schema and policies
-- Run inside your Supabase project (SQL editor or migration).
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz not null default now()
);
create or replace function public.is_admin(uid uuid) returns boolean language sql stable as $$
select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.categories (id) on delete
  set null,
    created_at timestamptz not null default now()
);
create unique index if not exists categories_name_parent_idx on public.categories (lower(name), parent_id);
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now()
);
create unique index if not exists tags_name_ci_idx on public.tags ((lower(name)));
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  language text,
  framework text,
  version integer not null default 1,
  storage_path text not null,
  file_size_bytes bigint not null default 0,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_title_idx on public.documents using gin (to_tsvector('simple', coalesce(title, '')));
create index if not exists documents_language_idx on public.documents (language);
create index if not exists documents_created_at_idx on public.documents (created_at);
create index if not exists documents_created_by_idx on public.documents (created_by);
create or replace function public.handle_documents_updated_at() returns trigger as $$ begin new.updated_at = now();
return new;
end;
$$ language plpgsql;
do $$ begin if not exists (
  select 1
  from pg_trigger
  where tgname = 'documents_updated_at'
) then create trigger documents_updated_at before
update on public.documents for each row execute function public.handle_documents_updated_at();
end if;
end $$;
create table if not exists public.document_tags (
  document_id uuid not null references public.documents (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (document_id, tag_id)
);
-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.documents enable row level security;
alter table public.document_tags enable row level security;
-- profiles policies
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'profiles_select_self'
) then create policy "profiles_select_self" on public.profiles for
select using (auth.uid() = id);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'profiles_insert_self'
) then create policy "profiles_insert_self" on public.profiles for
insert with check (auth.uid() = id);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'profiles_update_self'
) then create policy "profiles_update_self" on public.profiles for
update using (auth.uid() = id) with check (auth.uid() = id);
end if;
end $$;
-- categories policies
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'categories_select_authenticated'
) then create policy "categories_select_authenticated" on public.categories for
select using (auth.uid() is not null);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'categories_admin_all'
) then create policy "categories_admin_all" on public.categories for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
end if;
end $$;
-- tags policies
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'tags_select_authenticated'
) then create policy "tags_select_authenticated" on public.tags for
select using (auth.uid() is not null);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'tags_admin_all'
) then create policy "tags_admin_all" on public.tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
end if;
end $$;
-- documents policies (restrict to owner, allow admin on write)
do $$ begin if exists (
  select 1
  from pg_policies
  where policyname = 'documents_select_authenticated'
) then drop policy "documents_select_authenticated" on public.documents;
end if;
end $$;
do $$ begin if exists (
  select 1
  from pg_policies
  where policyname = 'documents_insert_creator'
) then drop policy "documents_insert_creator" on public.documents;
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'documents_select_owner'
) then create policy "documents_select_owner" on public.documents for
select using (auth.uid() = created_by);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'documents_insert_owner'
) then create policy "documents_insert_owner" on public.documents for
insert with check (auth.uid() = created_by);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'documents_update_owner_or_admin'
) then create policy "documents_update_owner_or_admin" on public.documents for
update using (
    auth.uid() = created_by
    or public.is_admin(auth.uid())
  ) with check (
    auth.uid() = created_by
    or public.is_admin(auth.uid())
  );
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'documents_delete_owner_or_admin'
) then create policy "documents_delete_owner_or_admin" on public.documents for delete using (
  auth.uid() = created_by
  or public.is_admin(auth.uid())
);
end if;
end $$;
-- document_tags policies
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'document_tags_select_authenticated'
) then create policy "document_tags_select_authenticated" on public.document_tags for
select using (auth.uid() is not null);
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'document_tags_insert_owner_or_admin'
) then create policy "document_tags_insert_owner_or_admin" on public.document_tags for
insert with check (
    exists (
      select 1
      from public.documents d
      where d.id = document_id
        and (
          d.created_by = auth.uid()
          or public.is_admin(auth.uid())
        )
    )
  );
end if;
end $$;
do $$ begin if not exists (
  select 1
  from pg_policies
  where policyname = 'document_tags_delete_owner_or_admin'
) then create policy "document_tags_delete_owner_or_admin" on public.document_tags for delete using (
  exists (
    select 1
    from public.documents d
    where d.id = document_id
      and (
        d.created_by = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);
end if;
end $$;