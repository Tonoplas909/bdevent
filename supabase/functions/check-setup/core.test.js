import { checkSetup } from './core.js';
import { ApiError, ERR_DRIVE, ERR_CANVA_AUTH } from '../_shared/errors.js';

const SHEET = 'application/vnd.google-apps.spreadsheet';
const DOC = 'application/vnd.google-apps.document';
const settings = { shared_drive_id: 'D', sheet_template_id: 'ST', declaration_template_id: 'DT' };

const google = (over = {}) => ({
  getDrive: async () => ({ id: 'D', name: 'BDE MIAGE NICE' }),
  getFile: async (id) => ({ id, name: id, mimeType: id === 'ST' ? SHEET : DOC }),
  ...over,
});
const canvaOk = { ping: async () => {} };

test('everything fine', async () => {
  expect(await checkSetup({ google: google(), canva: canvaOk, settings })).toEqual([
    { item: 'drive', ok: true, message: 'Drive partagé « BDE MIAGE NICE » accessible.' },
    { item: 'sheet_template', ok: true, message: 'Modèle Sheet trouvé.' },
    { item: 'declaration_template', ok: true, message: 'Modèle de déclaration trouvé.' },
    { item: 'canva', ok: true, message: 'Canva connecté.' }]);
});

test('wrong types, no access, Canva missing', async () => {
  const g = google({
    getDrive: async () => { throw new ApiError('google', 403); },
    getFile: async (id) => ({ id, name: id, mimeType: id === 'ST' ? DOC : SHEET }),
  });
  expect(await checkSetup({ google: g, canva: null, settings })).toEqual([
    { item: 'drive', ok: false, message: ERR_DRIVE },
    { item: 'sheet_template', ok: false, message: "Le modèle Sheet n'est pas un Google Sheet." },
    { item: 'declaration_template', ok: false, message: "Le modèle de déclaration n'est pas un Google Doc." },
    { item: 'canva', ok: false, message: "Canva n'est pas connecté." }]);
});

test('empty setting, template not found, Canva token refused', async () => {
  const g = google({ getFile: async () => { throw new ApiError('google', 404); } });
  const canva = { ping: async () => { throw new ApiError('canva', 401); } };
  const r = await checkSetup({ google: g, canva, settings: { ...settings, sheet_template_id: null } });
  expect(r[1]).toEqual({ item: 'sheet_template', ok: false, message: 'Non renseigné.' });
  expect(r[2]).toEqual({ item: 'declaration_template', ok: false, message: 'Modèle introuvable : vérifie le lien dans Admin.' });
  expect(r[3]).toEqual({ item: 'canva', ok: false, message: ERR_CANVA_AUTH });
});
