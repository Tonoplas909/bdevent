// What an admin sees after "Vérifier": one line per thing the automation needs.
import { translateError } from '../_shared/errors.js';

const SHEET = 'application/vnd.google-apps.spreadsheet';
const DOC = 'application/vnd.google-apps.document';

async function line(item, fn, what) {
  try {
    return { item, ok: true, message: await fn() };
  } catch (err) {
    return { item, ok: false, message: err?.userMessage ?? translateError(err, { what }) };
  }
}

const wrongType = (message) => Object.assign(new Error(message), { userMessage: message });

async function template(google, id, mime, okMessage, wrongMessage) {
  if (!id) throw wrongType('Non renseigné.');
  const f = await google.getFile(id);
  if (f.mimeType !== mime) throw wrongType(wrongMessage);
  return okMessage;
}

export async function checkSetup({ google, canva, settings }) {
  return Promise.all([
    line('drive', async () => {
      if (!settings?.shared_drive_id) throw wrongType('Non renseigné.');
      const d = await google.getDrive(settings.shared_drive_id);
      return `Drive partagé « ${d.name} » accessible.`;
    }, 'drive'),
    line('sheet_template', () => template(google, settings?.sheet_template_id, SHEET, 'Modèle Sheet trouvé.',
      "Le modèle Sheet n'est pas un Google Sheet."), 'sheet_template'),
    line('declaration_template', () => template(google, settings?.declaration_template_id, DOC, 'Modèle de déclaration trouvé.',
      "Le modèle de déclaration n'est pas un Google Doc."), 'declaration_template'),
    line('canva', async () => {
      if (!canva) throw wrongType("Canva n'est pas connecté.");
      await canva.ping();
      return 'Canva connecté.';
    }),
  ]);
}
