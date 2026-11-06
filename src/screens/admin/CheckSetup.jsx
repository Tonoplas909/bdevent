import { useState } from 'react';
import { checkSetup } from '../../lib/functions.js';

const LABELS = { drive: 'Drive partagé', sheet_template: 'Modèle Sheet', declaration_template: 'Modèle de déclaration', canva: 'Canva' };

// "Vérifier": asks the server whether the service account reaches the drive and both templates.
export default function CheckSetup() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setItems(await checkSetup());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={run} disabled={busy}>{busy ? 'Vérification…' : 'Vérifier'}</button>
      {(items || error) && (
        <div className="stack" role="status" style={{ flexBasis: '100%' }}>
          {error && <p className="notice notice-danger">{error}</p>}
          {items?.map((it) => (
            <p key={it.item} className="row" style={{ margin: 0 }}>
              <span className={`tag ${it.ok ? 'tag-accent-2' : 'tag-warn'}`}>{it.ok ? 'OK' : 'À corriger'}</span>
              <strong>{LABELS[it.item]}</strong> {it.message}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
