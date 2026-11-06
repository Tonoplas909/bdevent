import { useEffect, useState } from 'react';
import { splitEvents, progress } from '@domain/tasks.js';
import { formatDateFr, formatTimeFr } from '@domain/dates.js';
import { isComplete } from '@domain/steps.js';
import Michel from '../components/Michel.jsx';
import Icon from '../components/Icon.jsx';
import { listEvents } from '../lib/api.js';
import { href } from '../lib/route.js';

function Count({ label, done, total }) {
  const full = total > 0 && done === total;
  return <span className={`tag ${full ? 'tag-accent-2' : 'tag-neutral'}`}>{label} {done}/{total}</span>;
}

function EventCard({ ev }) {
  const admin = progress(ev.event_admin_tasks ?? [], (t) => Boolean(t.done_at));
  const todo = progress(ev.event_tasks ?? [], (t) => t.status === 'done');
  return (
    <a className="card elev-sm card-link" href={href('event', ev.id)}>
      <h2 className="card-title">{ev.name}</h2>
      <p className="card-meta">{formatDateFr(ev.starts_at)} à {formatTimeFr(ev.starts_at)} · {ev.location}</p>
      <div className="row">
        <Count label="Administratif" {...admin} />
        <Count label="To-do" {...todo} />
        {!isComplete(ev.steps) && <span className="tag tag-warn">Création à terminer</span>}
      </div>
    </a>
  );
}

export default function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    listEvents().then(setEvents).catch(() => setError('Impossible de charger les événements.'));
  }, []);

  const { upcoming, past } = splitEvents(events ?? [], new Date());
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="stack">
      <div className="row-between">
        <h1 className="page-title">Événements</h1>
        <a className="btn btn-primary" href={href('new')}><Icon name="plus" size={18} />Nouvel événement</a>
      </div>
      <div className="tabs" role="tablist" aria-label="Période">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>À venir</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>Passés</button>
      </div>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      {events === null && !error && <p className="text-muted">Chargement…</p>}
      {events !== null && shown.length === 0 && (
        <div className="empty">
          <Michel pose="chill" className="michel-state" />
          <p>{tab === 'upcoming' ? 'Aucun événement à venir.' : 'Aucun événement passé.'}</p>
        </div>
      )}
      <div className="grid-cards">
        {shown.map((ev) => <EventCard key={ev.id} ev={ev} />)}
      </div>
    </div>
  );
}
