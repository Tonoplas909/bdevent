// Admins paste whatever Google gives them: a folder link, a Docs or Sheets link, or a bare id.
export function extractDriveId(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const m = /\/folders\/([A-Za-z0-9_-]+)/.exec(s) ?? /\/d\/([A-Za-z0-9_-]+)/.exec(s) ?? /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

export const driveFolderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;
export const sheetUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/edit`;
export const docUrl = (id) => `https://docs.google.com/document/d/${id}/edit`;
export const canvaFolderUrl = (id) => `https://www.canva.com/folder/${id}`;
