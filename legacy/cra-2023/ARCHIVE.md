# Archive — prototype Tamurt Vidéo (2023)

Ce dossier conserve le premier prototype de Tamurt Vidéo (Create React App + Redux + Firebase),
tel qu'il existait sur la branche `main` jusqu'au commit `0805b27` (« color button fixed »).
Il est gardé pour mémoire. **Il ne fait pas partie de la nouvelle plateforme** et ne doit
pas être déployé en l'état.

## Pourquoi il est archivé

- Il affiche des films commerciaux récupérés via l'API TMDB : aucun droit de diffusion
  n'est associé à ces contenus.
- Il utilise le logo d'un service tiers (marque protégée) chargé depuis un site externe.
- L'authentification et les paiements reposaient sur Firebase et l'extension Stripe de
  Firebase. La nouvelle plateforme utilise Supabase, Stripe Billing côté serveur et
  Cloudflare Stream (voir `ARCHITECTURE.md` à la racine).

## Secrets retirés

Les valeurs suivantes étaient écrites en clair dans le code. Elles ont été remplacées ici
par des variables d'environnement CRA (`REACT_APP_*`), **mais elles restent visibles dans
l'historique Git public** :

| Fichier | Valeur retirée | Action recommandée |
| --- | --- | --- |
| `src/Requests.js` | Clé API TMDB | Révoquer la clé dans le compte TMDB |
| `src/firebase.js` | Configuration web du projet Firebase `tamurt-video` | Restreindre ou supprimer la clé dans Google Cloud, fermer le projet s'il est inutilisé |
| `src/screens/PlansScreen.js` | Clé publique Stripe (mode test) | Faire tourner les clés du compte Stripe de test concerné |

## Workflows désactivés

Les deux workflows Firebase Hosting (déploiement en production à chaque push sur `main`,
déploiement de prévisualisation sur chaque pull request) ont été déplacés dans
`github-workflows-disabled/`. Hors du dossier `.github/workflows`, GitHub ne les exécute
plus. Le secret `FIREBASE_SERVICE_ACCOUNT_TAMURT_VIDEO` peut être supprimé des secrets
du dépôt s'il existe encore.
