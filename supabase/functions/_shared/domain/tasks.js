import { parisDateKey, todayKey } from './dates.js';

// An event is past once the Paris day of its end (or start) is before today.
export function splitEvents(events, now = new Date()) {
  const today = todayKey(now);
  const upcoming = [];
  const past = [];
  for (const e of events) (parisDateKey(e.ends_at ?? e.starts_at) < today ? past : upcoming).push(e);
  const byStart = (a, b) => new Date(a.starts_at) - new Date(b.starts_at);
  upcoming.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  return { upcoming, past };
}

export function isOverdue(dueDate, done, today) {
  return Boolean(dueDate) && !done && dueDate < today;
}

export function filterTasks(tasks, filter, meId, today) {
  switch (filter) {
    case 'mine': return tasks.filter((t) => t.assignee_id === meId);
    case 'overdue': return tasks.filter((t) => isOverdue(t.due_date, t.status === 'done', today));
    case 'todo': case 'doing': case 'done': return tasks.filter((t) => t.status === filter);
    default: return tasks;
  }
}

const STATUS_ORDER = { todo: 0, doing: 1, done: 2 };

// Sorts a copy. Tasks without a value (no due date, nobody assigned) always go last.
export function sortTasks(tasks, { key = 'position', dir = 'asc' } = {}, assigneeName = (id) => id ?? '') {
  const valueOf = {
    position: (t) => t.position,
    priority: (t) => t.priority,
    due_date: (t) => t.due_date || null,
    status: (t) => STATUS_ORDER[t.status],
    assignee: (t) => (t.assignee_id ? assigneeName(t.assignee_id).toLocaleLowerCase('fr') : null),
  }[key] ?? ((t) => t.position);
  const sign = dir === 'desc' ? -1 : 1;
  return [...tasks].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (va === null && vb === null) return a.position - b.position;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return a.position - b.position;
  });
}

export function moveItem(list, from, to) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function progress(items, isDone) {
  return { done: items.filter(isDone).length, total: items.length };
}
