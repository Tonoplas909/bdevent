-- Creation steps are claimed atomically, so two runs of the same step never work at once,
-- and a result only touches its own step (no lost update of another step's state).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_app_meta_data, email_confirmed_at)
  values ('66666666-6666-6666-6666-666666666666', 'steps.test@bdemiagenice.com', '{"provider":"google"}', now());
insert into public.events (id, name, starts_at, location, owner_id, created_by, steps) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Steps', now(), 'L', '66666666-6666-6666-6666-666666666666',
   '66666666-6666-6666-6666-666666666666',
   '{"drive_folder":{"state":"pending"},"sheet":{"state":"failed","error":"x"},"declaration":{"state":"done"},"canva":{"state":"pending"},"admin_tasks":{"state":"pending"}}');

select is((select claimed from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'drive_folder')), true,
  'a pending step can be claimed');
select is((select steps->'drive_folder'->>'state' from public.events where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'running',
  'the claim marks it running');
select is((select claimed from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'drive_folder')), false,
  'a running step cannot be claimed twice');
select is((select state from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'drive_folder')), 'running',
  'the refused claim tells the current state');
select is((select claimed from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'declaration')), false,
  'a done step is never claimed');
select is((select claimed from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'sheet')), true,
  'a failed step can be claimed again');

-- a run that died long ago leaves a stale claim
update public.events set steps = jsonb_set(steps, '{canva}', jsonb_build_object('state', 'running', 'at', now() - interval '10 minutes'))
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is((select claimed from public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'canva')), true,
  'a claim older than five minutes is stale and can be taken over');

-- meanwhile another run finished the declaration differently: finishing drive_folder must not undo it
update public.events set steps = jsonb_set(steps, '{admin_tasks}', '{"state":"done"}') where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select lives_ok($$ select public.finish_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'drive_folder',
  '{"state":"done"}', '{"drive_folder_id":"F1"}', '[]') $$, 'finish a step');
select is((select steps->'drive_folder'->>'state' from public.events where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'done',
  'its state is written');
select is((select steps->'admin_tasks'->>'state' from public.events where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'done',
  'another step written meanwhile is kept');
select is((select drive_folder_id from public.events where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'F1',
  'the patch is applied');

select lives_ok($$ select public.finish_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'sheet',
  '{"state":"failed","error":"Modèle introuvable"}', '{}', '[{"label":"A","position":1,"due_date":"2027-01-01"},{"label":"B","position":2,"due_date":null}]') $$,
  'finish with checklist rows');
select is((select count(*) from public.event_admin_tasks where event_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 2::bigint,
  'checklist rows are inserted with the result');

set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
select throws_ok($$ select public.claim_event_step('bbbbbbbb-0000-0000-0000-000000000001', 'canva') $$, '42501', null,
  'only the server (service role) claims steps');

select * from finish();
rollback;
