import { eventFolderName, sheetFileName, declarationFileName } from './naming.js';

test('folder and file names use the cleaned name and the Paris date', () => {
  const ev = { name: "  Soirée   d'intégration ", starts_at: '2027-03-12T18:00:00+01:00' };
  expect(eventFolderName(ev)).toBe("2027-03-12 – Soirée d'intégration");
  expect(sheetFileName(ev)).toBe("Organisation – Soirée d'intégration");
  expect(declarationFileName(ev)).toBe("Déclaration – Soirée d'intégration");
});
