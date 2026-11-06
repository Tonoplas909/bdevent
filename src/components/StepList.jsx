import { STEPS, STEP_LABELS } from '@domain/steps.js';

const ICON = { done: '✓', skipped: '!', failed: '✕', running: '…', pending: '' };
const WORD = { done: 'fait', skipped: 'à faire à la main', failed: 'en échec', running: 'en cours', pending: 'en attente' };

// steps: { [step]: { state, error? } }; running: the step being run now, if any.
export default function StepList({ steps, running }) {
  return (
    <ol className="steps">
      {STEPS.map((s) => {
        const state = s === running ? 'running' : steps?.[s]?.state ?? 'pending';
        return (
          <li key={s} className={`step-${state}`}>
            <span className="step-icon" aria-hidden="true">{ICON[state]}</span>
            <span>
              <strong>{STEP_LABELS[s]}</strong> <span className="sr-only">: {WORD[state]}</span>
              {steps?.[s]?.error && state !== 'running' && <p className="step-error">{steps[s].error}</p>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
