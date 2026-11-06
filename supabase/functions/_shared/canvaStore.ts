// The Canva client for Edge Functions. Canva is wired in a later step: until then, none.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function buildCanva(_db: SupabaseClient): Promise<null> {
  return null;
}
