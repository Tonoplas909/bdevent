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
