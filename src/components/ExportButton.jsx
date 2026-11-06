import { useState } from 'react';
import Icon from './Icon.jsx';
import { exportTasks } from '../lib/functions.js';

export default function ExportButton({ eventId, sheetId }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setUrl((await exportTasks(eventId)).url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-1)', alignItems: 'flex-end' }}>
      <button type="button" className="btn btn-secondary" onClick={run} disabled={busy || !sheetId}
        title={sheetId ? undefined : "Le Sheet n'est pas encore créé."}>
        <Icon name="sheet" size={18} />{busy ? 'Export…' : 'Exporter vers Google Sheet'}
      </button>
      {url && (
        <span className="card-meta" role="status">
          <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir l'onglet</a> · Chaque export remplace l'onglet.
        </span>
      )}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}
