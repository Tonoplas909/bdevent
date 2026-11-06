# BD'event — Spécification de conception

Date : 2026-11-06
Statut : à relire

## 1. Objectif

BD'event est une web app pour les membres du BDE MIAGE Nice. Pour chaque événement prévu, elle prépare automatiquement le travail de départ :

1. un dossier Drive pour l'événement dans le Drive partagé du BDE ;
2. une copie du modèle Google Sheet d'organisation dans ce dossier ;
3. une copie du modèle Google Doc de déclaration d'événement dans ce dossier, remplie avec les infos de l'événement ;
4. un dossier Canva pour préparer la communication ;
5. la to-do administrative commune à tous les événements ;

et elle permet de suivre une to-do propre à chaque événement, exportable vers Google Sheet.

**Critère de réussite** : un membre saisit les infos d'un événement une seule fois et retrouve en moins d'une minute le dossier Drive, le Sheet, la déclaration pré-remplie, le dossier Canva (ou une consigne claire pour le créer à la main) et la to-do administrative prête à cocher.

## 2. Utilisateurs et accès

- Plusieurs membres du bureau du BDE utilisent l'app.
- Connexion avec Google (Supabase Auth, fournisseur Google).
- Tout compte `@bdemiagenice.com` est accepté automatiquement : un enregistrement `members` est créé en `active` à la première connexion.
- Tout autre compte voit l'écran « Demander l'accès ». La demande crée un `members` en `pending`, visible dans l'onglet Admin, où un admin l'accepte (`active`) ou la refuse (`refused`).
- Deux rôles : `member` et `admin`. La liste initiale des admins est définie à la mise en place (migration de départ) puis modifiable dans Admin.
- Tous les membres `active` ont les mêmes droits sur les événements et les to-do. Seuls les admins accèdent à l'onglet Admin.

## 3. Design

- Design system **MIAGE Étendu** (artifact claude.ai `DYjgc3kwamQ9Cn5T5xY1D7`) : tokens, `components/bundle.css`, polices Barlow Condensed (600, 800) et Figtree, logo MIAGE, mascotte Michel.
- On reprend tel quel le CSS des tokens et des composants : boutons, tags, cartes, champs, barre supérieure, barre latérale.
- Cadre `color-ink` (barre latérale), cartes `color-surface` sur `color-bg`, une seule action principale par vue, statuts toujours accompagnés d'un mot.
- Thème clair par défaut, thème sombre via `data-theme="dark"`.
- Les composants absents du design system (table éditable, select, case à cocher, dialogue) sont construits à partir des tokens en suivant les règles du README (bordures de contrôle `color-border-control`, pilules, 44 px minimum sur mobile).
- Michel : `chill` pour les listes vides, `cheer` à la fin d'une création réussie, `boss` dans Admin. Un seul Michel par vue, toujours décoratif (`alt=""`, `aria-hidden`).

## 4. Écrans

### 4.1 Connexion
Bouton « Se connecter avec Google ». Selon le statut du membre : accès à l'app, écran « Demande envoyée, en attente d'un admin », ou écran « Accès refusé ».

### 4.2 Événements (accueil)
- Cartes des événements à venir, triées par date : nom, date, lieu, et deux indicateurs d'avancement (to-do administrative : x/y cochées ; to-do de l'event : x/y finies).
- Onglet « Passés » pour les événements dont la date est dépassée.
- Bouton principal « Nouvel événement ».
- État vide : Michel `chill` et l'invitation à créer le premier événement.

### 4.3 Nouvel événement
Formulaire avec ces champs (liste à compléter avec les champs exigés par le modèle de déclaration, voir §7.4) :

| Champ | Type | Obligatoire |
|---|---|---|
| Nom de l'événement | texte | oui |
| Date et heure de début | date-heure | oui |
| Date et heure de fin | date-heure | non |
| Lieu | texte | oui |
| Description | texte long | non |
| Responsable | membre | oui |
| Participants estimés | nombre | non |

« Créer » enregistre l'événement, puis ouvre l'écran de progression (§6.1). On y voit chaque étape avec son état (en cours, ✓, ⚠ ou ✗) et, pour une étape en échec, le message et un bouton « Réessayer ». À la fin, un bouton mène à la fiche événement.

### 4.4 Fiche événement
- En-tête : infos de l'événement ; boutons « Dossier Drive », « Sheet », « Déclaration » et « Canva » qui ouvrent les fichiers dans un nouvel onglet. Si le dossier Canva n'a pas pu être créé, un encadré `tag-warn` affiche « Créer le dossier Canva à la main », avec le nom à copier et un lien vers Canva, plus un bouton « Réessayer ».
- Si une étape de création est restée en échec, un bandeau propose de reprendre la création.
- Onglet **Administratif** : liste à cocher. Chaque ligne affiche son intitulé, son échéance calculée (si définie) avec un tag « en retard » quand elle est dépassée et non cochée, et, si elle est cochée, par qui et quand.
- Onglet **To-do de l'event** : tableau éditable sur place, avec les colonnes :
  - Tâche (texte)
  - Qui (membre `active`, ou vide)
  - Importance : très basse, basse, moyenne, haute, très haute
  - Date limite (date, optionnelle)
  - Statut : à faire, en cours, fini
  - Commentaire (texte)

  On peut ajouter, supprimer et réordonner les lignes, trier par colonne, et filtrer (« mes tâches », « en retard », par statut). Bouton « Exporter vers Google Sheet » (§6.3).

### 4.5 Admin (admins seulement)
- **Membres** : liste, demandes en attente (accepter ou refuser), changer un rôle.
- **Modèles Google** : lien du modèle Sheet d'organisation, lien du modèle Doc de déclaration, ID du Drive partagé `BDE MIAGE NICE`. Bouton « Vérifier » qui teste l'accès du compte de service à ces trois éléments.
- **Canva** : bouton « Connecter Canva » ou « Déconnecter », avec l'état de la connexion.
- **To-do administrative** : éditer le modèle (ajouter, supprimer, réordonner les tâches, définir une échéance relative en jours avant l'événement).

### 4.6 Hors périmètre (V1)
Notifications par mail, calendrier, rôles plus fins que member/admin, mise à jour de la déclaration après modification de l'événement, suppression des fichiers Drive ou Canva à la suppression d'un événement.

## 5. Données (Supabase / Postgres)

### `members`
| colonne | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| email | text unique | |
| name | text | nom Google |
| role | enum `member` \| `admin` | défaut `member` |
| status | enum `active` \| `pending` \| `refused` | `active` automatique pour `@bdemiagenice.com` |
| created_at | timestamptz | |

### `events`
| colonne | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| starts_at | timestamptz | |
| ends_at | timestamptz null | |
| location | text | |
| description | text null | |
| owner_id | uuid → members | responsable |
| expected_attendees | int null | |
| extra_fields | jsonb | champs supplémentaires de la déclaration (§7.4) |
| drive_folder_id | text null | |
| sheet_id | text null | |
| declaration_id | text null | |
| canva_folder_id | text null | |
| steps | jsonb | `{ "drive_folder": {"state":"done"}, "sheet": {...}, "declaration": {...}, "canva": {...}, "admin_tasks": {...} }`, avec `state` ∈ `pending`, `done`, `failed`, `skipped` et `error` (message en français) |
| created_by | uuid → members | |
| created_at | timestamptz | |

### `admin_task_templates`
| colonne | type | notes |
|---|---|---|
| id | uuid PK | |
| label | text | |
| position | int | ordre |
| days_before | int null | échéance relative : J-x avant `starts_at` |

### `event_admin_tasks`
| colonne | type | notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid → events (cascade) | |
| label | text | copié du modèle |
| position | int | |
| due_date | date null | `starts_at` − `days_before`, calculée à la copie |
| done_by | uuid → members null | |
| done_at | timestamptz null | |

### `event_tasks`
| colonne | type | notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid → events (cascade) | |
| title | text | |
| assignee_id | uuid → members null | |
| priority | smallint 1–5 | 1 très basse … 5 très haute |
| due_date | date null | |
| status | enum `todo` \| `doing` \| `done` | défaut `todo` |
| comment | text null | |
| position | int | |
| updated_at | timestamptz | |

### `settings` (une seule ligne)
| colonne | type | notes |
|---|---|---|
| shared_drive_id | text | Drive partagé `BDE MIAGE NICE` |
| sheet_template_id | text | |
| declaration_template_id | text | |
| canva_connected | boolean | état affiché dans Admin |

### `secrets_canva` (une seule ligne, inaccessible au client)
`access_token`, `refresh_token`, `expires_at`, `connected_by`.

### Règles
- RLS : lecture et écriture sur `events`, `event_admin_tasks`, `event_tasks`, `admin_task_templates` (lecture), `members` (lecture) réservées aux membres `active`. Écriture sur `admin_task_templates`, `settings` et `members` (rôle, statut) réservée aux admins.
- Tout utilisateur connecté lit sa propre ligne `members` (pour savoir s'il est `pending` ou `refused`) et peut insérer sa propre ligne en `pending`, rôle `member` (demande d'accès), une seule fois.
- `secrets_canva` n'a aucune politique RLS pour le client ; seules les Edge Functions y accèdent avec la clé `service_role`.
- Modifier `admin_task_templates` ne change pas les événements existants : chacun garde sa copie.
- Le trigger de création de membre lit le domaine de l'email : `@bdemiagenice.com` donne `active`, sinon pas de création automatique (le membre est créé en `pending` quand il clique « Demander l'accès »).

## 6. Automatisations (Supabase Edge Functions, TypeScript)

Toutes les fonctions vérifient le jeton Supabase de l'appelant et exigent un membre `active` (ou `admin` quand c'est indiqué).

### 6.1 Création d'un événement — `event-step`
Appelée par le client **une fois par étape**, dans l'ordre : `{ event_id, step }`. Chaque étape :
- ne fait rien si elle est déjà `done` (idempotente) ;
- enregistre l'ID créé et son état dans `events.steps` ;
- renvoie `{ state, error? }`.

| Étape | Action |
|---|---|
| `drive_folder` | Calcule l'année scolaire `AA-AA` depuis `starts_at` (une année commence le 1er septembre). Cherche ou crée `BDE MIAGE NICE / AA-AA / Event` dans le Drive partagé, puis crée `AAAA-MM-JJ – <Nom>` dedans. |
| `sheet` | `files.copy` du modèle Sheet dans le dossier de l'event, nommé `Organisation – <Nom>`. |
| `declaration` | `files.copy` du modèle Doc, nommé `Déclaration – <Nom>`, puis `documents.batchUpdate` avec un `replaceAllText` par balise (§7.4). |
| `canva` | `POST /v1/folders` avec le nom `AAAA-MM-JJ – <Nom>`. Rafraîchit le jeton Canva si nécessaire. Si Canva n'est pas connecté ou refuse la requête, l'état passe à `skipped` avec la raison ; l'étape ne bloque pas les suivantes. |
| `admin_tasks` | Copie `admin_task_templates` dans `event_admin_tasks` et calcule `due_date`. |

Tous les appels Drive passent `supportsAllDrives=true`. Ils sont faits par un **compte de service** Google, membre « Gestionnaire de contenu » du Drive partagé (authentification JWT avec la clé du compte de service stockée dans les secrets Supabase).

Si une étape échoue (`failed`), le client affiche l'erreur et « Réessayer ». La reprise rappelle `event-step` à partir de la première étape non `done`.

### 6.2 Connexion Canva — `canva-oauth`
- `start` (admin) : génère le `code_verifier` PKCE et l'état, renvoie l'URL d'autorisation Canva (autorisations `folder:read folder:write`).
- `callback` : échange le code, stocke les jetons dans `secrets_canva`, met `settings.canva_connected = true` et redirige vers l'onglet Admin.
- `disconnect` (admin) : efface les jetons.

### 6.3 Export de la to-do — `export-tasks`
`{ event_id }`. Dans le Sheet d'organisation de l'event : crée l'onglet « To-do event » s'il n'existe pas, sinon le vide. Écrit ensuite :
- une ligne d'en-tête (Tâche, Qui, Importance, Date limite, Statut, Commentaire) ;
- les lignes, triées par `position` ;
- une ligne finale « Exporté le JJ/MM/AAAA à HH:MM par <nom> ».

Puis applique une mise en forme : en-tête gras et figé, couleur de fond selon le statut, largeurs de colonnes. Renvoie le lien vers l'onglet. L'app reste la référence ; chaque export remplace l'onglet.

### 6.4 Vérification de la configuration — `check-setup` (admin)
Teste l'accès du compte de service au Drive partagé et aux deux modèles, et l'état du jeton Canva. Renvoie un diagnostic par élément.

### 6.5 Gestion des erreurs
- Chaque fonction traduit les erreurs connues en messages français utiles :
  - 403 ou 404 sur le Drive : « Le compte de service n'a pas accès au Drive partagé : ajoute-le comme Gestionnaire de contenu. »
  - Modèle introuvable : « Modèle introuvable : vérifie le lien dans Admin. »
  - Jeton Canva invalide : « Reconnecte Canva dans Admin. »
  - Erreur inconnue : message générique et détail technique dans les journaux.
- Aucun secret ni jeton n'est jamais renvoyé au client.
- Les erreurs inattendues sont journalisées (journaux des Edge Functions).

## 7. Contenus fournis par le BDE

1. **Modèle Sheet d'organisation** (vide), dans le Drive partagé.
2. **Modèle Doc de déclaration**, dans le Drive partagé. On y ajoute des balises.
3. **Liste de la to-do administrative**, avec si possible une échéance relative pour chaque tâche.
4. **Balises de la déclaration**. Balises standard, remplacées partout dans le Doc :

| Balise | Valeur |
|---|---|
| `{{NOM_EVENT}}` | nom |
| `{{DATE}}` | date de début, `JJ/MM/AAAA` |
| `{{HEURE_DEBUT}}` | `HH:MM` |
| `{{HEURE_FIN}}` | `HH:MM`, ou vide |
| `{{LIEU}}` | lieu |
| `{{DESCRIPTION}}` | description |
| `{{RESPONSABLE}}` | nom du responsable |
| `{{EMAIL_RESPONSABLE}}` | email du responsable |
| `{{PARTICIPANTS}}` | participants estimés |
| `{{DATE_DECLARATION}}` | date du jour, `JJ/MM/AAAA` |

Si le modèle demande d'autres informations, on les ajoute comme champs du formulaire, stockés dans `events.extra_fields`, avec leur balise. Cette liste est figée dans le code pour la V1.

## 8. Architecture et code

```
bd'event/
├─ src/                    React + Vite
│  ├─ styles/              tokens-and-components.css (MIAGE Étendu), fonts.css
│  ├─ assets/              logo, Michel
│  ├─ lib/                 supabase.js, api.js (appels aux Edge Functions)
│  ├─ domain/              logique pure testée : academicYear, dueDates, naming, placeholders, exportRows
│  ├─ screens/             Login, Events, NewEvent, Progress, EventDetail, Admin
│  └─ components/          TaskTable, AdminChecklist, StepList, MemberPicker…
├─ supabase/
│  ├─ migrations/          schéma, RLS, trigger membres, admins initiaux
│  └─ functions/           event-step, canva-oauth, export-tasks, check-setup, _shared/ (google.ts, canva.ts, errors.ts, domain partagé)
├─ docs/
└─ .github/workflows/      déploiement GitHub Pages
```

- La logique pure (`domain/`) est partagée entre le client et les Edge Functions, sans dépendance à Google ou Canva.
- Les clients Google et Canva (`_shared/google.ts`, `_shared/canva.ts`) sont des modules à interface simple (`createFolder`, `copyFile`, `replaceText`, `writeTab`…), remplaçables par des faux dans les tests.
- Secrets Supabase : `GOOGLE_SERVICE_ACCOUNT_JSON`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `APP_URL`.
- Variables du client : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 9. Mise en place (guide dans le README)

1. **Supabase** : créer le projet, lancer les migrations, activer le fournisseur Google, renseigner les admins initiaux.
2. **Google Cloud** : créer un projet, configurer l'écran de consentement en **interne** (domaine `bdemiagenice.com`), créer le client OAuth (connexion Supabase), activer les API Drive, Docs et Sheets, créer un compte de service et sa clé, ajouter son email comme « Gestionnaire de contenu » du Drive partagé `BDE MIAGE NICE`.
3. **Canva** : créer l'intégration dans le portail développeur Canva, autorisations `folder:read` et `folder:write`, URL de retour vers `canva-oauth/callback`. Elle reste en brouillon, ce qui suffit pour les membres de l'équipe Canva du BDE.
4. **Secrets** dans Supabase, variables dans GitHub, puis push sur `main`.
5. **Dans Admin** : coller les liens des modèles et l'ID du Drive partagé, cliquer « Vérifier », connecter Canva, saisir la to-do administrative.
6. **Recette** : créer un événement de test et suivre la checklist de recette (`docs/recette.md`).

## 10. Tests

- **Unitaires (Vitest)** sur `domain/` :
  - année scolaire (31/08 vs 01/09, changement d'année civile) ;
  - échéances J-x ;
  - nommage des dossiers et fichiers ;
  - valeurs des balises (champs vides, formats de date en `Europe/Paris`) ;
  - lignes d'export.
- **Edge Functions** avec des clients Google et Canva simulés :
  - enchaînement des étapes ;
  - idempotence (une étape `done` n'est pas refaite) ;
  - reprise après échec ;
  - Canva `skipped` sans blocage ;
  - traduction des erreurs ;
  - refus d'un appelant non `active`.
- **RLS** : un membre `pending` ne lit rien ; un `member` ne peut pas écrire dans `settings`.
- **Recette manuelle** sur l'environnement réel (`docs/recette.md`).

## 11. Ordre de construction

1. **Socle** : projet Vite, design system, connexion Google, `members`, accès par domaine, demandes d'accès, Admin > Membres.
2. **Événements et to-do** : création (sans automatisation), liste, fiche, to-do administrative depuis le modèle, to-do de l'event. L'app est utilisable à ce stade.
3. **Automatisations Google** : compte de service, `event-step` (dossier, Sheet, déclaration), écran de progression, `check-setup`.
4. **Canva** : `canva-oauth`, étape `canva`, solution de repli.
5. **Export** : `export-tasks`.

## 12. Risques et points ouverts

- **Endpoints de dossiers Canva** : une source non officielle les dit réservés aux comptes Enterprise. On le vérifie dès l'étape 4. S'ils sont refusés, la solution de repli manuelle devient le comportement normal.
- **Intégration Canva en brouillon** : elle ne fonctionne que pour les membres de l'équipe Canva du BDE, ce qui est le cas visé.
- **Liste exacte des champs de la déclaration** : à confirmer en lisant le modèle fourni.
