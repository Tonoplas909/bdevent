// POST { event_id, step } → { state, error? }
// Runs one creation step of an event. The step is first claimed atomically (claim_event_step), so
// two runs never work on it at once; a step already done or running elsewhere is not run again
// (the answer is then its current state, 'done' or 'running'). The result is written by
// finish_event_step, which touches only this step.
import { json, preflight, readJson } from '../_shared/http.ts';
import { HttpError, requireCaller, serviceClient } from '../_shared/auth.ts';
import { getGoogleToken } from '../_shared/googleAuth.ts';
import { createGoogle } from '../_shared/google.js';
import { buildCanva } from '../_shared/canvaStore.ts';
import { STEPS } from '../_shared/domain/steps.js';
import { ERR_UNKNOWN, translateError } from '../_shared/errors.js';
import { runStep } from './core.js';

const must = <T>({ data, error }: { data: T; error: unknown }): T => {
  if (error) throw error;
  return data;
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  let claimed: { db: ReturnType<typeof serviceClient>; eventId: string; step: string } | null = null;
  try {
    await requireCaller(req);
    const { event_id, step } = await readJson(req);
    if (typeof event_id !== 'string' || typeof step !== 'string' || !STEPS.includes(step)) {
      return json({ error: 'Requête invalide.' }, 400);
    }

    const db = serviceClient();
    const event = must(await db.from('events').select('*').eq('id', event_id).maybeSingle());
    if (!event) return json({ error: 'Événement introuvable.' }, 404);

    const [claim] = must(await db.rpc('claim_event_step', { p_event: event_id, p_step: step })) as { claimed: boolean; state: string }[];
    if (!claim?.claimed) return json({ state: claim?.state ?? 'running' });
    claimed = { db, eventId: event_id, step };

    // Read again after the claim: another run may have stored ids (folder, copies) meanwhile.
    const fresh = must(await db.from('events').select('*').eq('id', event_id).single());
    const settings = must(await db.from('settings').select('*').single());
    const owner = fresh.owner_id ? must(await db.from('members').select('name, email').eq('id', fresh.owner_id).maybeSingle()) : null;
    const templates = must(await db.from('admin_task_templates').select('label, position, days_before').order('position'));

    const google = createGoogle({ fetch, getToken: () => getGoogleToken(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) });
    const canva = step === 'canva' ? await buildCanva(db) : null;

    const result = await runStep(step, { event: fresh, settings, owner, templates, google, canva, now: new Date() });
    const stored = result.error ? { state: result.state, error: result.error } : { state: result.state };
    must(await db.rpc('finish_event_step', {
      p_event: event_id, p_step: step, p_result: stored, p_patch: result.eventPatch ?? {},
      p_admin_rows: result.state === 'done' ? (result.adminTaskRows ?? []) : [],
    }));
    claimed = null;
    return json(stored);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('event-step', err);
    const message = translateError(err);
    // Release the claim so the step can be retried at once rather than after five minutes.
    if (claimed) {
      await claimed.db.rpc('finish_event_step', {
        p_event: claimed.eventId, p_step: claimed.step, p_result: { state: 'failed', error: message }, p_patch: {}, p_admin_rows: [],
      }).then(() => {}, (e: unknown) => console.error('event-step release', e));
    }
    return json({ state: 'failed', error: message === ERR_UNKNOWN ? ERR_UNKNOWN : message });
  }
});
