// POST → { items: [{ item, ok, message }] } — admins only.
import { json, preflight } from '../_shared/http.ts';
import { HttpError, requireCaller, serviceClient } from '../_shared/auth.ts';
import { getGoogleToken } from '../_shared/googleAuth.ts';
import { createGoogle } from '../_shared/google.js';
import { buildCanva } from '../_shared/canvaStore.ts';
import { translateError } from '../_shared/errors.js';
import { checkSetup } from './core.js';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    await requireCaller(req, { admin: true });
    const db = serviceClient();
    const { data: settings, error } = await db.from('settings').select('*').single();
    if (error) throw error;
    const google = createGoogle({ fetch, getToken: () => getGoogleToken(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) });
    const canva = await buildCanva(db);
    return json({ items: await checkSetup({ google, canva, settings }) });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('check-setup', err);
    return json({ error: translateError(err) }, 500);
  }
});
