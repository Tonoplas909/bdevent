import { useEffect, useState } from 'react';
import { extractDriveId, driveFolderUrl, sheetUrl, docUrl } from '@domain/links.js';
import { getSettings, saveSettings } from '../../lib/api.js';
import Icon from '../../components/Icon.jsx';

const FIELDS = [
  { key: 'shared_drive_id', label: 'Drive partagé BDE MIAGE NICE', hint: 'Lien du Drive partagé (ouvre-le dans Drive et copie l\'adresse).', url: driveFolderUrl },
  { key: 'sheet_template_id', label: "Modèle Sheet d'organisation", hint: 'Lien du Google Sheet vide à copier pour chaque événement.', url: sheetUrl },
  { key: 'declaration_template_id', label: 'Modèle de déclaration', hint: 'Lien du Google Doc avec les balises {{NOM_EVENT}}, {{DATE}}…', url: docUrl },
];

export default function AdminTemplates({ children }) {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    getSettings().then((s) => {
      setSaved(s);
      setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, s[f.key] ?? ''])));
    }).catch(() => setStatus('Impossible de charger les réglages.'));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const patch = {};
    const errs = {};
    for (const f of FIELDS) {
      const raw = (draft[f.key] ?? '').trim();
      if (!raw) { patch[f.key] = null; continue; }
      const id = extractDriveId(raw);
      if (id) patch[f.key] = id;
      else errs[f.key] = 'Lien ou ID non reconnu';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await saveSettings(patch);
      setSaved((s) => ({ ...s, ...patch }));
      setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, patch[f.key] ?? ''])));
      setStatus('Enregistré.');
    } catch {
      setStatus("L'enregistrement a échoué. Réessaie.");
    }
  };

  if (!saved) return <section className="card elev-sm"><h2 className="card-title">Modèles Google</h2><p className="card-meta">{status || 'Chargement…'}</p></section>;

  return (
    <section className="card elev-sm">
      <h2 className="card-title">Modèles Google</h2>
      <form className="stack" onSubmit={save} noValidate>
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label className="field-label" htmlFor={f.key}>{f.label}</label>
            <input id={f.key} className="input" value={draft[f.key] ?? ''} aria-invalid={errors[f.key] ? 'true' : undefined}
              aria-describedby={`${f.key}-hint`} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
            <span id={`${f.key}-hint`} className="field-hint">{f.hint}</span>
            {errors[f.key] && <span className="field-error">{errors[f.key]}</span>}
            {saved[f.key] && !errors[f.key] && (
              <a className="btn btn-ghost" href={f.url(saved[f.key])} target="_blank" rel="noopener noreferrer">
                Ouvrir <Icon name="external" size={16} />
              </a>
            )}
          </div>
        ))}
        <div className="row">
          <button type="submit" className="btn btn-primary">Enregistrer</button>
          {children}
        </div>
        {status && <p className="card-meta" role="status">{status}</p>}
      </form>
    </section>
  );
}
