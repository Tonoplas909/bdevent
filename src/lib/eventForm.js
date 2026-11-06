import { EXTRA_FIELDS } from '@domain/declaration.js';
import { TZ } from '@domain/dates.js';

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

// Field errors in French, keyed by field (extra fields as 'extra.<key>'); {} when the form is valid.
export function validateEventForm(values, extraFields = EXTRA_FIELDS) {
  const errors = {};
  if (blank(values.name)) errors.name = 'Le nom est obligatoire.';
  if (blank(values.starts_at)) errors.starts_at = 'La date de début est obligatoire.';
  if (blank(values.location)) errors.location = 'Le lieu est obligatoire.';
  if (blank(values.owner_id)) errors.owner_id = 'Choisis un ou une responsable.';
  if (!blank(values.ends_at) && !blank(values.starts_at) && values.ends_at <= values.starts_at) {
    errors.ends_at = 'La fin doit être après le début.';
  }
  if (!blank(values.expected_attendees)) {
    const n = Number(values.expected_attendees);
    if (!Number.isInteger(n) || n < 0) errors.expected_attendees = 'Nombre positif attendu.';
  }
  for (const f of extraFields) {
    if (f.required && blank(values.extra?.[f.key])) errors[`extra.${f.key}`] = 'Ce champ est obligatoire.';
  }
  return errors;
}

// Paris offset ('+01:00' / '+02:00') in force at a UTC instant.
function parisOffset(ms) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName').value; // 'GMT+01:00'
  return name === 'GMT' ? '+00:00' : name.slice(3);
}

const offsetMs = (off) => (off[0] === '-' ? -1 : 1) * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6))) * 60_000;

// A <input type="datetime-local"> value ('2027-03-12T18:00'), read as Paris wall time, as ISO with offset.
export function parisLocalToIso(local) {
  const [d, t] = local.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, day, hh, mm);
  let off = parisOffset(wall);
  off = parisOffset(wall - offsetMs(off)); // re-check at the corrected instant (DST days)
  return `${d}T${t.slice(0, 5)}:00${off}`;
}

export function toEventRow(values, extraFields = EXTRA_FIELDS) {
  const opt = (v) => (blank(v) ? null : String(v).trim());
  const extra_fields = {};
  for (const f of extraFields) {
    const v = values.extra?.[f.key];
    if (!blank(v)) extra_fields[f.key] = f.type === 'number' ? Number(v) : String(v).trim();
  }
  return {
    name: String(values.name).trim().replace(/\s+/g, ' '),
    starts_at: parisLocalToIso(values.starts_at),
    ends_at: blank(values.ends_at) ? null : parisLocalToIso(values.ends_at),
    location: String(values.location).trim(),
    owner_id: values.owner_id,
    description: opt(values.description),
    expected_attendees: blank(values.expected_attendees) ? null : Number(values.expected_attendees),
    extra_fields,
  };
}
