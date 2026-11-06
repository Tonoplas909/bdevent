// Connects the BDE's Canva account (admins only).
//   POST ?action=start       → { url } to open; remembers the PKCE verifier under a random state
//   GET  /callback?code&state ← Canva's redirect; stores the tokens, back to the app's Admin page
//   POST ?action=disconnect  → forgets the tokens
// Deployed with verify_jwt = false (Canva's redirect carries no Supabase token): start and
// disconnect check the caller themselves.
import { json, preflight } from '../_shared/http.ts';
import { HttpError, requireCaller, serviceClient } from '../_shared/auth.ts';
import { canvaStore } from '../_shared/canvaStore.ts';
import { authorizeUrl, exchangeCode, pkcePair } from '../_shared/canva.js';

const STATE_TTL_MS = 10 * 60 * 1000;

const env = (k: string) => Deno.env.get(k) ?? '';
// Must match the redirect URL registered in the Canva integration. CANVA_REDIRECT_URI overrides it
// (local runs, where SUPABASE_URL is the internal http://kong:8000).
const redirectUri = () => env('CANVA_REDIRECT_URI') || `${env('SUPABASE_URL')}/functions/v1/canva-oauth/callback`;
const backToAdmin = (result: 'ok' | 'error') =>
  new Response(null, { status: 302, headers: { Location: `${env('APP_URL')}#/admin?canva=${result}` } });

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const url = new URL(req.url);
  const db = serviceClient();

  if (req.method === 'GET' && url.pathname.endsWith('/callback')) {
    try {
      const state = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      if (!state || !code || url.searchParams.get('error')) return backToAdmin('error');
      const { data: saved } = await db.from('canva_oauth_states').delete().eq('state', state).select('verifier, created_at').maybeSingle();
      if (!saved || Date.now() - new Date(saved.created_at).getTime() > STATE_TTL_MS) return backToAdmin('error');
      const tokens = await exchangeCode({
        fetch, clientId: env('CANVA_CLIENT_ID'), clientSecret: env('CANVA_CLIENT_SECRET'),
        code, verifier: saved.verifier, redirectUri: redirectUri(),
      });
      await canvaStore(db).save(tokens);
      await db.from('settings').update({ canva_connected: true }).eq('id', true);
      return backToAdmin('ok');
    } catch (err) {
      console.error('canva-oauth callback', err);
      return backToAdmin('error');
    }
  }

  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    await requireCaller(req, { admin: true });
    const action = url.searchParams.get('action');
    if (action === 'start') {
      if (!env('CANVA_CLIENT_ID') || !env('CANVA_CLIENT_SECRET')) {
        return json({ error: "L'intégration Canva n'est pas configurée (secrets CANVA_CLIENT_ID et CANVA_CLIENT_SECRET)." }, 400);
      }
      const { verifier, challenge } = await pkcePair();
      const state = crypto.randomUUID();
      await db.from('canva_oauth_states').delete().lt('created_at', new Date(Date.now() - STATE_TTL_MS).toISOString());
      const { error } = await db.from('canva_oauth_states').insert({ state, verifier });
      if (error) throw error;
      return json({ url: authorizeUrl({ clientId: env('CANVA_CLIENT_ID'), challenge, state, redirectUri: redirectUri() }) });
    }
    if (action === 'disconnect') {
      await canvaStore(db).clear();
      await db.from('settings').update({ canva_connected: false }).eq('id', true);
      return json({ ok: true });
    }
    return json({ error: 'Action inconnue.' }, 400);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('canva-oauth', err);
    return json({ error: 'Une erreur inattendue est survenue.' }, 500);
  }
});
