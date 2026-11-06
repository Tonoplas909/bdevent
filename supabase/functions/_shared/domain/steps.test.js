import { initialSteps, nextStep, isComplete, STEPS } from './steps.js';

const s = (o) => ({ ...initialSteps(), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { state: v }])) });

test('initialSteps: every step pending, in order', () => {
  expect(STEPS).toEqual(['drive_folder', 'sheet', 'declaration', 'canva', 'admin_tasks']);
  expect(initialSteps()).toEqual({ drive_folder: { state: 'pending' }, sheet: { state: 'pending' },
    declaration: { state: 'pending' }, canva: { state: 'pending' }, admin_tasks: { state: 'pending' } });
});

test('nextStep resumes at the failed step and skips a skipped Canva', () => {
  expect(nextStep(s({ drive_folder: 'done', sheet: 'failed' }))).toBe('sheet');
  expect(nextStep(s({ drive_folder: 'done', sheet: 'done', declaration: 'done', canva: 'skipped' }))).toBe('admin_tasks');
});

test('complete when everything is done or skipped', () => {
  const all = s({ drive_folder: 'done', sheet: 'done', declaration: 'done', canva: 'skipped', admin_tasks: 'done' });
  expect(nextStep(all)).toBe(null);
  expect(isComplete(all)).toBe(true);
  expect(isComplete(s({ drive_folder: 'done' }))).toBe(false);
});
