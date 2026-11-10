import { useState } from 'react';
import logo from '../assets/miage-logo.png';
import Michel from '../components/Michel.jsx';
import { signInWithGoogle } from '../lib/api.js';

export default function Login() {
  const [error, setError] = useState('');
  const go = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('La connexion a échoué. Réessaie.');
    }
  };
  return (
    <main className="center-page">
      <div className="card card-lg elev-md center-card">
        <img className="brand-logo" src={logo} alt="MIAGE" />
        <h1 className="page-title">BD'event</h1>
        <Michel pose="cheer" className="michel-login" />
        <p className="page-lede">Prépare chaque événement du BDE en un clic : dossier Drive, déclaration, Canva et to-do.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={go}>Se connecter avec Google</button>
        {error && <p className="field-error" role="alert">{error}</p>}
        <p className="legal-links">
          <a href={`${import.meta.env.BASE_URL}confidentialite.html`}>Politique de confidentialité</a>
          <a href={`${import.meta.env.BASE_URL}conditions.html`}>Conditions d'utilisation</a>
        </p>
      </div>
    </main>
  );
}
