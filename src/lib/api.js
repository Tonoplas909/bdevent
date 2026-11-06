import { supabase } from './supabase.js';

export const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// — session —
export async function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  check(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
}

export async function signOut() {
  check(await supabase.auth.signOut());
}

export async function getMyMember() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return check(await supabase.from('members').select('*').eq('id', user.id).maybeSingle());
}

export async function requestAccess() {
  check(await supabase.rpc('request_access'));
}
