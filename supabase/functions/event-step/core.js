// One automated step of an event's creation. Never throws: the result says done, skipped or failed,
// with a French message, and the ids to store on the event (eventPatch) even when it failed half-way.
import { academicYear, dueDateFrom } from '../_shared/domain/dates.js';
import { eventFolderName, sheetFileName, declarationFileName } from '../_shared/domain/naming.js';
import { buildPlaceholders } from '../_shared/domain/declaration.js';
import { ApiError, StepError, translateError, ERR_NOT_CONFIGURED } from '../_shared/errors.js';

const ERR_NO_FOLDER = "Le dossier Drive de l'événement n'existe pas encore : relance l'étape « Dossier Drive ».";
const ERR_CANVA_OFF = "Canva n'est pas connecté : un admin peut le connecter dans Admin.";
const EVENTS_FOLDER = 'Event';

const fail = (err, what, eventPatch) => ({
  state: 'failed', error: translateError(err, { what }), ...(eventPatch ? { eventPatch } : {}),
});

// A 404 on a copy means the template is gone; anything else on the copy is a drive problem.
const copyWhat = (err, template) => (err instanceof ApiError && err.status === 404 ? template : 'drive');

async function driveFolder({ event, settings, google }) {
  if (!settings?.shared_drive_id) throw new StepError(ERR_NOT_CONFIGURED);
  const driveId = settings.shared_drive_id;
  const year = await google.findOrCreateFolder(driveId, academicYear(event.starts_at), driveId);
  const events = await google.findOrCreateFolder(year, EVENTS_FOLDER, driveId);
  const folder = await google.findOrCreateFolder(events, eventFolderName(event), driveId);
  return { state: 'done', eventPatch: { drive_folder_id: folder } };
}

async function sheet({ event, settings, google }) {
  if (!settings?.sheet_template_id) throw new StepError(ERR_NOT_CONFIGURED);
  if (!event.drive_folder_id) throw new StepError(ERR_NO_FOLDER);
  try {
    const id = await google.copyFile(settings.sheet_template_id, event.drive_folder_id, sheetFileName(event));
    return { state: 'done', eventPatch: { sheet_id: id } };
  } catch (err) {
    return fail(err, copyWhat(err, 'sheet_template'));
  }
}

async function declaration({ event, settings, google, owner, now }) {
  if (!settings?.declaration_template_id) throw new StepError(ERR_NOT_CONFIGURED);
  if (!event.drive_folder_id) throw new StepError(ERR_NO_FOLDER);
  let id = event.declaration_id;
  if (!id) {
    try {
      id = await google.copyFile(settings.declaration_template_id, event.drive_folder_id, declarationFileName(event));
    } catch (err) {
      return fail(err, copyWhat(err, 'declaration_template'));
    }
  }
  try {
    await google.replaceAllText(id, buildPlaceholders(event, owner, now));
  } catch (err) {
    return fail(err, 'drive', { declaration_id: id });
  }
  return { state: 'done', eventPatch: { declaration_id: id } };
}

async function canvaFolder({ event, canva }) {
  if (!canva) return { state: 'skipped', error: ERR_CANVA_OFF };
  try {
    const id = await canva.createFolder(eventFolderName(event));
    return { state: 'done', eventPatch: { canva_folder_id: id } };
  } catch (err) {
    return { state: 'skipped', error: translateError(err) };
  }
}

function adminTasks({ event, templates }) {
  const adminTaskRows = [...(templates ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ event_id: event.id, label: t.label, position: t.position, due_date: dueDateFrom(event.starts_at, t.days_before) }));
  return { state: 'done', adminTaskRows };
}

const RUNNERS = { drive_folder: driveFolder, sheet, declaration, canva: canvaFolder, admin_tasks: adminTasks };

export async function runStep(step, ctx) {
  const run = RUNNERS[step];
  if (!run) return { state: 'failed', error: 'Étape inconnue.' };
  try {
    return await run(ctx);
  } catch (err) {
    if (!(err instanceof StepError) && !(err instanceof ApiError)) console.error(`event-step ${step}`, err);
    return fail(err, 'drive');
  }
}
