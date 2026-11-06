// Who is calling? Checked against the database with the caller's own token, so the
// same rules as the app apply (is_active / is_admin), then work is done with the service role.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireCaller(req: Request, { admin = false } = {}): Promise<{ userId: string; isAdmin: boolean }> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Connecte-toi pour continuer.');
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) throw new HttpError(401, 'Connecte-toi pour continuer.');
  const { data: active } = await caller.rpc('is_active');
  if (active !== true) throw new HttpError(403, 'Accès réservé aux membres.');
  const { data: isAdmin } = await caller.rpc('is_admin');
  if (admin && isAdmin !== true) throw new HttpError(403, 'Accès réservé aux admins.');
  return { userId: user.id, isAdmin: isAdmin === true };
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
