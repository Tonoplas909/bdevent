-- BD'event: members, events, checklists and settings, with row-level security.
-- Anyone with an @bdemiagenice.com Google account is a member at once; others ask an admin.

create type public.member_role as enum ('member', 'admin');
create type public.member_status as enum ('active', 'pending', 'refused');
create type public.task_status as enum ('todo', 'doing', 'done');

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  role public.member_role not null default 'member',
  status public.member_status not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null,
  description text,
  owner_id uuid references public.members (id) on delete set null,
  expected_attendees integer check (expected_attendees >= 0),
  extra_fields jsonb not null default '{}',
  drive_folder_id text,
  sheet_id text,
  declaration_id text,
  canva_folder_id text,
  steps jsonb not null,
  created_by uuid default auth.uid() references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_starts_at_idx on public.events (starts_at);

create table public.admin_task_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  position integer not null,
  days_before integer check (days_before >= 0)
);

create table public.event_admin_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null,
  position integer not null,
  due_date date,
  done_by uuid references public.members (id) on delete set null,
  done_at timestamptz
);
create index event_admin_tasks_event_idx on public.event_admin_tasks (event_id);

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null default '',
  assignee_id uuid references public.members (id) on delete set null,
  priority smallint not null default 3 check (priority between 1 and 5),
  due_date date,
  status public.task_status not null default 'todo',
  comment text,
  position integer not null,
  updated_at timestamptz not null default now()
);
create index event_tasks_event_idx on public.event_tasks (event_id);

-- One row each.
create table public.settings (
  id boolean primary key default true check (id),
  shared_drive_id text,
  sheet_template_id text,
  declaration_template_id text,
  canva_connected boolean not null default false
);
insert into public.settings default values;

create table public.secrets_canva (
  id boolean primary key default true check (id),
  access_token text,
  refresh_token text,
  expires_at bigint,
  connected_by uuid references public.members (id) on delete set null
);

create table public.canva_oauth_states (
  state text primary key,
  verifier text not null,
  created_at timestamptz not null default now()
);

-- — helpers —
create function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where id = auth.uid() and status = 'active');
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where id = auth.uid() and status = 'active' and role = 'admin');
$$;

-- A domain account becomes an active member on its first sign-in.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) like '%@bdemiagenice.com' then
    insert into public.members (id, email, name, status)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 'active')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone else asks for access once; an admin then accepts or refuses.
create function public.request_access() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.members (id, email, name, status)
  select u.id, lower(u.email), coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), 'pending'
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;
revoke execute on function public.request_access() from public, anon;
grant execute on function public.request_access() to authenticated;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_tasks_touch before update on public.event_tasks
  for each row execute function public.touch_updated_at();

-- — row-level security —
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.admin_task_templates enable row level security;
alter table public.event_admin_tasks enable row level security;
alter table public.event_tasks enable row level security;
alter table public.settings enable row level security;
alter table public.secrets_canva enable row level security;
alter table public.canva_oauth_states enable row level security;

create policy members_read on public.members for select to authenticated
  using (public.is_active() or id = auth.uid());
create policy members_admin_update on public.members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy events_all on public.events for all to authenticated
  using (public.is_active()) with check (public.is_active());
create policy event_tasks_all on public.event_tasks for all to authenticated
  using (public.is_active()) with check (public.is_active());
create policy event_admin_tasks_all on public.event_admin_tasks for all to authenticated
  using (public.is_active()) with check (public.is_active());

create policy templates_read on public.admin_task_templates for select to authenticated
  using (public.is_active());
create policy templates_admin_write on public.admin_task_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_admin_read on public.settings for select to authenticated
  using (public.is_admin());
create policy settings_admin_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- secrets_canva and canva_oauth_states: no policy, so only the service role (Edge Functions) reads them.
