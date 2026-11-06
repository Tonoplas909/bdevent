import { runStep } from './core.js';
import { ApiError, ERR_DRIVE, ERR_TEMPLATE, ERR_NOT_CONFIGURED, ERR_CANVA_REFUSED } from '../_shared/errors.js';

// Fake Drive: folders are found in `existing` (parent/name → id) or "created" as id-<name>.
function fakeGoogle({ existing = {} } = {}) {
  const g = {
    calls: { findOrCreateFolder: [], copyFile: [], replaceAllText: [] },
    created: [],
    failFindWith: null,
    failCopyWith: null,
    async findOrCreateFolder(parent, name, driveId) {
      g.calls.findOrCreateFolder.push([parent, name, driveId]);
      if (g.failFindWith) throw g.failFindWith;
      const key = `${parent}/${name}`;
      if (!existing[key]) { existing[key] = `id-${name}`; g.created.push(key); }
      return existing[key];
    },
    async copyFile(fileId, parent, name) {
      g.calls.copyFile.push([fileId, parent, name]);
      if (g.failCopyWith) throw g.failCopyWith;
      return `copy-${fileId}`;
    },
    async replaceAllText(docId, map) { g.calls.replaceAllText.push([docId, map]); },
  };
  return g;
}

const event = { id: 'E', name: 'Soirée', starts_at: '2027-03-12T18:00:00+01:00', ends_at: null, location: 'L',
  description: null, expected_attendees: null, extra_fields: {}, drive_folder_id: 'FOLDER', sheet_id: null, declaration_id: null };
const settings = { shared_drive_id: 'D', sheet_template_id: 'ST', declaration_template_id: 'DT' };

let google;
beforeEach(() => { google = fakeGoogle(); });
const ctx = (over = {}) => ({ event, settings, owner: null, templates: [], google, canva: null, now: new Date('2027-02-01T10:00:00Z'), ...over });

test('drive_folder creates year / Event / event folder in the shared drive', async () => {
  const r = await runStep('drive_folder', ctx({ event: { ...event, drive_folder_id: null } }));
  expect(google.calls.findOrCreateFolder).toEqual([['D', '26-27', 'D'], ['id-26-27', 'Event', 'D'], ['id-Event', '2027-03-12 – Soirée', 'D']]);
  expect(r).toEqual({ state: 'done', eventPatch: { drive_folder_id: 'id-2027-03-12 – Soirée' } });
});

test('drive_folder run twice reuses the existing folders (no duplicate)', async () => {
  google = fakeGoogle({ existing: { 'D/26-27': 'Y', 'Y/Event': 'EV', 'EV/2027-03-12 – Soirée': 'F' } });
  const c = ctx({ event: { ...event, drive_folder_id: null } });
  const r1 = await runStep('drive_folder', c);
  const r2 = await runStep('drive_folder', c);
  expect(r1.eventPatch).toEqual({ drive_folder_id: 'F' });
  expect(r2.eventPatch).toEqual(r1.eventPatch);
  expect(google.created).toEqual([]);
});

test('sheet copies the template into the folder', async () => {
  const r = await runStep('sheet', ctx());
  expect(google.calls.copyFile).toEqual([['ST', 'FOLDER', 'Organisation – Soirée']]);
  expect(r).toEqual({ state: 'done', eventPatch: { sheet_id: 'copy-ST' } });
});

test('sheet without a folder fails', async () => {
  expect(await runStep('sheet', ctx({ event: { ...event, drive_folder_id: null } }))).toEqual({
    state: 'failed', error: "Le dossier Drive de l'événement n'existe pas encore : relance l'étape « Dossier Drive ».",
  });
});

test('declaration copies then replaces the tags', async () => {
  const r = await runStep('declaration', ctx({ owner: { name: 'Matis', email: 'm@bdemiagenice.com' } }));
  expect(google.calls.copyFile).toEqual([['DT', 'FOLDER', 'Déclaration – Soirée']]);
  expect(google.calls.replaceAllText[0][0]).toBe('copy-DT');
  expect(google.calls.replaceAllText[0][1]['{{NOM_EVENT}}']).toBe('Soirée');
  expect(google.calls.replaceAllText[0][1]['{{RESPONSABLE}}']).toBe('Matis');
  expect(google.calls.replaceAllText[0][1]['{{DATE_DECLARATION}}']).toBe('01/02/2027');
  expect(r).toEqual({ state: 'done', eventPatch: { declaration_id: 'copy-DT' } });
});

test('declaration already copied: only the tags are (re)filled', async () => {
  const r = await runStep('declaration', ctx({ event: { ...event, declaration_id: 'DOC' } }));
  expect(google.calls.copyFile).toEqual([]);
  expect(google.calls.replaceAllText[0][0]).toBe('DOC');
  expect(r).toEqual({ state: 'done', eventPatch: { declaration_id: 'DOC' } });
});

test('declaration: copy ok but tag fill fails → failed, the copy id is kept for the retry', async () => {
  google.replaceAllText = async () => { throw new ApiError('google', 500); };
  const r = await runStep('declaration', ctx());
  expect(r.state).toBe('failed');
  expect(r.eventPatch).toEqual({ declaration_id: 'copy-DT' });
});

test('missing template setting → ERR_NOT_CONFIGURED', async () => {
  expect(await runStep('sheet', ctx({ settings: { ...settings, sheet_template_id: null } })))
    .toEqual({ state: 'failed', error: ERR_NOT_CONFIGURED });
  expect(await runStep('drive_folder', ctx({ event: { ...event, drive_folder_id: null }, settings: { ...settings, shared_drive_id: null } })))
    .toEqual({ state: 'failed', error: ERR_NOT_CONFIGURED });
});

test('template not found (404) → ERR_TEMPLATE', async () => {
  google.failCopyWith = new ApiError('google', 404);
  expect(await runStep('sheet', ctx())).toEqual({ state: 'failed', error: ERR_TEMPLATE });
  expect(await runStep('declaration', ctx())).toEqual({ state: 'failed', error: ERR_TEMPLATE });
});

test('shared drive not reachable (403) → ERR_DRIVE', async () => {
  google.failFindWith = new ApiError('google', 403);
  expect(await runStep('drive_folder', ctx({ event: { ...event, drive_folder_id: null } })))
    .toEqual({ state: 'failed', error: ERR_DRIVE });
});

test('canva not connected → skipped', async () => {
  expect(await runStep('canva', ctx({ canva: null })))
    .toEqual({ state: 'skipped', error: "Canva n'est pas connecté : un admin peut le connecter dans Admin." });
});

test('canva refuses → skipped ERR_CANVA_REFUSED; canva ok → done', async () => {
  expect(await runStep('canva', ctx({ canva: { createFolder: async () => { throw new ApiError('canva', 403); } } })))
    .toEqual({ state: 'skipped', error: ERR_CANVA_REFUSED });
  expect(await runStep('canva', ctx({ canva: { createFolder: async (n) => `cv-${n}` } })))
    .toEqual({ state: 'done', eventPatch: { canva_folder_id: 'cv-2027-03-12 – Soirée' } });
});

test('admin_tasks copies the template with due dates', async () => {
  const r = await runStep('admin_tasks', ctx({ templates: [
    { label: 'Déclarer', position: 1, days_before: 21 }, { label: 'Réserver la salle', position: 2, days_before: null }] }));
  expect(r).toEqual({ state: 'done', adminTaskRows: [
    { event_id: 'E', label: 'Déclarer', position: 1, due_date: '2027-02-19' },
    { event_id: 'E', label: 'Réserver la salle', position: 2, due_date: null }] });
});

test('unknown step and unexpected errors never throw', async () => {
  expect(await runStep('nope', ctx())).toEqual({ state: 'failed', error: 'Étape inconnue.' });
  google.copyFile = async () => { throw new TypeError('boom'); };
  expect((await runStep('sheet', ctx())).state).toBe('failed');
});
