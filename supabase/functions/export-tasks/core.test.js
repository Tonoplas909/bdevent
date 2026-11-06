import { exportTasks } from './core.js';
import { exportFormatRequests } from '../_shared/domain/exportSheet.js';

function fakeGoogle(tabs, newId = 9) {
  const g = {
    calls: { addSheetTab: [], clearRange: [], writeValues: [], batchUpdateSheet: [] },
    async getSheetTabs() { return tabs; },
    async addSheetTab(s, title) { g.calls.addSheetTab.push([s, title]); return newId; },
    async clearRange(s, r) { g.calls.clearRange.push([s, r]); },
    async writeValues(s, r, v) { g.calls.writeValues.push([s, r, v]); },
    async batchUpdateSheet(s, req) { g.calls.batchUpdateSheet.push([s, req]); },
  };
  return g;
}

const tasks = [{ position: 1, title: 'A', assignee_id: null, priority: 3, due_date: null, status: 'todo', comment: null }];
const base = { event: { id: 'E', sheet_id: 'SHEET' }, tasks, membersById: {}, exportedByName: 'Matis', now: new Date('2027-03-12T10:00:00Z') };

test('existing tab: cleared then rewritten', async () => {
  const google = fakeGoogle([{ sheetId: 0, title: 'Organisation' }, { sheetId: 7, title: 'To-do event' }]);
  const { url } = await exportTasks({ ...base, google });
  expect(google.calls.addSheetTab).toEqual([]);
  expect(google.calls.clearRange).toEqual([['SHEET', "'To-do event'"]]);
  expect(google.calls.writeValues[0][1]).toBe("'To-do event'!A1");
  expect(google.calls.writeValues[0][2][1]).toEqual(['A', '', 'Moyenne', '', 'À faire', '']);
  // old row colours are wiped first, then the new format is applied
  expect(google.calls.batchUpdateSheet[0][1]).toEqual([{ repeatCell: {
    range: { sheetId: 7 }, cell: { userEnteredFormat: {} }, fields: 'userEnteredFormat.backgroundColor' } }]);
  expect(google.calls.batchUpdateSheet[1][1]).toEqual(exportFormatRequests(7, tasks));
  expect(url).toBe('https://docs.google.com/spreadsheets/d/SHEET/edit#gid=7');
});

test('missing tab: created', async () => {
  const google = fakeGoogle([{ sheetId: 0, title: 'Organisation' }]);
  const { url } = await exportTasks({ ...base, google });
  expect(google.calls.addSheetTab).toEqual([['SHEET', 'To-do event']]);
  expect(google.calls.clearRange).toEqual([]);
  expect(url).toBe('https://docs.google.com/spreadsheets/d/SHEET/edit#gid=9');
});

test('no Sheet yet → StepError', async () => {
  await expect(exportTasks({ ...base, google: fakeGoogle([]), event: { id: 'E', sheet_id: null } }))
    .rejects.toThrow("Le Sheet d'organisation n'existe pas encore.");
});
