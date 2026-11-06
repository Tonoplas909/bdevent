// The event to-do as a sheet tab: a snapshot kept for the record; the app stays the reference.
import { formatDateFr, formatTimeFr } from './dates.js';
import { priorityLabel, statusLabel } from './labels.js';

export const EXPORT_TAB = 'To-do event';
const HEADER = ['Tâche', 'Qui', 'Importance', 'Date limite', 'Statut', 'Commentaire'];

// Light values of MIAGE Étendu: color-tint-accent-2 (= color-accent-2-100) and color-warn-100.
const STATUS_FILL = { done: '#ebf8fa', doing: '#fdedd5' };

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { red: (n >> 16) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

const byPosition = (tasks) => [...tasks].sort((a, b) => a.position - b.position);

export function exportValues(tasks, membersById, exportedByName, now) {
  const rows = byPosition(tasks).map((t) => [
    t.title ?? '',
    membersById[t.assignee_id]?.name ?? '',
    priorityLabel(t.priority),
    t.due_date ? formatDateFr(t.due_date) : '',
    statusLabel(t.status),
    t.comment ?? '',
  ]);
  const at = now.toISOString();
  return [HEADER, ...rows, [], [`Exporté le ${formatDateFr(at)} à ${formatTimeFr(at)} par ${exportedByName}`]];
}

export function exportFormatRequests(sheetId, tasks) {
  const requests = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
  ];
  byPosition(tasks).forEach((t, i) => {
    const fill = STATUS_FILL[t.status];
    if (!fill) return;
    requests.push({ repeatCell: {
      range: { sheetId, startRowIndex: i + 1, endRowIndex: i + 2, startColumnIndex: 0, endColumnIndex: HEADER.length },
      cell: { userEnteredFormat: { backgroundColor: hexToRgb(fill) } }, fields: 'userEnteredFormat.backgroundColor',
    } });
  });
  requests.push({ autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: HEADER.length } } });
  return requests;
}
