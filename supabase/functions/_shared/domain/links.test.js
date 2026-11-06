import { extractDriveId, driveFolderUrl, sheetUrl, docUrl, canvaFolderUrl } from './links.js';

test('extractDriveId reads links and bare ids', () => {
  expect(extractDriveId('https://drive.google.com/drive/folders/0AbCdEfGhIjKlUk9PVA')).toBe('0AbCdEfGhIjKlUk9PVA');
  expect(extractDriveId('https://docs.google.com/spreadsheets/d/1aB-c_D2eF3gH4/edit#gid=0')).toBe('1aB-c_D2eF3gH4');
  expect(extractDriveId('https://docs.google.com/document/d/1xYzAbCdEf/edit?usp=sharing')).toBe('1xYzAbCdEf');
  expect(extractDriveId('https://drive.google.com/open?id=1QqRrSsTtUu')).toBe('1QqRrSsTtUu');
  expect(extractDriveId('  1RawId_-AbCdEf  ')).toBe('1RawId_-AbCdEf');
  expect(extractDriveId('pas un lien')).toBe(null);
  expect(extractDriveId('')).toBe(null);
});

test('urls', () => {
  expect(driveFolderUrl('F')).toBe('https://drive.google.com/drive/folders/F');
  expect(sheetUrl('S')).toBe('https://docs.google.com/spreadsheets/d/S/edit');
  expect(docUrl('D')).toBe('https://docs.google.com/document/d/D/edit');
  expect(canvaFolderUrl('C')).toBe('https://www.canva.com/folder/C');
});
