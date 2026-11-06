// Canva Connect API: OAuth with PKCE, and folder creation with the BDE's connected account.
// Canva rotates the refresh token on every use, so each refresh saves the new pair.
import { ApiError } from './errors.js';

const AUTHORIZE = 'https://www.canva.com/api/oauth/authorize';
const API = 'https://api.canva.com/rest/v1';
export const CANVA_SCOPES = 'folder:read folder:write';
const REFRESH_MARGIN = 60_000;

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function pkcePair() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge: base64url(digest) };
}

export function authorizeUrl({ clientId, challenge, state, redirectUri }) {
  const q = new URLSearchParams({
    code_challenge: challenge, code_challenge_method: 's256', scope: CANVA_SCOPES,
    response_type: 'code', client_id: clientId, state, redirect_uri: redirectUri,
  });
  return `${AUTHORIZE}?${q}`;
}

async function tokenRequest({ fetch, clientId, clientSecret, params, now }) {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  // A refused token exchange means the connection is gone: the admin reconnects.
  if (!res.ok) throw new ApiError('canva', 401, data);
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: now() + data.expires_in * 1000 };
}

export function exchangeCode({ fetch, clientId, clientSecret, code, verifier, redirectUri, now = () => Date.now() }) {
  return tokenRequest({
    fetch, clientId, clientSecret, now,
    params: { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri },
  });
}

export function createCanva({ fetch, clientId, clientSecret, store, now = () => Date.now() }) {
  async function accessToken() {
    const tokens = await store.load();
    if (!tokens?.refresh_token) throw new ApiError('canva', 401);
    if (tokens.access_token && tokens.expires_at > now() + REFRESH_MARGIN) return tokens.access_token;
    const fresh = await tokenRequest({ fetch, clientId, clientSecret, now, params: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token } });
    await store.save(fresh);
    return fresh.access_token;
  }

  async function call(path, { method = 'GET', body } = {}) {
    const headers = { Authorization: `Bearer ${await accessToken()}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError('canva', res.status, data);
    return data;
  }

  return {
    async createFolder(name) {
      const r = await call('/folders', { method: 'POST', body: { name, parent_folder_id: 'root' } });
      return r.folder.id;
    },
    async ping() {
      await call('/users/me');
    },
  };
}
