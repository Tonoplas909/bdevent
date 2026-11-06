# BD'event

L'app du BDE MIAGE Nice pour préparer chaque événement en un clic : dossier Drive dans le Drive partagé, Sheet d'organisation, déclaration pré-remplie, dossier Canva, to-do administrative et to-do de l'événement (exportable en Google Sheet).

React + Vite côté navigateur (publié sur GitHub Pages), Supabase pour la connexion Google, la base et les Edge Functions qui parlent à Google et à Canva. Design : MIAGE Étendu.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # URL et clé publishable du projet Supabase (ou de `npx supabase start`)
npm run dev
```

Tests :

```bash
npm test                 # logique métier, clients Google/Canva, fonctions (Vitest)
npx supabase start       # base locale (Docker)
npx supabase test db     # règles d'accès (pgTAP)
```

Les couleurs viennent de `design-system/tokens.json` ; après l'avoir modifié : `npm run tokens`.

## Mise en place (une seule fois)

### 1. Supabase

1. Créer un projet Supabase « bd-event ». Noter l'URL et la clé publishable (Project Settings > API).
2. Lier et créer la base :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. Authentication > URL Configuration : Site URL = `https://<compte>.github.io/<repo>/`, et ajouter cette même adresse (et `http://localhost:5173/` pour le dev) aux Redirect URLs.
4. Authentication > Providers > Google : activer, coller l'ID et le secret du client OAuth (étape 2).
   Authentication > Providers > **Email : désactiver** (seule la connexion Google est utilisée ; l'app n'accepte de toute façon comme membre d'office qu'un compte du domaine connecté par Google).
5. Après la première connexion des admins, les nommer dans le SQL Editor :
   ```sql
   update members set role = 'admin' where email in ('prenom.nom@bdemiagenice.com');
   ```

### 2. Google Cloud (organisation bdemiagenice.com)

1. Créer un projet Google Cloud dans l'organisation.
2. **Écran de consentement OAuth** : type **Interne** (seuls les comptes @bdemiagenice.com s'y connectent sans avertissement ; les autres comptes passent par une demande d'accès dans l'app).
3. **Identifiants > Créer un ID client OAuth** « Application Web » ; URI de redirection autorisée : `https://<ref>.supabase.co/auth/v1/callback`. Copier l'ID et le secret dans Supabase (étape 1.4).
4. **Activer les API** Google Drive, Google Docs et Google Sheets.
5. **Compte de service** : IAM > Comptes de service > Créer ; puis Clés > Ajouter une clé > JSON (garder le fichier, ne jamais le commiter).
6. Dans Google Drive, Drive partagé **BDE MIAGE NICE** > Gérer les membres : ajouter l'email du compte de service comme **Gestionnaire de contenu**.

### 3. Canva

1. Sur le portail développeur Canva, créer une intégration (Connect API) avec les autorisations `folder:read` et `folder:write`.
2. URL de retour : `https://<ref>.supabase.co/functions/v1/canva-oauth/callback`.
3. Laisser l'intégration en brouillon : elle fonctionne pour les membres de l'équipe Canva du BDE.

### 4. Secrets et fonctions

```bash
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat chemin/vers/cle-compte-de-service.json)"
npx supabase secrets set CANVA_CLIENT_ID=... CANVA_CLIENT_SECRET=...
npx supabase secrets set APP_URL=https://<compte>.github.io/<repo>/
npx supabase functions deploy
```

`canva-oauth` est déployée sans vérification JWT (`supabase/config.toml`) parce que Canva y revient sans jeton ; elle vérifie elle-même qu'un admin la lance.

### 5. GitHub Pages

Dans le dépôt GitHub : Settings > Pages > Source = GitHub Actions ; Settings > Secrets and variables > Actions > **Variables** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Chaque push sur `main` lance les tests, construit et publie.

### 6. Dans l'app, onglet Admin

1. Coller le lien du Drive partagé, du modèle Sheet d'organisation et du modèle de déclaration, puis **Vérifier**.
2. **Connecter Canva** (avec le compte de l'équipe Canva du BDE).
3. Saisir la **to-do administrative** (échéance en jours avant l'événement, facultative).
4. Faire la recette : [docs/recette.md](docs/recette.md).

## Modèle de déclaration : les balises

Dans le Google Doc modèle, écrire ces balises là où l'info doit apparaître ; l'app les remplace dans la copie de chaque événement (sensible à la casse).

| Balise | Remplacée par |
|---|---|
| `{{NOM_EVENT}}` | nom de l'événement |
| `{{DATE}}` | date de début, `JJ/MM/AAAA` |
| `{{HEURE_DEBUT}}` | `HH:MM` |
| `{{HEURE_FIN}}` | `HH:MM`, ou vide |
| `{{LIEU}}` | lieu |
| `{{DESCRIPTION}}` | description |
| `{{RESPONSABLE}}` | nom du ou de la responsable |
| `{{EMAIL_RESPONSABLE}}` | son email |
| `{{PARTICIPANTS}}` | participants estimés |
| `{{DATE_DECLARATION}}` | date du jour de création, `JJ/MM/AAAA` |

Si la déclaration demande d'autres informations, on les ajoute dans `EXTRA_FIELDS` (`supabase/functions/_shared/domain/declaration.js`) : chaque entrée devient un champ du formulaire et une balise.

## Où sont rangés les fichiers

`BDE MIAGE NICE / <AA-AA> / Event / AAAA-MM-JJ – <Nom>` : l'année scolaire (qui commence le 1er septembre) est déduite de la date de l'événement ; les dossiers manquants sont créés. Dedans : `Organisation – <Nom>` et `Déclaration – <Nom>`. Le dossier Canva porte le même nom que le dossier Drive.
