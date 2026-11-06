import { createCanva, pkcePair, authorizeUrl, exchangeCode } from './canva.js';

const NOW = 1_800_000_000_000;

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { body: {} };
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  };
  return { fetch, calls };
}

function setup(tokens, responses) {
  const f = fakeFetch(responses);
  const saved = [];
  const canva = createCanva({
    fetch: f.fetch, clientId: 'cid', clientSecret: 'secret', now: () => NOW,
    store: { load: async () => tokens, save: async (t) => { saved.push(t); } },
  });
  return { canva, calls: f.calls, saved };
}

test('createFolder with a valid token', async () => {
  const { canva, calls } = setup({ access_token: 'A', refresh_token: 'R', expires_at: NOW + 3_600_000 }, [{ body: { folder: { id: 'CF' } } }]);
  expect(await canva.createFolder('2027-03-12 – Soirée')).toBe('CF');
  expect(calls[0].url).toBe('https://api.canva.com/rest/v1/folders');
  expect(calls[0].init.method).toBe('POST');
  expect(calls[0].init.headers.Authorization).toBe('Bearer A');
  expect(JSON.parse(calls[0].init.body)).toEqual({ name: '2027-03-12 – Soirée', parent_folder_id: 'root' });
});

test('expired token: refresh, save the rotated refresh token, then call', async () => {
  const { canva, calls, saved } = setup({ access_token: 'OLD', refresh_token: 'R1', expires_at: NOW - 1 }, [
    { body: { access_token: 'NEW', refresh_token: 'R2', expires_in: 14400 } },
    { body: { folder: { id: 'CF' } } },
  ]);
  await canva.createFolder('X');
  expect(calls[0].url).toBe('https://api.canva.com/rest/v1/oauth/token');
  expect(calls[0].init.headers.Authorization).toBe(`Basic ${btoa('cid:secret')}`);
  expect(calls[0].init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(Object.fromEntries(new URLSearchParams(calls[0].init.body))).toEqual({ grant_type: 'refresh_token', refresh_token: 'R1' });
  expect(saved).toEqual([{ access_token: 'NEW', refresh_token: 'R2', expires_at: NOW + 14_400_000 }]);
  expect(calls[1].init.headers.Authorization).toBe('Bearer NEW');
});

test('a token expiring within a minute is refreshed too', async () => {
  const { canva, calls } = setup({ access_token: 'A', refresh_token: 'R', expires_at: NOW + 30_000 }, [
    { body: { access_token: 'B', refresh_token: 'R2', expires_in: 100 } }, { body: {} },
  ]);
  await canva.ping();
  expect(calls[0].url).toBe('https://api.canva.com/rest/v1/oauth/token');
  expect(calls[1].url).toBe('https://api.canva.com/rest/v1/users/me');
});

test('not connected → ApiError canva 401', async () => {
  const { canva } = setup(null, []);
  await expect(canva.createFolder('X')).rejects.toMatchObject({ service: 'canva', status: 401 });
});

test('refresh refused → ApiError canva 401', async () => {
  const { canva } = setup({ access_token: 'A', refresh_token: 'R', expires_at: NOW - 1 }, [{ status: 400, body: { error: 'invalid_grant' } }]);
  await expect(canva.createFolder('X')).rejects.toMatchObject({ service: 'canva', status: 401 });
});

test('Canva refuses the folder → ApiError canva 403', async () => {
  const { canva } = setup({ access_token: 'A', refresh_token: 'R', expires_at: NOW + 3_600_000 }, [{ status: 403, body: {} }]);
  await expect(canva.createFolder('X')).rejects.toMatchObject({ service: 'canva', status: 403 });
});

test('PKCE pair and authorize URL', async () => {
  const { verifier, challenge } = await pkcePair();
  expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  expect(challenge).toBe(btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  const u = new URL(authorizeUrl({ clientId: 'cid', challenge, state: 'S', redirectUri: 'https://x/cb' }));
  expect(u.origin + u.pathname).toBe('https://www.canva.com/api/oauth/authorize');
  expect(Object.fromEntries(u.searchParams)).toEqual({ code_challenge: challenge, code_challenge_method: 's256',
    scope: 'folder:read folder:write', response_type: 'code', client_id: 'cid', state: 'S', redirect_uri: 'https://x/cb' });
});

test('exchangeCode', async () => {
  const f = fakeFetch([{ body: { access_token: 'A', refresh_token: 'R', expires_in: 14400 } }]);
  const t = await exchangeCode({ fetch: f.fetch, clientId: 'cid', clientSecret: 'secret', code: 'C', verifier: 'V', redirectUri: 'https://x/cb', now: () => NOW });
  expect(t).toEqual({ access_token: 'A', refresh_token: 'R', expires_at: NOW + 14_400_000 });
  expect(Object.fromEntries(new URLSearchParams(f.calls[0].init.body))).toEqual({
    grant_type: 'authorization_code', code: 'C', code_verifier: 'V', redirect_uri: 'https://x/cb' });
});
