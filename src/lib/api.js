import { initialSteps } from '@domain/steps.js';
import { supabase } from './supabase.js';

export const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// — session —
export async function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  check(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
}

export async function signOut() {
  check(await supabase.auth.signOut());
}

export async function getMyMember() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return check(await supabase.from('members').select('*').eq('id', user.id).maybeSingle());
}

export async function requestAccess() {
  check(await supabase.rpc('request_access'));
}

// — members —
export async function listMembers() {
  return check(await supabase.from('members').select('*').order('name', { nullsFirst: false }));
}

export async function setMemberStatus(id, status) {
  check(await supabase.from('members').update({ status }).eq('id', id));
}

export async function setMemberRole(id, role) {
  check(await supabase.from('members').update({ role }).eq('id', id));
}

// — events —
export async function listEvents() {
  return check(await supabase.from('events')
    .select('id, name, starts_at, ends_at, location, steps, event_admin_tasks(done_at), event_tasks(status)')
    .order('starts_at'));
}

export async function getEvent(id) {
  return check(await supabase.from('events').select('*, owner:members!events_owner_id_fkey(name, email)').eq('id', id).single());
}

export async function createEvent(row) {
  return check(await supabase.from('events').insert({ ...row, steps: initialSteps() }).select('id').single());
}

// — admin checklist of an event —
export async function listAdminTasks(eventId) {
  return check(await supabase.from('event_admin_tasks')
    .select('id, label, position, due_date, done_at, done_by, done_by_member:members!event_admin_tasks_done_by_fkey(name)')
    .eq('event_id', eventId).order('position'));
}

export async function setAdminTaskDone(id, done, meId) {
  const patch = done ? { done_by: meId, done_at: new Date().toISOString() } : { done_by: null, done_at: null };
  check(await supabase.from('event_admin_tasks').update(patch).eq('id', id));
}

// — event to-do —
export async function listEventTasks(eventId) {
  return check(await supabase.from('event_tasks').select('*').eq('event_id', eventId).order('position'));
}

export async function addEventTask(eventId, position) {
  return check(await supabase.from('event_tasks').insert({ event_id: eventId, position }).select('*').single());
}

export async function updateEventTask(id, patch) {
  check(await supabase.from('event_tasks').update(patch).eq('id', id));
}

export async function deleteEventTask(id) {
  check(await supabase.from('event_tasks').delete().eq('id', id));
}

export async function reorderEventTasks(orderedIds) {
  const results = await Promise.all(orderedIds.map((id, i) => supabase.from('event_tasks').update({ position: i + 1 }).eq('id', id)));
  results.forEach(check);
}

// — settings (admins only) —
export async function getSettings() {
  return check(await supabase.from('settings').select('shared_drive_id, sheet_template_id, declaration_template_id, canva_connected').single());
}

export async function saveSettings(patch) {
  check(await supabase.from('settings').update(patch).eq('id', true));
}

// — admin checklist template —
export async function listTaskTemplates() {
  return check(await supabase.from('admin_task_templates').select('id, label, position, days_before').order('position'));
}

// Replaces the template with `rows`: existing rows are updated, new ones inserted, missing ones deleted.
export async function saveTaskTemplates(rows) {
  const existing = check(await supabase.from('admin_task_templates').select('id'));
  const keep = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const removed = existing.map((r) => r.id).filter((id) => !keep.has(id));
  if (removed.length) check(await supabase.from('admin_task_templates').delete().in('id', removed));
  const clean = (r) => ({ label: r.label.trim(), position: r.position, days_before: r.days_before });
  const updates = rows.filter((r) => r.id).map((r) => ({ id: r.id, ...clean(r) }));
  const inserts = rows.filter((r) => !r.id).map(clean);
  if (updates.length) check(await supabase.from('admin_task_templates').upsert(updates));
  if (inserts.length) check(await supabase.from('admin_task_templates').insert(inserts));
}
