// Stroke icons on a 24px grid, 2.75 stroke, round caps, currentColor (MIAGE Étendu rules).
const PATHS = {
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4',
  plus: 'M12 5v14M5 12h14',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  sheet: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7M12.5 10v8',
  doc: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7M9 19h4',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.4-1-1.6-1-2.8 0-.9.7-1.7 1.7-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M15 7.5h.01',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  back: 'M15 18l-6-6 6-6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
};

export default function Icon({ name, size = 20 }) {
  const small = name === 'up' || name === 'down' || name === 'back';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={small ? 2.4 : 2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
