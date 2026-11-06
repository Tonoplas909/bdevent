// Writes the event to-do into the "To-do event" tab of the event's organisation Sheet.
// Each export replaces the tab's content: earlier fills are cleared, then rewritten.
import { EXPORT_TAB, exportValues, exportFormatRequests } from '../_shared/domain/exportSheet.js';
import { StepError } from '../_shared/errors.js';

const quoted = `'${EXPORT_TAB}'`;

export async function exportTasks({ google, event, tasks, membersById, exportedByName, now }) {
  if (!event.sheet_id) throw new StepError("Le Sheet d'organisation n'existe pas encore.");
  const tabs = await google.getSheetTabs(event.sheet_id);
  let sheetId = tabs.find((t) => t.title === EXPORT_TAB)?.sheetId;
  if (sheetId === undefined) {
    sheetId = await google.addSheetTab(event.sheet_id, EXPORT_TAB);
  } else {
    await google.clearRange(event.sheet_id, quoted);
    // Old row colours would outlive the cleared values: reset the fills before formatting again.
    await google.batchUpdateSheet(event.sheet_id, [{ repeatCell: {
      range: { sheetId }, cell: { userEnteredFormat: {} }, fields: 'userEnteredFormat.backgroundColor',
    } }]);
  }
  await google.writeValues(event.sheet_id, `${quoted}!A1`, exportValues(tasks, membersById, exportedByName, now));
  await google.batchUpdateSheet(event.sheet_id, exportFormatRequests(sheetId, tasks));
  return { url: `https://docs.google.com/spreadsheets/d/${event.sheet_id}/edit#gid=${sheetId}` };
}
