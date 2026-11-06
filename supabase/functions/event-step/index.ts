// POST { event_id, step } → { state, error? }
// Runs one creation step of an event and stores its result. A step already done is not run again.
import { json, preflight, readJson } from '../_shared/http.ts';
import { HttpError, requireCaller, serviceClient } from '../_shared/auth.ts';
import { getGoogleToken } from '../_shared/googleAuth.ts';
import { createGoogle } from '../_shared/google.js';
import { buildCanva } from '../_shared/canvaStore.ts';
import { STEPS } from '../_shared/domain/steps.js';
import { ERR_UNKNOWN, translateError } from '../_shared/errors.js';
import { runStep } from './core.js';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  try {
    await requireCaller(req);
    const { event_id, step } = await readJson(req);
    if (typeof event_id !== 'string' || !STEPS.includes(step as string)) return json({ error: 'Requête invalide.' }, 400);

    const db = serviceClient();
    const { data: event, error: evErr } = await db.from('events').select('*').eq('id', event_id).maybeSingle();
    if (evErr) throw evErr;
    if (!event) return json({ error: 'Événement introuvable.' }, 404);
    if (event.steps?.[step as string]?.state === 'done') return json({ state: 'done' });

    const [{ data: settings }, { data: owner }, { data: templates }] = await Promise.all([
      db.from('settings').select('*').single(),
      event.owner_id ? db.from('members').select('name, email').eq('id', event.owner_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from('admin_task_templates').select('label, position, days_before').order('position'),
    ]);

    const google = createGoogle({ fetch, getToken: () => getGoogleToken(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) });
    const canva = step === 'canva' ? await buildCanva(db) : null;

    const result = await runStep(step, { event, settings, owner, templates, google, canva, now: new Date() });

    if (result.state === 'done' && result.adminTaskRows?.length) {
      const { error } = await db.from('event_admin_tasks').insert(result.adminTaskRows);
      if (error) throw error;
    }
    const steps = { ...event.steps, [step as string]: result.error ? { state: result.state, error: result.error } : { state: result.state } };
    const { error: upErr } = await db.from('events').update({ ...(result.eventPatch ?? {}), steps }).eq('id', event_id);
    if (upErr) throw upErr;

    return json({ state: result.state, ...(result.error ? { error: result.error } : {}) });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('event-step', err);
    const message = translateError(err);
    return json({ state: 'failed', error: message === ERR_UNKNOWN ? ERR_UNKNOWN : message });
  }
});
