# Tamurt Vidéo

Plateforme de streaming légale dédiée au cinéma, aux séries, aux documentaires et aux
archives d'Algérie, de Kabylie et du monde amazigh. Service de l'écosystème
**TAMURT SERVICES**.

> **État : prototype fonctionnel complet, non déployé en production.**
> Paiements en **mode test Stripe** uniquement, diffusion en **médias de test
> synthétiques** en local, documents juridiques à l'état de **brouillons**, catalogue de
> **démonstration fictif**. Voir [`docs/BLOCKERS.md`](docs/BLOCKERS.md) avant toute
> mise en ligne.

## Fonctionnalités

| Domaine        | Contenu                                                                                                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formules       | Fondateur 2 €/mois (soutien pendant la construction ; accès Standard conservé à 2 € au lancement tant que l'abonnement reste actif), Standard 10 €, Premium 20 €. Prix historisés et configurables, euros facturés, équivalent indicatif en dinars.                   |
| Catalogue      | Films, séries (saisons, épisodes), documentaires, courts-métrages, émissions, entretiens ; genres, collections, recherche plein texte, recommandations déterministes et explicables.                                                                                  |
| Droits         | Licences (territoires, exclusions, périodes, modes d'exploitation, supports), justificatifs privés, ayants droit, réclamations et retrait immédiat. Aucune publication ni lecture sans licence valide : contrôle en base de données.                                  |
| Lecture        | Lecteur HLS (hls.js) : qualité, sous-titres WebVTT, vitesse, reprise, passer l'introduction, épisode suivant, plein écran, image dans l'image, raccourcis clavier, gestion des erreurs réseau, limite d'écrans simultanés, jetons signés à durée limitée.             |
| Comptes        | Inscription avec vérification d'email, mot de passe oublié, double authentification (TOTP), profils de visionnage (dont enfants), liste, historique, export et suppression des données.                                                                               |
| Premium        | Demandes de films avec détection des doublons, votes, suivi de statut notifié. Une demande n'est jamais une promesse ; aucune œuvre n'est téléchargée sans autorisation.                                                                                              |
| Administration | Tableau de bord, catalogue, droits, éditorial (accueil, bannières, collections, actualités, feuille de route), demandes, utilisateurs et rôles, abonnements, finances et marges, publicité interne, messages, clés Tamurt HQ, journal d'audit, paramètres, incidents. |
| Conformité     | Bandeau de consentement, pages légales (brouillons), procédure de signalement, demandes RGPD, journal d'audit immuable.                                                                                                                                               |
| Langues        | Français (référence), anglais et arabe (RTL) en brouillon, kabyle partiel.                                                                                                                                                                                            |
| Tamurt HQ      | API de métriques agrégées authentifiée par clé (`/api/hq/v1/metrics`).                                                                                                                                                                                                |

## Identité visuelle

Tamurt Vidéo suit la DA de la famille **Tamurt Services** : le rouge de la famille (`#E5162F`) à pleine puissance sur le noir d'une salle obscure (`#0F0F10`). L'app est toujours sombre, et l'or reste réservé aux distinctions fondateur / premium.

- **Police** : Onest, auto-hébergée (`src/app/fonts`, licence OFL jointe), titres en 800 et boutons en 700. Noto Sans Arabic couvre l'arabe et Noto Sans Tifinagh le tifinagh.
- **Formes** : boutons et cartes à 14 px, champs à 12 px, frise « pellicule » en haut du pied de page.
- **Fichiers** : logos et icônes dans `public/brand`, favicon `src/app/icon.svg`, image de partage générée à partir du logo de la DA.
- **Bouton yaz** : il apparaît en bout d'en-tête quand `TAMURT_SERVICES_URL` est renseignée.

## Pile technique

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS 4 ·
composants de style shadcn/ui · Lucide · Zod · Supabase (PostgreSQL, Auth, Storage,
RLS) · Stripe Billing/Checkout/Portal · Cloudflare Stream · next-intl · Vitest ·
Playwright · GitHub Actions · Vercel.

## Démarrage local

Prérequis : Node 22 (`.nvmrc`), pnpm 10 (`corepack enable`), Docker **démarré**, et
ffmpeg pour les vidéos de test. Le CLI Supabase est installé comme dépendance du projet.
Tous les scripts fonctionnent sous Windows (PowerShell), macOS et Linux.

> **Windows** : installer Docker Desktop avec le moteur WSL 2 et le lancer avant
> `pnpm db:start` (l'erreur `dockerDesktopLinuxEngine … cannot find the file` signifie
> que Docker Desktop n'est pas démarré). ffmpeg : `winget install Gyan.FFmpeg`, puis
> rouvrir le terminal.

```bash
pnpm install
```

```bash
pnpm db:start          # pile Supabase locale : migrations + supabase/seed.sql
```

```bash
pnpm env:local         # écrit .env.local avec les clés LOCALES
```

```bash
pnpm seed:demo         # comptes et catalogue fictifs (refuse toute base non locale)
```

```bash
pnpm media:dev         # médias HLS synthétiques (nécessite ffmpeg)
```

```bash
pnpm dev               # http://localhost:3000
```

Comptes de démonstration **locaux** (mot de passe `Tamurt-Demo-2026`) :
`admin@`, `editeur@`, `droits@`, `fondateur@`, `standard@`, `premium@`, `membre@`
suivis de `tamurt.test`. Les emails sont visibles dans Mailpit (http://127.0.0.1:54324).

## Commandes

| Commande                                             | Rôle                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`             | Développement, build, serveur de production                     |
| `pnpm lint` · `pnpm typecheck` · `pnpm format:check` | Qualité                                                         |
| `pnpm i18n:check`                                    | Cohérence des traductions avec le français                      |
| `pnpm test`                                          | Tests unitaires (Vitest)                                        |
| `pnpm test:integration`                              | Tests d'intégration sur la base locale (RLS, droits, paiements) |
| `pnpm test:e2e`                                      | Tests de bout en bout (Playwright, dont accessibilité axe)      |
| `pnpm db:reset` · `pnpm db:types`                    | Réinitialisation de la base locale, génération des types        |
| `pnpm demo:art`                                      | Visuels fictifs de démonstration                                |

## Structure

```
src/app            routes (site public, authentification, lecteur, administration, API)
src/actions        actions serveur (formulaires)
src/server         logique serveur : catalogue, lecture, paiements, emails, métriques…
src/components     interface (ui, catalogue, lecteur, administration…)
src/lib            utilitaires partagés (formatage, environnement, permissions, CSP)
src/i18n, messages internationalisation
supabase           migrations SQL versionnées, configuration locale, modèles d'emails
scripts            outillage (seed, médias de test, marque, environnement local)
tests, e2e         tests unitaires, d'intégration et de bout en bout
legacy/cra-2023    prototype 2023 archivé (secrets retirés)
docs               déploiement, services, blocages, coûts
```

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — architecture, modèle de données, sécurité.
- [`PROGRESS.md`](PROGRESS.md) — avancement et reprise du travail.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — déploiement (prévisualisation puis production).
- [`docs/SERVICES_SETUP.md`](docs/SERVICES_SETUP.md) — configuration des services externes.
- [`docs/BLOCKERS.md`](docs/BLOCKERS.md) — décisions et actions attendues du propriétaire.
- [`docs/COSTS.md`](docs/COSTS.md) — modèle de coûts et rentabilité des formules.

## Principes non négociables

- Aucune œuvre diffusée sans autorisation ; contenus de démonstration fictifs uniquement.
- Stripe en mode test par défaut ; paiements réels désactivés sans validation explicite.
- Aucune donnée de carte stockée ; aucun secret dans le code, Git ou les journaux.
- Les URL signées et le contrôle territorial limitent l'accès mais ne constituent pas une
  protection absolue contre la copie.
- Les documents juridiques et les traductions sont des brouillons à faire valider.
