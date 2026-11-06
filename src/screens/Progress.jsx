import { useCallback, useEffect, useRef, useState } from 'react';
import { nextStep, isComplete } from '@domain/steps.js';
import Michel from '../components/Michel.jsx';
import StepList from '../components/StepList.jsx';
import { getEvent } from '../lib/api.js';
import { runEventStep } from '../lib/functions.js';
import { href } from '../lib/route.js';

const WAIT_MS = 2000;
const MAX_WAIT_MS = 90_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs the creation steps one by one, showing each, and stops on a failure until "Réessayer".
export default function Progress({ id }) {
  const [event, setEvent] = useState(null);
  const [steps, setSteps] = useState(null);
  const [running, setRunning] = useState(null);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return; // one loop at a time (StrictMode, double click)
    busy.current = true;
    setStopped(false);
    setError('');
    try {
      const ev = await getEvent(id);
      setEvent(ev);
      let current = ev.steps;
      setSteps(current);
      let waited = 0;
      for (let step = nextStep(current); step; step = nextStep(current)) {
        setRunning(step);
        let result;
        try {
          result = await runEventStep(id, step);
        } catch (e) {
          result = { state: 'failed', error: e.message };
        }
        if (result.state === 'running') {
          // Another tab or member is running this step: wait for it instead of running it twice.
          if (waited >= MAX_WAIT_MS) {
            current = { ...current, [step]: { state: 'failed', error: 'Cette étape est en cours ailleurs depuis un moment. Réessaie dans quelques minutes.' } };
            setSteps(current);
            setStopped(true);
            break;
          }
          await sleep(WAIT_MS);
          waited += WAIT_MS;
          continue;
        }
        waited = 0;
        current = { ...current, [step]: result.error ? { state: result.state, error: result.error } : { state: result.state } };
        setSteps(current);
        if (result.state === 'failed') { setStopped(true); break; }
      }
    } catch {
      setError("Impossible de charger l'événement.");
    } finally {
      setRunning(null);
      busy.current = false;
    }
  }, [id]);

  useEffect(() => { run(); }, [run]);

  const done = steps && isComplete(steps) && !running;
  const canvaSkipped = steps?.canva?.state === 'skipped';

  return (
    <div className="stack">
      <header className="page-intro">
        <Michel pose={done ? 'cheer' : 'chef'} className="michel-head" />
        <p className="eyebrow">Création de l'événement</p>
        <h1 className="page-title">{event?.name ?? '…'}</h1>
        <p className="page-lede">{done ? 'Tout est prêt !' : 'On prépare le dossier, les documents et la to-do.'}</p>
      </header>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      <section className="card card-lg elev-sm" aria-live="polite">
        {steps ? <StepList steps={steps} running={running} /> : <p className="card-meta">Chargement…</p>}
        {done && canvaSkipped && (
          <div className="notice notice-warn">
            <p><strong>Dossier Canva à créer à la main.</strong> {steps.canva.error}</p>
          </div>
        )}
        <div className="card-actions">
          {stopped && <button type="button" className="btn btn-primary" onClick={run}>Réessayer</button>}
          {(done || stopped) && <a className={`btn ${done ? 'btn-primary' : 'btn-secondary'}`} href={href('event', id)}>Voir l'événement</a>}
        </div>
      </section>
    </div>
  );
}
