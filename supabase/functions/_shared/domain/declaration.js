import { formatDateFr, formatTimeFr } from './dates.js';
import { cleanName } from './naming.js';

// Extra fields the declaration template asks for, beyond the standard ones. Each becomes a form
// field (stored in events.extra_fields[key]) and a tag replaced in the copied document.
// Example: { key: 'budget', label: 'Budget prévu (€)', tag: '{{BUDGET}}', type: 'number', required: false }
export const EXTRA_FIELDS = [];

const text = (v) => (v === null || v === undefined ? '' : String(v));

// The tags replaced in the copied declaration, each mapped to a string (never null or undefined).
export function buildPlaceholders(event, owner, now, extraFields = EXTRA_FIELDS) {
  const map = {
    '{{NOM_EVENT}}': cleanName(event.name),
    '{{DATE}}': formatDateFr(event.starts_at),
    '{{HEURE_DEBUT}}': formatTimeFr(event.starts_at),
    '{{HEURE_FIN}}': event.ends_at ? formatTimeFr(event.ends_at) : '',
    '{{LIEU}}': text(event.location),
    '{{DESCRIPTION}}': text(event.description),
    '{{RESPONSABLE}}': text(owner?.name),
    '{{EMAIL_RESPONSABLE}}': text(owner?.email),
    '{{PARTICIPANTS}}': text(event.expected_attendees),
    '{{DATE_DECLARATION}}': formatDateFr(now.toISOString()),
  };
  for (const f of extraFields) map[f.tag] = text(event.extra_fields?.[f.key]);
  return map;
}
