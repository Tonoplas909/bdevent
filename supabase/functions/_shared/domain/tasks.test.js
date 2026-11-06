import { splitEvents, isOverdue, filterTasks, sortTasks, moveItem, progress } from './tasks.js';

test('splitEvents: today and running events are upcoming', () => {
  const now = new Date('2027-03-12T10:00:00Z');
  const a = { id: 'a', starts_at: '2027-03-12T20:00:00+01:00', ends_at: null };
  const b = { id: 'b', starts_at: '2027-03-11T20:00:00+01:00', ends_at: null };
  const c = { id: 'c', starts_at: '2027-03-10T09:00:00+01:00', ends_at: '2027-03-12T18:00:00+01:00' };
  const d = { id: 'd', starts_at: '2027-03-01T20:00:00+01:00', ends_at: null };
  const { upcoming, past } = splitEvents([a, b, c, d], now);
  expect(upcoming.map((e) => e.id)).toEqual(['c', 'a']);
  expect(past.map((e) => e.id)).toEqual(['b', 'd']);
});

test('isOverdue', () => {
  expect(isOverdue('2027-03-11', false, '2027-03-12')).toBe(true);
  expect(isOverdue('2027-03-12', false, '2027-03-12')).toBe(false);
  expect(isOverdue('2027-03-11', true, '2027-03-12')).toBe(false);
  expect(isOverdue(null, false, '2027-03-12')).toBe(false);
});

const t = [
  { id: 1, position: 2, priority: 3, due_date: null, status: 'todo', assignee_id: 'me' },
  { id: 2, position: 1, priority: 5, due_date: '2027-03-11', status: 'doing', assignee_id: 'x' },
  { id: 3, position: 3, priority: 1, due_date: '2027-03-01', status: 'done', assignee_id: 'me' },
];

test('filterTasks', () => {
  expect(filterTasks(t, 'all', 'me', '2027-03-12').map((x) => x.id)).toEqual([1, 2, 3]);
  expect(filterTasks(t, 'mine', 'me', '2027-03-12').map((x) => x.id)).toEqual([1, 3]);
  expect(filterTasks(t, 'overdue', 'me', '2027-03-12').map((x) => x.id)).toEqual([2]);
  expect(filterTasks(t, 'doing', 'me', '2027-03-12').map((x) => x.id)).toEqual([2]);
});

test('sortTasks', () => {
  expect(sortTasks(t, { key: 'position', dir: 'asc' }).map((x) => x.id)).toEqual([2, 1, 3]);
  expect(sortTasks(t, { key: 'priority', dir: 'desc' }).map((x) => x.id)).toEqual([2, 1, 3]);
  expect(sortTasks(t, { key: 'due_date', dir: 'asc' }).map((x) => x.id)).toEqual([3, 2, 1]);
  expect(sortTasks(t, { key: 'due_date', dir: 'desc' }).map((x) => x.id)).toEqual([2, 3, 1]);
  expect(t.map((x) => x.id)).toEqual([1, 2, 3]); // input untouched
});

test('moveItem and progress', () => {
  expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(progress(t, (x) => x.status === 'done')).toEqual({ done: 1, total: 3 });
});
