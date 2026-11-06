export const PRIORITIES = [
  { value: 1, label: 'Très basse' },
  { value: 2, label: 'Basse' },
  { value: 3, label: 'Moyenne' },
  { value: 4, label: 'Haute' },
  { value: 5, label: 'Très haute' },
];

export const STATUSES = [
  { value: 'todo', label: 'À faire' },
  { value: 'doing', label: 'En cours' },
  { value: 'done', label: 'Fini' },
];

export const priorityLabel = (n) => PRIORITIES.find((p) => p.value === Number(n))?.label ?? '';
export const statusLabel = (s) => STATUSES.find((x) => x.value === s)?.label ?? '';
