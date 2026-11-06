import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { getMyMember } from './lib/api.js';
import { gateFor } from './lib/gate.js';
import { parseRoute } from './lib/route.js';
import Login from './screens/Login.jsx';
import AccessRequest from './screens/AccessRequest.jsx';
import Shell from './components/Shell.jsx';
import Events from './screens/Events.jsx';
import NewEvent from './screens/NewEvent.jsx';
import EventDetail from './screens/EventDetail.jsx';
import Progress from './screens/Progress.jsx';
import Admin from './screens/Admin.jsx';

// Follow the system theme: MIAGE Étendu switches on data-theme="dark".
function useSystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (mq.matches) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}

function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  useSystemTheme();
  const route = useRoute();
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [member, setMember] = useState(undefined); // undefined = not looked up yet, null = no member row
  const [loadError, setLoadError] = useState('');
  const userId = session?.user?.id;

  const loadMember = useCallback(async () => {
    try {
      setLoadError('');
      setMember(await getMyMember());
    } catch {
      setLoadError('Impossible de charger ton profil. Recharge la page.');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMember(undefined);
    if (userId) loadMember();
  }, [userId, loadMember]);

  if (loadError) return <main className="center-page"><p className="notice notice-danger">{loadError}</p></main>;
  if (session === undefined || (session && member === undefined)) {
    return <main className="center-page"><p className="text-muted">Chargement…</p></main>;
  }
  const gate = gateFor(session, member);
  if (gate === 'signed-out') return <Login />;
  if (gate !== 'active') return <AccessRequest gate={gate} email={session.user.email} onRequested={loadMember} />;

  return (
    <Shell route={route} member={member}>
      <Screen route={route} member={member} />
    </Shell>
  );
}

function Screen({ route, member }) {
  switch (route.name) {
    case 'new': return <NewEvent me={member} />;
    case 'event': return <EventDetail id={route.id} me={member} />;
    case 'progress': return <Progress id={route.id} />;
    case 'admin': return <Admin me={member} query={route.query} />;
    default: return <Events />;
  }
}
