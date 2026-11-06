// The Canva client for Edge Functions: tokens live in secrets_canva (service role only).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { createCanva } from './canva.js';

type Tokens = { access_token: string; refresh_token: string; expires_at: number };

export function canvaStore(db: SupabaseClient) {
  return {
    async load(): Promise<Tokens | null> {
      const { data, error } = await db.from('secrets_canva').select('access_token, refresh_token, expires_at').eq('id', true).maybeSingle();
      if (error) throw error;
      return data?.refresh_token ? { ...data, expires_at: Number(data.expires_at) } as Tokens : null;
    },
    async save(t: Tokens, connectedBy?: string) {
      const row: Record<string, unknown> = { id: true, ...t };
      if (connectedBy) row.connected_by = connectedBy;
      const { error } = await db.from('secrets_canva').upsert(row);
      if (error) throw error;
    },
    async clear() {
      const { error } = await db.from('secrets_canva').delete().eq('id', true);
      if (error) throw error;
    },
  };
}

// null when Canva is not configured (no client id) or not connected (no refresh token).
export async function buildCanva(db: SupabaseClient) {
  const clientId = Deno.env.get('CANVA_CLIENT_ID');
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;
  const store = canvaStore(db);
  if (!(await store.load())) return null;
  return createCanva({ fetch, clientId, clientSecret, store });
}
