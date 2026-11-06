import { createGoogle, driveQueryString } from './google.js';

// A fake fetch that records calls and answers from a script of { status, body } responses.
function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 200, body: {} };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status ?? 200 });
  };
  return { fetch, calls };
}

const make = (responses) => {
  const f = fakeFetch(responses);
  return { g: createGoogle({ fetch: f.fetch, getToken: async () => 'TOKEN' }), calls: f.calls };
};

test('driveQueryString escapes backslashes and quotes', () => {
  expect(driveQueryString("d'un \\ truc")).toBe("d\\'un \\\\ truc");
});

test('findOrCreateFolder reuses an existing folder, apostrophe escaped', async () => {
  const { g, calls } = make([{ body: { files: [{ id: 'F1' }] } }]);
  expect(await g.findOrCreateFolder('P', "Soirée d'intégration", 'D')).toBe('F1');
  const u = new URL(calls[0].url);
  expect(u.origin + u.pathname).toBe('https://www.googleapis.com/drive/v3/files');
  expect(u.searchParams.get('q')).toBe("'P' in parents and name = 'Soirée d\\'intégration' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  expect(u.searchParams.get('supportsAllDrives')).toBe('true');
  expect(u.searchParams.get('includeItemsFromAllDrives')).toBe('true');
  expect(u.searchParams.get('corpora')).toBe('drive');
  expect(u.searchParams.get('driveId')).toBe('D');
  expect(calls).toHaveLength(1);
  expect(calls[0].init.headers.Authorization).toBe('Bearer TOKEN');
});

test('findOrCreateFolder creates the folder when absent', async () => {
  const { g, calls } = make([{ body: { files: [] } }, { body: { id: 'F2' } }]);
  expect(await g.findOrCreateFolder('P', 'Event', 'D')).toBe('F2');
  expect(calls[1].init.method).toBe('POST');
  expect(new URL(calls[1].url).searchParams.get('supportsAllDrives')).toBe('true');
  expect(JSON.parse(calls[1].init.body)).toEqual({ name: 'Event', parents: ['P'], mimeType: 'application/vnd.google-apps.folder' });
});

test('copyFile', async () => {
  const { g, calls } = make([{ body: { id: 'C1' } }]);
  expect(await g.copyFile('T', 'P', 'Organisation – X')).toBe('C1');
  expect(calls[0].url).toMatch(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/T\/copy\?.*supportsAllDrives=true/);
  expect(calls[0].init.method).toBe('POST');
  expect(JSON.parse(calls[0].init.body)).toEqual({ name: 'Organisation – X', parents: ['P'] });
});

test('replaceAllText sends one case-sensitive request per tag', async () => {
  const { g, calls } = make([{ body: {} }]);
  await g.replaceAllText('DOC', { '{{A}}': '1', '{{B}}': '' });
  expect(calls[0].url).toBe('https://docs.googleapis.com/v1/documents/DOC:batchUpdate');
  expect(JSON.parse(calls[0].init.body).requests).toEqual([
    { replaceAllText: { containsText: { text: '{{A}}', matchCase: true }, replaceText: '1' } },
    { replaceAllText: { containsText: { text: '{{B}}', matchCase: true }, replaceText: '' } },
  ]);
});

test('getFile and getDrive', async () => {
  const { g, calls } = make([{ body: { id: 'X', name: 'N', mimeType: 'm' } }, { body: { id: 'D', name: 'BDE MIAGE NICE' } }]);
  expect(await g.getFile('X')).toEqual({ id: 'X', name: 'N', mimeType: 'm' });
  expect(new URL(calls[0].url).searchParams.get('supportsAllDrives')).toBe('true');
  expect(await g.getDrive('D')).toEqual({ id: 'D', name: 'BDE MIAGE NICE' });
  expect(new URL(calls[1].url).pathname).toBe('/drive/v3/drives/D');
});

test('sheet tabs: list, add, clear', async () => {
  const { g, calls } = make([
    { body: { sheets: [{ properties: { sheetId: 0, title: 'Organisation' } }] } },
    { body: { replies: [{ addSheet: { properties: { sheetId: 9 } } }] } },
    { body: {} },
  ]);
  expect(await g.getSheetTabs('S')).toEqual([{ sheetId: 0, title: 'Organisation' }]);
  expect(await g.addSheetTab('S', 'To-do event')).toBe(9);
  expect(JSON.parse(calls[1].init.body)).toEqual({ requests: [{ addSheet: { properties: { title: 'To-do event' } } }] });
  await g.clearRange('S', "'To-do event'");
  expect(calls[2].url).toBe(`https://sheets.googleapis.com/v4/spreadsheets/S/values/${encodeURIComponent("'To-do event'")}:clear`);
});

test('writeValues writes RAW (no formula)', async () => {
  const { g, calls } = make([{ body: {} }]);
  await g.writeValues('S', "'To-do event'!A1", [['=SUM(A1)']]);
  expect(calls[0].init.method).toBe('PUT');
  expect(new URL(calls[0].url).searchParams.get('valueInputOption')).toBe('RAW');
  expect(JSON.parse(calls[0].init.body).values).toEqual([['=SUM(A1)']]);
});

test('a 404 becomes ApiError google', async () => {
  const { g } = make([{ status: 404, body: { error: { message: 'File not found' } } }]);
  await expect(g.getFile('X')).rejects.toMatchObject({ service: 'google', status: 404 });
});
