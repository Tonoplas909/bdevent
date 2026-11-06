import { validateEventForm, toEventRow } from './eventForm.js';

test('required fields', () => {
  expect(validateEventForm({ name: ' ', starts_at: '', location: '', owner_id: '' })).toEqual({
    name: 'Le nom est obligatoire.', starts_at: 'La date de début est obligatoire.',
    location: 'Le lieu est obligatoire.', owner_id: 'Choisis un ou une responsable.' });
});

test('end after start, positive attendees', () => {
  expect(validateEventForm({ name: 'A', starts_at: '2027-03-12T18:00', ends_at: '2027-03-12T17:00', location: 'L', owner_id: 'u' }))
    .toEqual({ ends_at: 'La fin doit être après le début.' });
  expect(validateEventForm({ name: 'A', starts_at: '2027-03-12T18:00', location: 'L', owner_id: 'u', expected_attendees: '-3' }))
    .toEqual({ expected_attendees: 'Nombre positif attendu.' });
  expect(validateEventForm({ name: 'A', starts_at: '2027-03-12T18:00', location: 'L', owner_id: 'u', expected_attendees: '40' }))
    .toEqual({});
});

test('required extra field', () => {
  const extra = [{ key: 'budget', label: 'Budget', tag: '{{BUDGET}}', type: 'number', required: true }];
  expect(validateEventForm({ name: 'A', starts_at: '2027-03-12T18:00', location: 'L', owner_id: 'u', extra: {} }, extra))
    .toEqual({ 'extra.budget': 'Ce champ est obligatoire.' });
});

test('toEventRow reads local times as Paris time', () => {
  expect(toEventRow({ name: '  Soirée ', starts_at: '2027-03-12T18:00', ends_at: '', location: 'L', owner_id: 'u',
    description: '', expected_attendees: '' })).toEqual({ name: 'Soirée', starts_at: '2027-03-12T18:00:00+01:00',
    ends_at: null, location: 'L', owner_id: 'u', description: null, expected_attendees: null, extra_fields: {} });
  expect(toEventRow({ name: 'É', starts_at: '2027-07-01T09:30', location: 'L', owner_id: 'u' }).starts_at)
    .toBe('2027-07-01T09:30:00+02:00');
  // the night of the switch to summer time (28 March 2027, 02:00 → 03:00)
  expect(toEventRow({ name: 'N', starts_at: '2027-03-28T01:30', location: 'L', owner_id: 'u' }).starts_at)
    .toBe('2027-03-28T01:30:00+01:00');
  expect(toEventRow({ name: 'N', starts_at: '2027-03-28T04:00', location: 'L', owner_id: 'u' }).starts_at)
    .toBe('2027-03-28T04:00:00+02:00');
});
