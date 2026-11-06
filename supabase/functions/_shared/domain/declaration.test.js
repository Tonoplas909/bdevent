import { buildPlaceholders } from './declaration.js';

const event = { name: 'Soirée', starts_at: '2027-03-12T18:00:00+01:00', ends_at: null, location: 'Campus Valrose',
  description: null, expected_attendees: null, extra_fields: {} };
const owner = { name: 'Matis Demore', email: 'matis@bdemiagenice.com' };

test('every tag gets a string, empty when the field is empty', () => {
  expect(buildPlaceholders(event, owner, new Date('2027-02-01T10:00:00Z'))).toEqual({
    '{{NOM_EVENT}}': 'Soirée', '{{DATE}}': '12/03/2027', '{{HEURE_DEBUT}}': '18:00', '{{HEURE_FIN}}': '',
    '{{LIEU}}': 'Campus Valrose', '{{DESCRIPTION}}': '', '{{RESPONSABLE}}': 'Matis Demore',
    '{{EMAIL_RESPONSABLE}}': 'matis@bdemiagenice.com', '{{PARTICIPANTS}}': '', '{{DATE_DECLARATION}}': '01/02/2027',
  });
});

test('no owner, zero attendees, end time and an extra field', () => {
  const p = buildPlaceholders(
    { ...event, ends_at: '2027-03-12T23:00:00+01:00', expected_attendees: 0, extra_fields: { budget: 300 } },
    null, new Date('2027-02-01T10:00:00Z'),
    [{ key: 'budget', label: 'Budget', tag: '{{BUDGET}}', type: 'number', required: false }],
  );
  expect(p['{{RESPONSABLE}}']).toBe('');
  expect(p['{{EMAIL_RESPONSABLE}}']).toBe('');
  expect(p['{{PARTICIPANTS}}']).toBe('0');
  expect(p['{{HEURE_FIN}}']).toBe('23:00');
  expect(p['{{BUDGET}}']).toBe('300');
  expect(Object.values(p).some((v) => /null|undefined/.test(v))).toBe(false);
});
