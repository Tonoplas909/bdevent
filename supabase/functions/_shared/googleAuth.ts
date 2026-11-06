// Access token for the Google service account (a member of the BDE shared drive).
// The account's JSON key lives in the GOOGLE_SERVICE_ACCOUNT_JSON secret.
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';
import { StepError } from './errors.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
];

const ERR_KEY = 'La clé du compte de service Google est absente ou invalide : vérifie le secret GOOGLE_SERVICE_ACCOUNT_JSON.';
const cache = new Map<string, { token: string; expiresAt: number }>();

export async function getGoogleToken(serviceAccountJson: string | undefined, scopes: string[] = GOOGLE_SCOPES): Promise<string> {
  let sa: { client_email: string; private_key: string; private_key_id?: string };
  try {
    sa = JSON.parse(serviceAccountJson ?? '');
  } catch {
    throw new StepError(ERR_KEY);
  }
  if (!sa?.client_email || !sa?.private_key) throw new StepError(ERR_KEY);

  const scope = scopes.join(' ');
  const cacheKey = `${sa.client_email} ${scope}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt - 60_000 > Date.now()) return hit.token;

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(sa.private_key, 'RS256');
  const assertion = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('google token error', res.status, data);
    throw new StepError(ERR_KEY);
  }
  cache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}
