// Hash routes, so the app works from a GitHub Pages sub-path without server rewrites.
//   #/                    events
//   #/new                 new event
//   #/event/<id>          event page
//   #/event/<id>/progress creation progress
//   #/admin               admin
export function parseRoute(hash) {
  const raw = String(hash ?? '').replace(/^#/, '');
  const [path, qs = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'new' && parts.length === 1) return { name: 'new', query };
  if (parts[0] === 'admin' && parts.length === 1) return { name: 'admin', query };
  if (parts[0] === 'event' && parts[1]) {
    if (parts.length === 2) return { name: 'event', id: parts[1], query };
    if (parts.length === 3 && parts[2] === 'progress') return { name: 'progress', id: parts[1], query };
  }
  return { name: 'events', query };
}

export function href(name, id) {
  switch (name) {
    case 'new': return '#/new';
    case 'admin': return '#/admin';
    case 'event': return `#/event/${id}`;
    case 'progress': return `#/event/${id}/progress`;
    default: return '#/';
  }
}
