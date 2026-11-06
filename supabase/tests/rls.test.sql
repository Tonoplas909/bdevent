-- Access rules: domain accounts get in, others ask; members share events and tasks;
-- only admins touch settings, roles and the admin checklist template; nobody reads Canva secrets.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- three people sign in with Google
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'Alice@BDEmiageNice.com', '{"full_name":"Alice Martin"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@gmail.com', '{"full_name":"Bob Durand"}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@bdemiagenice.com', '{"full_name":"Ada Admin"}');
update public.members set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

select is((select status::text from public.members where id = '11111111-1111-1111-1111-111111111111'), 'active',
  'a domain account is active at once (case-insensitive)');
select is((select name from public.members where id = '11111111-1111-1111-1111-111111111111'), 'Alice Martin',
  'the member name comes from Google');
select ok(not exists (select 1 from public.members where id = '22222222-2222-2222-2222-222222222222'),
  'another domain gets no member row');

-- Bob asks for access
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok($$ select public.request_access() $$, 'bob can ask for access');
select is((select status::text from public.members where id = '22222222-2222-2222-2222-222222222222'), 'pending',
  'bob sees his own pending row');
select is((select count(*) from public.members), 1::bigint, 'a pending member sees only his own row');
select lives_ok($$ select public.request_access() $$, 'asking twice is harmless');

-- Alice works on an event
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ insert into public.events (id, name, starts_at, location, owner_id, steps)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Soirée', now(), 'Campus', '11111111-1111-1111-1111-111111111111', '{}') $$,
  'an active member creates an event');
select is((select created_by from public.events where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'created_by defaults to the caller');
select lives_ok($$ insert into public.event_tasks (event_id, title, position)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Réserver la salle', 1) $$, 'an active member adds a task');
select lives_ok($$ insert into public.event_admin_tasks (event_id, label, position)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Déclarer', 1) $$, 'an active member gets admin tasks');
select results_eq($q$ with u as (update public.event_admin_tasks set done_by = '11111111-1111-1111-1111-111111111111', done_at = now() returning 1) select count(*) from u $q$, $q$ values (1::bigint) $q$,
  'an active member ticks an admin task');
select is((select count(*) from public.members), 3::bigint, 'an active member sees every member');
select results_eq($q$ with u as (update public.settings set shared_drive_id = 'X' returning 1) select count(*) from u $q$, $q$ values (0::bigint) $q$,
  'a member cannot change settings');
select results_eq($q$ with u as (update public.members set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' returning 1) select count(*) from u $q$, $q$ values (0::bigint) $q$,
  'a member cannot promote herself');
select lives_ok($$ select * from public.admin_task_templates $$, 'a member reads the admin checklist template');
select throws_ok($$ insert into public.admin_task_templates (label, position) values ('X', 1) $$, '42501', null,
  'a member cannot write the template');
select is((select count(*) from public.secrets_canva), 0::bigint, 'Canva secrets are invisible');
select throws_ok($$ insert into public.canva_oauth_states (state, verifier) values ('s', 'v') $$, '42501', null,
  'OAuth states are server-only');

-- Pending Bob still sees no event
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'a pending member reads no event');

-- The admin
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select results_eq($q$ with u as (update public.settings set shared_drive_id = 'DRIVE' returning 1) select count(*) from u $q$, $q$ values (1::bigint) $q$,
  'an admin changes settings');
select results_eq($q$ with u as (update public.members set status = 'active' where id = '22222222-2222-2222-2222-222222222222' returning 1) select count(*) from u $q$, $q$ values (1::bigint) $q$,
  'an admin accepts bob');
select lives_ok($$ insert into public.admin_task_templates (label, position, days_before) values ('Déclarer', 1, 21) $$,
  'an admin writes the template');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.events), 1::bigint, 'once accepted, bob reads events');

select * from finish();
rollback;
