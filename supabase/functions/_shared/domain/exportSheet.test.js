import { exportValues, exportFormatRequests, EXPORT_TAB, hexToRgb } from './exportSheet.js';

const tasks = [
  { position: 2, title: '=SUM(A1)', assignee_id: null, priority: 1, due_date: null, status: 'todo', comment: null },
  { position: 1, title: 'Réserver la salle', assignee_id: 'u1', priority: 5, due_date: '2027-03-01', status: 'done', comment: 'OK' },
  { position: 3, title: 'Affiche', assignee_id: 'gone', priority: 3, due_date: null, status: 'doing', comment: '' },
];

test('values: header, rows by position, labels, footer with Paris time', () => {
  expect(EXPORT_TAB).toBe('To-do event');
  expect(exportValues(tasks, { u1: { name: 'Léa' } }, 'Matis Demore', new Date('2027-03-12T10:00:00Z'))).toEqual([
    ['Tâche', 'Qui', 'Importance', 'Date limite', 'Statut', 'Commentaire'],
    ['Réserver la salle', 'Léa', 'Très haute', '01/03/2027', 'Fini', 'OK'],
    ['=SUM(A1)', '', 'Très basse', '', 'À faire', ''],
    ['Affiche', '', 'Moyenne', '', 'En cours', ''],
    [],
    ['Exporté le 12/03/2027 à 11:00 par Matis Demore'],
  ]);
});

test('format: frozen bold header, background by status', () => {
  const req = exportFormatRequests(42, tasks);
  expect(req).toContainEqual({ updateSheetProperties: { properties: { sheetId: 42, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } });
  expect(req).toContainEqual({ repeatCell: { range: { sheetId: 42, startRowIndex: 0, endRowIndex: 1 },
    cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } });
  const bg = (row) => req.find((r) => r.repeatCell?.range.startRowIndex === row)?.repeatCell.cell.userEnteredFormat.backgroundColor;
  expect(bg(1)).toEqual(hexToRgb('#ebf8fa')); // « Fini » (sorted first)
  expect(bg(2)).toBeUndefined(); // « À faire »: no fill
  expect(bg(3)).toEqual(hexToRgb('#fdedd5')); // « En cours »
  expect(req.find((r) => r.repeatCell?.range.startRowIndex === 1).repeatCell.range).toEqual({ sheetId: 42, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 });
  expect(req.some((r) => r.autoResizeDimensions)).toBe(true);
});

test('hexToRgb', () => {
  expect(hexToRgb('#ff8000')).toEqual({ red: 1, green: 128 / 255, blue: 0 });
});
