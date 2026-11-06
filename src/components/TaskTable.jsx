import { useCallback, useEffect, useRef, useState } from 'react';
import { PRIORITIES, STATUSES } from '@domain/labels.js';
import { filterTasks, sortTasks, moveItem, isOverdue } from '@domain/tasks.js';
import { todayKey } from '@domain/dates.js';
import MemberPicker from './MemberPicker.jsx';
import Icon from './Icon.jsx';
import { addEventTask, deleteEventTask, listEventTasks, reorderEventTasks, updateEventTask } from '../lib/api.js';

const FILTERS = [
  ['all', 'Toutes'], ['mine', 'Mes tâches'], ['overdue', 'En retard'], ['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Finies'],
];
const COLUMNS = [
  ['title', 'Tâche'], ['assignee', 'Qui'], ['priority', 'Importance'], ['due_date', 'Date limite'], ['status', 'Statut'], ['comment', 'Commentaire'],
];
const STATUS_TAG = { done: 'tag-accent-2', doing: 'tag-warn', todo: 'tag-neutral' };

// A text cell saved on blur or Enter, so typing does not send one request per key.
function TextCell({ id, value, onSave, inputRef, label }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const commit = () => { if (draft !== (value ?? '')) onSave(draft); };
  return (
    <input id={id} ref={inputRef} className="input" aria-label={label} value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
  );
}

export default function TaskTable({ eventId, me, members, children }) {
  const [tasks, setTasks] = useState(null);
  const [sort, setSort] = useState({ key: 'position', dir: 'asc' });
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const focusId = useRef(null);
  const refs = useRef({});

  const load = useCallback(async () => {
    try {
      setTasks(await listEventTasks(eventId));
    } catch {
      setError('Impossible de charger la to-do.');
    }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (focusId.current && refs.current[focusId.current]) {
      refs.current[focusId.current].focus();
      focusId.current = null;
    }
  });

  const fail = (before) => { setTasks(before); setError("Impossible d'enregistrer, réessaie."); };

  const patch = async (task, change) => {
    const before = tasks;
    setError('');
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...change } : t)));
    try { await updateEventTask(task.id, change); } catch { fail(before); }
  };

  const add = async () => {
    setError('');
    try {
      const pos = Math.max(0, ...tasks.map((t) => t.position)) + 1;
      const task = await addEventTask(eventId, pos);
      focusId.current = task.id;
      setTasks((ts) => [...ts, task]);
    } catch {
      setError("La tâche n'a pas pu être ajoutée. Réessaie.");
    }
  };

  const remove = async (task) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    const before = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try { await deleteEventTask(task.id); } catch { fail(before); }
  };

  const move = async (index, to) => {
    const before = tasks;
    const ordered = moveItem(sortTasks(tasks, { key: 'position' }), index, to).map((t, i) => ({ ...t, position: i + 1 }));
    setTasks(ordered);
    try { await reorderEventTasks(ordered.map((t) => t.id)); } catch { fail(before); }
  };

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  if (tasks === null) return <p className="card-meta">{error || 'Chargement…'}</p>;

  const today = todayKey();
  const nameOf = (id) => members.find((m) => m.id === id)?.name ?? '';
  const shown = sortTasks(filterTasks(tasks, filter, me.id, today), sort, nameOf);
  const canMove = sort.key === 'position' && filter === 'all';
  const sortMark = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined);

  return (
    <div className="stack">
      <div className="row-between">
        <div className="row" role="group" aria-label="Filtrer">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" className="pill" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        {children}
      </div>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      <div className="table-wrap">
        <table className="table table-cards">
          <thead>
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th key={key} aria-sort={ariaSort(key === 'title' ? 'position' : key)}>
                  {key === 'title' || key === 'comment'
                    ? (key === 'title' ? <button type="button" onClick={() => setSort({ key: 'position', dir: 'asc' })}>{label}</button> : label)
                    : <button type="button" onClick={() => toggleSort(key)}>{label}{sortMark(key)}</button>}
                </th>
              ))}
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const late = isOverdue(t.due_date, t.status === 'done', today);
              const index = sortTasks(tasks, { key: 'position' }).findIndex((x) => x.id === t.id);
              return (
                <tr key={t.id}>
                  <td style={{ minWidth: 220 }}>
                    <span className="cell-label">Tâche</span>
                    <TextCell id={`title-${t.id}`} label="Tâche" value={t.title} inputRef={(el) => { refs.current[t.id] = el; }}
                      onSave={(v) => patch(t, { title: v })} />
                  </td>
                  <td>
                    <span className="cell-label">Qui</span>
                    <MemberPicker value={t.assignee_id} members={members} allowEmpty emptyLabel="Personne" aria-label="Qui"
                      onChange={(v) => patch(t, { assignee_id: v })} />
                  </td>
                  <td>
                    <span className="cell-label">Importance</span>
                    <select className="select" aria-label="Importance" value={t.priority} onChange={(e) => patch(t, { priority: Number(e.target.value) })}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className="cell-label">Date limite</span>
                    <input type="date" className={`input${late ? ' text-late' : ''}`} aria-label="Date limite" value={t.due_date ?? ''}
                      onChange={(e) => patch(t, { due_date: e.target.value || null })} />
                  </td>
                  <td>
                    <span className="cell-label">Statut</span>
                    <span className="row" style={{ flexWrap: 'nowrap' }}>
                      <span className={`tag ${STATUS_TAG[t.status]}`} aria-hidden="true">●</span>
                      <select className="select" aria-label="Statut" value={t.status} onChange={(e) => patch(t, { status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </span>
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <span className="cell-label">Commentaire</span>
                    <TextCell id={`comment-${t.id}`} label="Commentaire" value={t.comment} onSave={(v) => patch(t, { comment: v || null })} />
                  </td>
                  <td className="cell-actions">
                    {canMove && (
                      <>
                        <button type="button" className="btn btn-icon btn-ghost" aria-label="Monter" disabled={index === 0} onClick={() => move(index, index - 1)}><Icon name="up" size={18} /></button>
                        <button type="button" className="btn btn-icon btn-ghost" aria-label="Descendre" disabled={index === tasks.length - 1} onClick={() => move(index, index + 1)}><Icon name="down" size={18} /></button>
                      </>
                    )}
                    <button type="button" className="btn btn-icon btn-ghost" aria-label="Supprimer" onClick={() => remove(t)}><Icon name="trash" size={18} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {tasks.length > 0 && shown.length === 0 && <p className="card-meta">Aucune tâche pour ce filtre.</p>}
      {tasks.length === 0 && <p className="card-meta">Aucune tâche pour l'instant.</p>}
      <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={add}><Icon name="plus" size={18} />Ajouter une tâche</button>
    </div>
  );
}
