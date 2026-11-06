// Every date the BDE sees is a Paris date, whatever the time zone of the machine running this
// (Edge Functions run in UTC). Day keys are 'YYYY-MM-DD' strings.
export const TZ = 'Europe/Paris';

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// { y, m, d, hh, mm } of an instant, in Paris.
export function parisParts(iso) {
  const parts = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), hh: parts.hour, mm: parts.minute };
}

const pad = (n) => String(n).padStart(2, '0');
const keyOf = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;

export function parisDateKey(iso) {
  return keyOf(parisParts(iso));
}

export function todayKey(now = new Date()) {
  return parisDateKey(now.toISOString());
}

// '26-27' for any date from 1 September 2026 to 31 August 2027.
export function academicYear(iso) {
  const { y, m } = parisParts(iso);
  const start = m >= 9 ? y : y - 1;
  return `${pad(start % 100)}-${pad((start + 1) % 100)}`;
}

export function dueDateFrom(startsAtIso, daysBefore) {
  if (daysBefore === null || daysBefore === undefined || daysBefore === '') return null;
  const { y, m, d } = parisParts(startsAtIso);
  const t = new Date(Date.UTC(y, m - 1, d - Number(daysBefore)));
  return keyOf({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

// 'JJ/MM/AAAA' from an instant or from a 'YYYY-MM-DD' day key.
export function formatDateFr(isoOrKey) {
  const k = KEY.exec(isoOrKey);
  if (k) return `${k[3]}/${k[2]}/${k[1]}`;
  const { y, m, d } = parisParts(isoOrKey);
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function formatTimeFr(iso) {
  const { hh, mm } = parisParts(iso);
  return `${hh}:${mm}`;
}
