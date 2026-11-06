import { createClient } from '@supabase/supabase-js';

// PKCE: the OAuth return carries ?code= in the query, leaving the #hash to the router.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce' } },
);
