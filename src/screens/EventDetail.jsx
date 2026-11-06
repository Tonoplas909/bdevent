import { useCallback, useEffect, useState } from 'react';
import { formatDateFr, formatTimeFr } from '@domain/dates.js';
import { driveFolderUrl, sheetUrl, docUrl, canvaFolderUrl } from '@domain/links.js';
import Icon from '../components/Icon.jsx';
import { getEvent } from '../lib/api.js';
import { href } from '../lib/route.js';

function FileLink({ id, url, icon, label }) {
  if (!id) return null;
  return (
    <a className="btn btn-secondary" href={url(id)} target="_blank" rel="noopener noreferrer">
      <Icon name={icon} size={18} />{label}
    </a>
  );
}

export default function EventDetail({ id, me }) {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('admin');

  const load = useCallback(async () => {
    try {
      setEvent(await getEvent(id));
    } catch {
      setError("Impossible de charger l'événement.");
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="notice notice-danger" role="alert">{error}</p>;
  if (!event) return <p className="text-muted">Chargement…</p>;

  const when = `${formatDateFr(event.starts_at)} à ${formatTimeFr(event.starts_at)}${event.ends_at ? ` → ${formatDateFr(event.ends_at)} à ${formatTimeFr(event.ends_at)}` : ''}`;

  return (
    <div className="stack">
      <a className="btn btn-ghost" href={href('events')} style={{ alignSelf: 'flex-start' }}><Icon name="back" size={18} />Événements</a>
      <header className="card card-lg elev-sm">
        <p className="eyebrow">{when}</p>
        <h1 className="page-title">{event.name}</h1>
        <p className="card-meta">
          {event.location}
          {event.owner?.name ? ` · Responsable : ${event.owner.name}` : ''}
          {event.expected_attendees !== null ? ` · ${event.expected_attendees} participants estimés` : ''}
        </p>
        {event.description && <p>{event.description}</p>}
        <div className="card-actions">
          <FileLink id={event.drive_folder_id} url={driveFolderUrl} icon="folder" label="Dossier Drive" />
          <FileLink id={event.sheet_id} url={sheetUrl} icon="sheet" label="Sheet" />
          <FileLink id={event.declaration_id} url={docUrl} icon="doc" label="Déclaration" />
          <FileLink id={event.canva_folder_id} url={canvaFolderUrl} icon="palette" label="Canva" />
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="To-do">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'admin'} onClick={() => setTab('admin')}>Administratif</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'tasks'} onClick={() => setTab('tasks')}>To-do de l'event</button>
      </div>
      <section className="card elev-sm" role="tabpanel">
        {tab === 'admin' ? <p className="card-meta">Bientôt.</p> : <p className="card-meta">Bientôt.</p>}
      </section>
    </div>
  );
}
