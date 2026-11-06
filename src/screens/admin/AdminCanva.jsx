import { useEffect, useState } from 'react';
import { getSettings } from '../../lib/api.js';
import { disconnectCanva, startCanvaConnect } from '../../lib/functions.js';

const RETURN = {
  ok: { cls: 'notice-ok', text: 'Canva est connecté.' },
  error: { cls: 'notice-danger', text: "La connexion à Canva n'a pas abouti. Réessaie." },
};

export default function AdminCanva({ query }) {
  const [connected, setConnected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((s) => setConnected(s.canva_connected)).catch(() => setError('Impossible de lire l\'état de Canva.'));
  }, []);

  const connect = async () => {
    setBusy(true);
    setError('');
    try {
      const { url } = await startCanvaConnect();
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Déconnecter Canva ? Les prochains événements devront créer leur dossier Canva à la main.')) return;
    setBusy(true);
    setError('');
    try {
      await disconnectCanva();
      setConnected(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const back = RETURN[query?.canva];

  return (
    <section className="card elev-sm">
      <div className="row-between">
        <h2 className="card-title">Canva</h2>
        {connected !== null && (
          <span className={`tag ${connected ? 'tag-accent-2' : 'tag-neutral'}`}>{connected ? 'Connecté' : 'Non connecté'}</span>
        )}
      </div>
      <p className="card-meta">Le compte Canva de l'équipe du BDE crée un dossier par événement. Sans connexion, l'app indique le nom du dossier à créer à la main.</p>
      {back && <p className={`notice ${back.cls}`} role="status">{back.text}</p>}
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      <div className="row">
        {connected
          ? <button type="button" className="btn btn-secondary" onClick={disconnect} disabled={busy}>Déconnecter</button>
          : <button type="button" className="btn btn-primary" onClick={connect} disabled={busy || connected === null}>Connecter Canva</button>}
      </div>
    </section>
  );
}
