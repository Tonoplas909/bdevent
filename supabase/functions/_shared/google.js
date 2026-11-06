// Small Google Drive / Docs / Sheets client over fetch. Every Drive call supports shared drives.
import { ApiError } from './errors.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const DOCS = 'https://docs.googleapis.com/v1';
const SHEETS = 'https://sheets.googleapis.com/v4';
const FOLDER = 'application/vnd.google-apps.folder';

// A string inside a Drive query: backslash and single quote are escaped.
export function driveQueryString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const withParams = (url, params) => `${url}?${new URLSearchParams(params)}`;

export function createGoogle({ fetch, getToken }) {
  async function call(url, { method = 'GET', body } = {}) {
    const headers = { Authorization: `Bearer ${await getToken()}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new ApiError('google', res.status, data);
    return data;
  }

  return {
    async findOrCreateFolder(parentId, name, driveId) {
      const q = `'${driveQueryString(parentId)}' in parents and name = '${driveQueryString(name)}' and mimeType = '${FOLDER}' and trashed = false`;
      const found = await call(withParams(`${DRIVE}/files`, {
        q, fields: 'files(id,name)', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', corpora: 'drive', driveId,
      }));
      if (found.files?.length) return found.files[0].id;
      const created = await call(withParams(`${DRIVE}/files`, { supportsAllDrives: 'true', fields: 'id' }), {
        method: 'POST', body: { name, parents: [parentId], mimeType: FOLDER },
      });
      return created.id;
    },

    async copyFile(fileId, parentId, name) {
      const copy = await call(withParams(`${DRIVE}/files/${encodeURIComponent(fileId)}/copy`, { supportsAllDrives: 'true', fields: 'id' }), {
        method: 'POST', body: { name, parents: [parentId] },
      });
      return copy.id;
    },

    async replaceAllText(docId, map) {
      const requests = Object.entries(map).map(([text, replaceText]) => ({
        replaceAllText: { containsText: { text, matchCase: true }, replaceText },
      }));
      await call(`${DOCS}/documents/${encodeURIComponent(docId)}:batchUpdate`, { method: 'POST', body: { requests } });
    },

    async getFile(id) {
      const f = await call(withParams(`${DRIVE}/files/${encodeURIComponent(id)}`, { supportsAllDrives: 'true', fields: 'id,name,mimeType' }));
      return { id: f.id, name: f.name, mimeType: f.mimeType };
    },

    async getDrive(id) {
      const d = await call(withParams(`${DRIVE}/drives/${encodeURIComponent(id)}`, { fields: 'id,name' }));
      return { id: d.id, name: d.name };
    },

    async getSheetTabs(spreadsheetId) {
      const s = await call(withParams(`${SHEETS}/spreadsheets/${encodeURIComponent(spreadsheetId)}`, { fields: 'sheets.properties(sheetId,title)' }));
      return (s.sheets ?? []).map((x) => ({ sheetId: x.properties.sheetId, title: x.properties.title }));
    },

    async addSheetTab(spreadsheetId, title) {
      const r = await call(`${SHEETS}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
        method: 'POST', body: { requests: [{ addSheet: { properties: { title } } }] },
      });
      return r.replies[0].addSheet.properties.sheetId;
    },

    async clearRange(spreadsheetId, range) {
      await call(`${SHEETS}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`, { method: 'POST', body: {} });
    },

    // RAW: what the BDE typed is stored as text, so '=…' never becomes a formula.
    async writeValues(spreadsheetId, range, values) {
      await call(withParams(`${SHEETS}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`, { valueInputOption: 'RAW' }), {
        method: 'PUT', body: { range, majorDimension: 'ROWS', values },
      });
    },

    async batchUpdateSheet(spreadsheetId, requests) {
      await call(`${SHEETS}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, { method: 'POST', body: { requests } });
    },
  };
}
