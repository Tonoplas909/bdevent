import { gateFor } from './gate.js';

test('gateFor', () => {
  expect(gateFor(null, null)).toBe('signed-out');
  expect(gateFor({ user: {} }, null)).toBe('no-member');
  expect(gateFor({ user: {} }, { status: 'pending' })).toBe('pending');
  expect(gateFor({ user: {} }, { status: 'refused' })).toBe('refused');
  expect(gateFor({ user: {} }, { status: 'active' })).toBe('active');
});
