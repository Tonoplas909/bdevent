import { useEffect } from 'react';
import Michel from '../components/Michel.jsx';
import AdminMembers from './admin/AdminMembers.jsx';
import AdminTemplates from './admin/AdminTemplates.jsx';
import AdminTaskTemplate from './admin/AdminTaskTemplate.jsx';
import AdminCanva from './admin/AdminCanva.jsx';
import CheckSetup from './admin/CheckSetup.jsx';

export default function Admin({ me, query }) {
  const isAdmin = me.role === 'admin';
  useEffect(() => {
    if (!isAdmin) window.location.hash = '#/';
  }, [isAdmin]);
  if (!isAdmin) return null;

  return (
    <div className="stack">
      <header className="page-intro">
        <Michel pose="boss" className="michel-head" />
        <p className="eyebrow">Réservé aux admins</p>
        <h1 className="page-title">Admin</h1>
        <p className="page-lede">Les membres, les modèles Google, Canva et la to-do administrative commune à tous les événements.</p>
      </header>
      <AdminMembers me={me} />
      <AdminTemplates><CheckSetup /></AdminTemplates>
      <AdminCanva query={query} />
      <AdminTaskTemplate />
    </div>
  );
}
