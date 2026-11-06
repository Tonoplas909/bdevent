import { useCallback, useEffect, useState } from 'react';
import { listMembers, setMemberRole, setMemberStatus } from '../../lib/api.js';

export default function AdminMembers({ me }) {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [showRefused, setShowRefused] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers());
    } catch {
      setError('Impossible de charger les membres.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch {
      setError("La modification n'a pas pu être enregistrée. Réessaie.");
    }
  };

  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');
  const refused = members.filter((m) => m.status === 'refused');

  return (
    <section className="card elev-sm">
      <h2 className="card-title">Membres</h2>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}

      <h3 className="card-title">Demandes en attente</h3>
      {pending.length === 0 && <p className="card-meta">Aucune demande.</p>}
      <ul className="checklist">
        {pending.map((m) => (
          <li key={m.id} className="row-between">
            <span><strong>{m.name || m.email}</strong><br /><span className="card-meta">{m.email}</span></span>
            <span className="row">
              <button type="button" className="btn btn-primary" onClick={() => act(() => setMemberStatus(m.id, 'active'))}>Accepter</button>
              <button type="button" className="btn btn-secondary" onClick={() => act(() => setMemberStatus(m.id, 'refused'))}>Refuser</button>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="card-title">Membres actifs</h3>
      <ul className="checklist">
        {active.map((m) => (
          <li key={m.id} className="row-between">
            <span><strong>{m.name || m.email}</strong><br /><span className="card-meta">{m.email}</span></span>
            <span className="row">
              <span className={`tag ${m.role === 'admin' ? 'tag-accent' : 'tag-neutral'}`}>{m.role === 'admin' ? 'Admin' : 'Membre'}</span>
              <label className="sr-only" htmlFor={`role-${m.id}`}>Rôle de {m.name || m.email}</label>
              <select id={`role-${m.id}`} className="select" value={m.role} disabled={m.id === me.id}
                title={m.id === me.id ? 'Tu ne peux pas changer ton propre rôle.' : undefined}
                onChange={(e) => act(() => setMemberRole(m.id, e.target.value))}>
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
              </select>
            </span>
          </li>
        ))}
      </ul>

      {refused.length > 0 && (
        <>
          <button type="button" className="btn btn-ghost" aria-expanded={showRefused} onClick={() => setShowRefused((v) => !v)}>
            Refusés ({refused.length})
          </button>
          {showRefused && (
            <ul className="checklist">
              {refused.map((m) => (
                <li key={m.id} className="row-between">
                  <span>{m.email}</span>
                  <button type="button" className="btn btn-secondary" onClick={() => act(() => setMemberStatus(m.id, 'active'))}>Accepter</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
