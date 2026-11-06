// A select of the active members.
export default function MemberPicker({ id, value, onChange, members, allowEmpty = false, emptyLabel = '—', ...rest }) {
  return (
    <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...rest}>
      {(allowEmpty || !value) && <option value="">{emptyLabel}</option>}
      {members.filter((m) => m.status === 'active').map((m) => (
        <option key={m.id} value={m.id}>{m.name || m.email}</option>
      ))}
    </select>
  );
}
