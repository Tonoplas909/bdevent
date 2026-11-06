import { useEffect, useState } from 'react';
import { moveItem } from '@domain/tasks.js';
import { listTaskTemplates, saveTaskTemplates } from '../../lib/api.js';
import Icon from '../../components/Icon.jsx';

let tempId = 0;

export default function AdminTaskTemplate() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    listTaskTemplates()
      .then((r) => setRows(r.map((x) => ({ ...x, key: x.id, days: x.days_before ?? '' }))))
      .catch(() => setStatus('Impossible de charger la to-do administrative.'));
  }, []);

  const update = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, { key: `new-${++tempId}`, label: '', days: '' }]);

  const save = async () => {
    const clean = rows.filter((r) => r.label.trim());
    const bad = clean.find((r) => r.days !== '' && !(Number.isInteger(Number(r.days)) && Number(r.days) >= 0));
    if (bad) { setStatus('Les échéances sont un nombre de jours positif (ou vide).'); return; }
    try {
      await saveTaskTemplates(clean.map((r, i) => ({ id: r.id, label: r.label, position: i + 1, days_before: r.days === '' ? null : Number(r.days) })));
      const fresh = await listTaskTemplates();
      setRows(fresh.map((x) => ({ ...x, key: x.id, days: x.days_before ?? '' })));
      setStatus('Enregistré. Les événements déjà créés gardent leur liste.');
    } catch {
      setStatus("L'enregistrement a échoué. Réessaie.");
    }
  };

  return (
    <section className="card elev-sm">
      <h2 className="card-title">To-do administrative</h2>
      <p className="card-meta">Copiée dans chaque nouvel événement. L'échéance se compte en jours avant l'événement.</p>
      {rows === null ? <p className="card-meta">{status || 'Chargement…'}</p> : (
        <>
          <ul className="checklist">
            {rows.map((r, i) => (
              <li key={r.key} className="row">
                <div className="field" style={{ flex: '1 1 260px' }}>
                  <label className="field-label" htmlFor={`tpl-${r.key}`}>Tâche {i + 1}</label>
                  <input id={`tpl-${r.key}`} className="input" value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
                </div>
                <div className="field" style={{ width: 120 }}>
                  <label className="field-label" htmlFor={`days-${r.key}`}>Échéance : J-</label>
                  <input id={`days-${r.key}`} className="input" inputMode="numeric" value={r.days} onChange={(e) => update(i, { days: e.target.value.trim() })} />
                </div>
                <span className="row">
                  <button type="button" className="btn btn-icon btn-secondary" aria-label="Monter" disabled={i === 0} onClick={() => setRows((rs) => moveItem(rs, i, i - 1))}><Icon name="up" size={18} /></button>
                  <button type="button" className="btn btn-icon btn-secondary" aria-label="Descendre" disabled={i === rows.length - 1} onClick={() => setRows((rs) => moveItem(rs, i, i + 1))}><Icon name="down" size={18} /></button>
                  <button type="button" className="btn btn-icon btn-secondary" aria-label="Supprimer" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button>
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={add}><Icon name="plus" size={18} />Ajouter une tâche</button>
            <button type="button" className="btn btn-primary" onClick={save}>Enregistrer</button>
          </div>
          {status && <p className="card-meta" role="status">{status}</p>}
        </>
      )}
    </section>
  );
}
