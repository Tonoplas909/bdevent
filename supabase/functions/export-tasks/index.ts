// POST { event_id } → { url } of the "To-do event" tab, or { error } (400) in French.
import { json, preflight, readJson } from '../_shared/http.ts';
import { HttpError, requireCaller, serviceClient } from '../_shared/auth.ts';
import { getGoogleToken } from '../_shared/googleAuth.ts';
import { createGoogle } from '../_shared/google.js';
import { translateError } from '../_shared/errors.js';
import { exportTasks } from './core.js';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    const { userId } = await requireCaller(req);
    const { event_id } = await readJson(req);
    if (typeof event_id !== 'string') return json({ error: 'Requête invalide.' }, 400);
    const db = serviceClient();
    const [{ data: event }, { data: tasks }, { data: members }] = await Promise.all([
      db.from('events').select('id, sheet_id').eq('id', event_id).maybeSingle(),
      db.from('event_tasks').select('*').eq('event_id', event_id),
      db.from('members').select('id, name, email'),
    ]);
    if (!event) return json({ error: 'Événement introuvable.' }, 404);
    const membersById = Object.fromEntries((members ?? []).map((m) => [m.id, { name: m.name || m.email }]));
    const google = createGoogle({ fetch, getToken: () => getGoogleToken(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) });
    const result = await exportTasks({
      google, event, tasks: tasks ?? [], membersById, exportedByName: membersById[userId]?.name ?? 'un membre', now: new Date(),
    });
    return json(result);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('export-tasks', err);
    return json({ error: translateError(err, { what: 'drive' }) }, 400);
  }
});
