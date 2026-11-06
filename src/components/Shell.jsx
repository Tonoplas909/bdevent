import logo from '../assets/miage-logo.png';
import Icon from './Icon.jsx';
import { href } from '../lib/route.js';
import { signOut } from '../lib/api.js';

// The ink frame: a sidebar on wide screens, a bottom tab bar on phones.
export default function Shell({ route, member, children }) {
  const isAdmin = member.role === 'admin';
  const section = route.name === 'admin' ? 'admin' : 'events';
  const items = [
    { key: 'events', label: 'Événements', icon: 'calendar', to: href('events') },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: 'settings', to: href('admin') }] : []),
  ];
  const current = (key) => (key === section ? 'page' : undefined);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={logo} alt="MIAGE" />
          <span className="brand-name">BD'event</span>
        </div>
        <nav className="nav nav-vertical" aria-label="Sections">
          {items.map((it) => (
            <a key={it.key} className="nav-item" href={it.to} aria-current={current(it.key)}>
              <Icon name={it.icon} />
              {it.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-user">{member.name || member.email}</span>
          <button type="button" className="btn btn-secondary btn-signout" onClick={signOut}>
            <Icon name="logout" size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="tabbar" aria-label="Sections">
        {items.map((it) => (
          <a key={it.key} href={it.to} aria-current={current(it.key)}>
            <Icon name={it.icon} />
            {it.label}
          </a>
        ))}
        <button type="button" onClick={signOut}>
          <Icon name="logout" />
          Déconnexion
        </button>
      </nav>
    </div>
  );
}
