import { useEffect, useState } from 'react';
import { EXTRA_FIELDS } from '@domain/declaration.js';
import MemberPicker from '../components/MemberPicker.jsx';
import Icon from '../components/Icon.jsx';
import { createEvent, listMembers } from '../lib/api.js';
import { validateEventForm, toEventRow } from '../lib/eventForm.js';
import { href } from '../lib/route.js';

function Field({ id, label, error, hint, children, wide }) {
  return (
    <div className={`field${wide ? ' span-2' : ''}`}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

export default function NewEvent({ me }) {
  const [values, setValues] = useState({ name: '', starts_at: '', ends_at: '', location: '', description: '', owner_id: me.id, expected_attendees: '', extra: {} });
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => { listMembers().then(setMembers).catch(() => {}); }, []);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setExtra = (key) => (e) => setValues((v) => ({ ...v, extra: { ...v.extra, [key]: e.target.value } }));
  const inv = (key) => (errors[key] ? { 'aria-invalid': 'true', 'aria-describedby': `${key}-error` } : {});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = validateEventForm(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setSubmitError('');
    try {
      const { id } = await createEvent(toEventRow(values));
      window.location.hash = href('progress', id);
    } catch {
      setSubmitError("L'événement n'a pas pu être créé. Réessaie.");
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <a className="btn btn-ghost" href={href('events')} style={{ alignSelf: 'flex-start' }}><Icon name="back" size={18} />Événements</a>
      <h1 className="page-title">Nouvel événement</h1>
      <form className="card card-lg elev-sm" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field id="name" label="Nom de l'événement" error={errors.name} wide>
            <input id="name" className="input" value={values.name} onChange={set('name')} {...inv('name')} />
          </Field>
          <Field id="starts_at" label="Début" error={errors.starts_at}>
            <input id="starts_at" type="datetime-local" className="input" value={values.starts_at} onChange={set('starts_at')} {...inv('starts_at')} />
          </Field>
          <Field id="ends_at" label="Fin (facultatif)" error={errors.ends_at}>
            <input id="ends_at" type="datetime-local" className="input" value={values.ends_at} onChange={set('ends_at')} {...inv('ends_at')} />
          </Field>
          <Field id="location" label="Lieu" error={errors.location}>
            <input id="location" className="input" value={values.location} onChange={set('location')} {...inv('location')} />
          </Field>
          <Field id="owner_id" label="Responsable" error={errors.owner_id}>
            <MemberPicker id="owner_id" value={values.owner_id} members={members.length ? members : [me]}
              onChange={(v) => setValues((x) => ({ ...x, owner_id: v }))} {...inv('owner_id')} />
          </Field>
          <Field id="expected_attendees" label="Participants estimés (facultatif)" error={errors.expected_attendees}>
            <input id="expected_attendees" className="input" inputMode="numeric" value={values.expected_attendees}
              onChange={set('expected_attendees')} {...inv('expected_attendees')} />
          </Field>
          {EXTRA_FIELDS.map((f) => {
            const key = `extra.${f.key}`;
            const common = { id: key, className: 'input', value: values.extra[f.key] ?? '', onChange: setExtra(f.key), ...inv(key) };
            return (
              <Field key={f.key} id={key} label={f.required ? f.label : `${f.label} (facultatif)`} error={errors[key]} wide={f.type === 'textarea'}>
                {f.type === 'textarea' ? <textarea {...common} /> : <input {...common} type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} />}
              </Field>
            );
          })}
          <Field id="description" label="Description (facultatif)" wide>
            <textarea id="description" className="input" value={values.description} onChange={set('description')} />
          </Field>
        </div>
        <div className="card-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Créer'}</button>
          <a className="btn btn-secondary" href={href('events')}>Annuler</a>
        </div>
        {submitError && <p className="notice notice-danger" role="alert">{submitError}</p>}
      </form>
    </div>
  );
}
