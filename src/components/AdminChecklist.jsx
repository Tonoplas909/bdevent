import { useCallback, useEffect, useState } from 'react';
import { formatDateFr, todayKey } from '@domain/dates.js';
import { isOverdue } from '@domain/tasks.js';
import { listAdminTasks, setAdminTaskDone } from '../lib/api.js';

export default function AdminChecklist({ eventId, me, generated }) {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await listAdminTasks(eventId));
    } catch {
      setError('Impossible de charger la to-do administrative.');
    }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (task) => {
    const done = !task.done_at;
    const before = tasks;
    setError('');
    setTasks((ts) => ts.map((t) => (t.id === task.id
      ? { ...t, done_at: done ? new Date().toISOString() : null, done_by: done ? me.id : null, done_by_member: done ? { name: me.name } : null }
      : t)));
    try {
      await setAdminTaskDone(task.id, done, me.id);
    } catch {
      setTasks(before);
      setError("Impossible d'enregistrer, réessaie.");
    }
  };

  if (tasks === null) return <p className="card-meta">{error || 'Chargement…'}</p>;
  const today = todayKey();

  return (
    <>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      {tasks.length === 0 && (
        <p className="card-meta">{generated ? 'La to-do administrative est vide : un admin peut la remplir dans Admin.' : 'La to-do administrative sera générée à la création.'}</p>
      )}
      <ul className="checklist">
        {tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" className="checkbox" checked={Boolean(t.done_at)} onChange={() => toggle(t)} />
              <span>
                <span style={t.done_at ? { textDecoration: 'line-through' } : undefined}>{t.label}</span>
                <span className="row checklist-meta">
                  {t.due_date && <span>avant le {formatDateFr(t.due_date)}</span>}
                  {isOverdue(t.due_date, Boolean(t.done_at), today) && <span className="tag tag-warn">En retard</span>}
                  {t.done_at && <span>Fait par {t.done_by_member?.name ?? 'un membre'} le {formatDateFr(t.done_at).slice(0, 5)}</span>}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
