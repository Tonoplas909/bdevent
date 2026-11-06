import { useState } from 'react';
import { eventFolderName } from '@domain/naming.js';
import Icon from './Icon.jsx';
import { runEventStep } from '../lib/functions.js';

// Shown when the Canva step did not create the folder: the name to use, a link, and a retry.
export default function CanvaFallback({ event, onRetried }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const name = eventFolderName(event);
  const reason = event.steps?.canva?.error;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await runEventStep(event.id, 'canva');
      if (r.state !== 'done') setError(r.error ?? 'Le dossier Canva n\'a pas pu être créé.');
      await onRetried();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notice notice-warn">
      <p><strong>Créer le dossier Canva à la main</strong>{reason ? ` — ${reason}` : ''}</p>
      <p>Nom du dossier : <strong>{name}</strong></p>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={copy}><Icon name="copy" size={18} />{copied ? 'Copié' : 'Copier'}</button>
        <a className="btn btn-secondary" href="https://www.canva.com/" target="_blank" rel="noopener noreferrer"><Icon name="external" size={18} />Ouvrir Canva</a>
        <button type="button" className="btn btn-secondary" onClick={retry} disabled={busy}>{busy ? 'Essai…' : 'Réessayer'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
