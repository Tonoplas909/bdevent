-- Creation steps run at most once at a time. event-step first claims the step (pending or failed
-- → running), does the work, then writes only that step's result, the ids it created and, for
-- the admin checklist, its rows, in one transaction. A claim left by a run that died is stale
-- after five minutes and can be taken over.

create function public.claim_event_step(p_event uuid, p_step text, p_stale interval default interval '5 minutes')
returns table (claimed boolean, state text)
language plpgsql security definer set search_path = '' as $$
declare
  current_state text;
begin
  update public.events e
     set steps = jsonb_set(e.steps, array[p_step], jsonb_build_object('state', 'running', 'at', now()))
   where e.id = p_event
     and (coalesce(e.steps -> p_step ->> 'state', 'pending') not in ('done', 'running')
          or (e.steps -> p_step ->> 'state' = 'running'
              and coalesce((e.steps -> p_step ->> 'at')::timestamptz, '-infinity') < now() - p_stale));
  if found then
    return query select true, 'running'::text;
    return;
  end if;
  select coalesce(e.steps -> p_step ->> 'state', 'pending') into current_state from public.events e where e.id = p_event;
  return query select false, current_state;
end;
$$;

create function public.finish_event_step(p_event uuid, p_step text, p_result jsonb, p_patch jsonb, p_admin_rows jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_array_length(coalesce(p_admin_rows, '[]')) > 0 then
    insert into public.event_admin_tasks (event_id, label, position, due_date)
    select p_event, r ->> 'label', (r ->> 'position')::int, (r ->> 'due_date')::date
      from jsonb_array_elements(p_admin_rows) r;
  end if;
  update public.events e set
    steps = jsonb_set(e.steps, array[p_step], p_result),
    drive_folder_id = coalesce(p_patch ->> 'drive_folder_id', e.drive_folder_id),
    sheet_id = coalesce(p_patch ->> 'sheet_id', e.sheet_id),
    declaration_id = coalesce(p_patch ->> 'declaration_id', e.declaration_id),
    canva_folder_id = coalesce(p_patch ->> 'canva_folder_id', e.canva_folder_id)
  where e.id = p_event;
end;
$$;

revoke execute on function public.claim_event_step(uuid, text, interval) from public, anon, authenticated;
revoke execute on function public.finish_event_step(uuid, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.claim_event_step(uuid, text, interval) to service_role;
grant execute on function public.finish_event_step(uuid, text, jsonb, jsonb, jsonb) to service_role;
