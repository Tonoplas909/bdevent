# Recette BD'event

À faire une fois la mise en place du README terminée, sur l'app publiée, avec un événement de test (« Test BD'event »). Cocher au fur et à mesure.

## Déjà vérifié en développement (Supabase local)

Pour mémoire, ces points ont été testés pendant le développement, sur une base locale, sans Google ni Canva réels :
- accès par domaine, demande d'accès d'un compte gmail, membre sans accès à Admin ;
- Admin : liens des modèles (dont lien invalide), to-do administrative ;
- création d'un événement (validation, nom nettoyé, heure de Paris), fiche, to-do (ajout, édition, filtres, tri, déplacement), case administrative ;
- fonctions serveur sous Deno : messages d'erreur sans clé Google, Canva non connecté, to-do administrative générée une seule fois avec ses échéances, refus sans session, connexion Canva (démarrage et retours en erreur).

Ce qui suit vérifie ce qui ne pouvait l'être qu'avec les vrais comptes.

## Accès

- [ ] Un compte @bdemiagenice.com se connecte avec Google et arrive sur « Événements ».
- [ ] Un compte gmail voit « Demander l'accès », puis « Demande envoyée » ; un admin le voit dans Admin > Demandes, l'accepte ; le compte accède à l'app après rechargement.
- [ ] Un compte refusé voit « Ta demande d'accès a été refusée. »
- [ ] Un membre non admin n'a pas l'entrée Admin et `#/admin` le renvoie à l'accueil.

## Configuration

- [ ] Admin > Modèles Google > **Vérifier** : les quatre lignes sont « OK » (Drive partagé nommé « BDE MIAGE NICE », deux modèles, Canva).
- [ ] Coller un lien de Doc dans le champ du modèle Sheet puis **Vérifier** : « Le modèle Sheet n'est pas un Google Sheet. »

## Création d'un événement

- [ ] Créer « Test BD'event » (avec une apostrophe dans le nom) : les cinq étapes passent à ✓ (ou Canva à !).
- [ ] Le dossier est `BDE MIAGE NICE / <AA-AA> / Event / AAAA-MM-JJ – Test BD'event` ; l'année correspond à la date (un événement en septembre va dans l'année suivante).
- [ ] Il contient `Organisation – Test BD'event` (copie vide du modèle) et `Déclaration – Test BD'event`.
- [ ] Dans la déclaration, toutes les balises sont remplacées ; les champs laissés vides donnent un blanc (pas « null »).
- [ ] La to-do administrative est là, avec les échéances (J-x) bien calculées.
- [ ] Les boutons Dossier Drive, Sheet, Déclaration (et Canva) ouvrent les bons fichiers.

## Reprise sans doublon

- [ ] Retirer le compte de service du Drive partagé, créer un événement : l'étape Dossier Drive passe en ✕ avec « Le compte de service n'a pas accès au Drive partagé : ajoute-le comme Gestionnaire de contenu. »
- [ ] Remettre l'accès, cliquer **Réessayer** : tout passe, et il n'y a qu'un seul dossier pour cet événement dans le Drive.
- [ ] Recharger la page de progression d'un événement terminé : rien n'est recréé.

## Canva (point ouvert de la spec)

- [ ] Admin > **Connecter Canva** : retour sur Admin avec « Canva est connecté. »
- [ ] Un nouvel événement a son dossier Canva, au même nom que le dossier Drive. **Noter ici le résultat** :
  - [ ] dossier créé → l'automatisation Canva fonctionne avec votre offre ;
  - [ ] « Canva a refusé la création du dossier… » → la création à la main (encadré sur la fiche) devient le fonctionnement normal.
- [ ] Sur une fiche sans dossier Canva : l'encadré donne le nom à copier, **Copier** marche, **Réessayer** retente.
- [ ] Admin > **Déconnecter** : l'état repasse à « Non connecté ».

## To-do de l'événement et export

- [ ] Ajouter trois tâches, assigner, changer importance, date et statut ; un autre membre voit les mêmes données après rechargement.
- [ ] Filtres (Mes tâches, En retard, statuts) et tris corrects ; une tâche en retard apparaît en ambre.
- [ ] Ajouter une tâche dont le texte est `=1+1` puis **Exporter vers Google Sheet** : l'onglet « To-do event » du Sheet d'organisation s'ouvre ; `=1+1` est affiché tel quel ; en-tête figé ; couleurs par statut ; ligne « Exporté le … par … ».
- [ ] Changer un statut et exporter à nouveau : l'onglet est remplacé (pas de lignes en double, couleurs à jour).

## Affichage

- [ ] Thème sombre (réglage sombre du système) : tout reste lisible.
- [ ] Téléphone (375 px) : barre d'onglets en bas, formulaire sur une colonne, tâches affichées en cartes, aucun défilement horizontal de la page.
