import { academicYear, parisDateKey, dueDateFrom, formatDateFr, formatTimeFr, todayKey } from './dates.js';

test('academicYear starts on 1 September, Paris time', () => {
  expect(academicYear('2027-03-12T18:00:00+01:00')).toBe('26-27');
  expect(academicYear('2027-09-15T18:00:00+02:00')).toBe('27-28');
  expect(academicYear('2027-08-31T23:30:00+02:00')).toBe('26-27'); // 21:30Z
  expect(academicYear('2027-09-01T00:30:00+02:00')).toBe('27-28'); // 2027-08-31T22:30Z
});

test('parisDateKey uses the Paris calendar day', () => {
  expect(parisDateKey('2027-03-12T23:30:00Z')).toBe('2027-03-13');
});

test('dueDateFrom counts days back from the Paris date', () => {
  expect(dueDateFrom('2027-03-12T18:00:00+01:00', 21)).toBe('2027-02-19');
  expect(dueDateFrom('2027-03-12T18:00:00+01:00', 0)).toBe('2027-03-12');
  expect(dueDateFrom('2027-03-12T18:00:00+01:00', null)).toBe(null);
  expect(dueDateFrom('2027-04-02T10:00:00+02:00', 7)).toBe('2027-03-26'); // across the switch to summer time
});

test('French formats', () => {
  expect(formatDateFr('2027-03-12T18:00:00+01:00')).toBe('12/03/2027');
  expect(formatDateFr('2027-02-19')).toBe('19/02/2027');
  expect(formatTimeFr('2027-03-12T18:00:00+01:00')).toBe('18:00');
});

test('todayKey is the Paris day', () => {
  expect(todayKey(new Date('2027-03-12T23:30:00Z'))).toBe('2027-03-13');
});
