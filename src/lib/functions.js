import { supabase } from './supabase.js';

const GENERIC = 'Le serveur ne répond pas. Vérifie ta connexion et réessaie.';

// Calls an Edge Function; a refusal comes back as an Error carrying the server's French message.
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = GENERIC;
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch { /* not JSON */ }
    throw new Error(message);
  }
  return data;
}

export const runEventStep = (eventId, step) => callFunction('event-step', { event_id: eventId, step });
export const checkSetup = async () => (await callFunction('check-setup', {})).items;
