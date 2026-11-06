import { parisDateKey } from './dates.js';

export function cleanName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

// '2027-03-12 – Soirée d'intégration': the Drive folder and the Canva folder share this name.
export function eventFolderName(event) {
  return `${parisDateKey(event.starts_at)} – ${cleanName(event.name)}`;
}

export function sheetFileName(event) {
  return `Organisation – ${cleanName(event.name)}`;
}

export function declarationFileName(event) {
  return `Déclaration – ${cleanName(event.name)}`;
}
