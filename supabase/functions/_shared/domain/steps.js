// The automated steps run when an event is created, in this order.
export const STEPS = ['drive_folder', 'sheet', 'declaration', 'canva', 'admin_tasks'];

export const STEP_LABELS = {
  drive_folder: 'Dossier Drive',
  sheet: "Sheet d'organisation",
  declaration: 'Déclaration',
  canva: 'Dossier Canva',
  admin_tasks: 'To-do administrative',
};

export function initialSteps() {
  return Object.fromEntries(STEPS.map((s) => [s, { state: 'pending' }]));
}

const settled = (st) => st === 'done' || st === 'skipped';

// The first step still to run (pending or failed); a skipped Canva step does not block the rest.
export function nextStep(steps) {
  return STEPS.find((s) => !settled(steps?.[s]?.state)) ?? null;
}

export function isComplete(steps) {
  return nextStep(steps) === null;
}
