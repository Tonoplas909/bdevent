import { useState } from 'react';
import Michel from '../components/Michel.jsx';
import { requestAccess, signOut } from '../lib/api.js';

const TEXT = {
  'no-member': "Ton compte n'est pas un compte @bdemiagenice.com. Demande l'accès à un admin.",
  pending: "Demande envoyée. Un admin doit l'accepter.",
  refused: "Ta demande d'accès a été refusée.",
};

// The screen for anyone signed in who is not (yet) an active member.
export default function AccessRequest({ gate, email, onRequested }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ask = async () => {
    setBusy(true);
    setError('');
    try {
      await requestAccess();
      onRequested();
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessaie.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="center-page">
      <div className="card card-lg elev-md center-card">
        <Michel pose={gate === 'pending' ? 'chill' : 'megaphone'} className="michel-state" />
        <h2>Accès à BD'event</h2>
        <p>{TEXT[gate]}</p>
        {email && <p className="card-meta">Connecté en tant que {email}</p>}
        {gate === 'no-member' && (
          <button type="button" className="btn btn-primary" onClick={ask} disabled={busy}>Demander l'accès</button>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="button" className="btn btn-ghost" onClick={signOut}>Se déconnecter</button>
      </div>
    </main>
  );
}
