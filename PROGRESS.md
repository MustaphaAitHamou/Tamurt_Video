# PROGRESS — Tamurt Vidéo

Suivi de l'avancement, tenu à jour pour reprendre le travail exactement là où il
s'est arrêté. Dernière mise à jour : 31 octobre 2026.

- **Branche de travail** : `claude/tamurt-video-platform`. Ne jamais pousser sur `main`
  avant fusion : les anciens workflows Firebase y déploient encore à chaque push.
- **Déploiement** : aucun. Paiements : Stripe **mode test** (aucune clé configurée dans le
  dépôt). Vidéo : médias de test synthétiques. Catalogue : œuvres fictives.

## Phases

| Phase                        | État     | Contenu principal                                                                                                                                                                         |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Fondations               | Terminée | Prototype 2023 archivé (`legacy/cra-2023`, secrets retirés), Next.js 16, TypeScript strict, Tailwind 4, composants écrits à la main (registre shadcn inaccessible depuis l'environnement) |
| C1 — Base de données         | Terminée | 13 migrations, RLS partout, fonctions `security definer`, audit immuable, seeds                                                                                                           |
| B/C2 — Frontend et catalogue | Terminée | Identité visuelle, accueil administrable et page fondateurs, catalogue, recherche, fiche œuvre, comptes, profils                                                                          |
| D — Lecteur et streaming     | Terminée | Lecteur HLS complet, contrôle d'accès en base, jetons signés, écrans simultanés, fournisseurs dev et Cloudflare (non testé en réel)                                                       |
| E — Abonnements              | Terminée | Stripe Checkout/Portal/webhooks idempotents, espace fondateur, demandes Premium                                                                                                           |
| F — Administration           | Terminée | Back-office complet (catalogue, droits, éditorial, demandes, utilisateurs, abonnements, finances, publicité, messages, HQ, audit, paramètres)                                             |
| G — Langues, sécurité        | Terminée | Anglais/arabe (brouillons), kabyle partiel, RTL, en-têtes et protections, API Tamurt HQ                                                                                                   |
| H — Tests, CI, docs          | Terminée | 68 tests unitaires, 25 d'intégration, 35 E2E ; CI GitHub Actions ; Vercel ; documentation                                                                                                 |

## Vérifications effectuées (réellement exécutées)

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm i18n:check` : sans erreur.
- `pnpm test` : 68/68. `pnpm test:integration` : 25/25 (base Supabase locale).
- `pnpm test:e2e` : 35/35 en développement et sur la version de production (`next start`,
  avec `ALLOW_DEV_STREAMING_IN_PRODUCTION=true` pour les médias synthétiques).
- `pnpm build` : réussi, sans avertissement.
- CI GitHub Actions (exécution 41231857185 sur le commit `04a0a3d`) : les deux jobs ont
  réussi sur un runner propre — qualité et tests unitaires (44 s), puis pile Supabase
  éphémère, tests d'intégration, données de démonstration, médias synthétiques, build et
  tests de bout en bout (4 min 6 s).
- Contrôles manuels : parcours de lecture (720p adaptatif, sous-titres, épisode suivant),
  création de licence et justificatif, refus de publication sans licence, modération des
  demandes, API Tamurt HQ (clé valide/absente/invalide), affichage arabe RTL.

## Non vérifiable ici (voir `docs/BLOCKERS.md`)

- Cloudflare Stream réel (envoi, jetons, webhook) ; Stripe avec de vraies clés de test du
  propriétaire (le code est testé avec des signatures générées localement) ; envoi
  d'emails réels ; déploiement Vercel.
- Validation juridique, acquisition de droits, relecture des traductions.

## Reprendre le travail

```bash
pnpm install
```

```bash
pnpm db:start && pnpm env:local && pnpm seed:demo && pnpm media:dev
```

```bash
pnpm dev
```

Vérifications avant tout commit :

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm i18n:check && pnpm test
```

```bash
pnpm test:integration && pnpm test:e2e
```

Notes d'environnement (sessions de développement dans un conteneur) :

- Si le registre d'images par défaut est inaccessible :
  `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io pnpm db:start`.
- Si le serveur de développement recharge la page en boucle ou sert une feuille de style
  périmée après une coupure : arrêter `next dev`, supprimer `.next`, relancer.
- La connexion est limitée à 8 tentatives par compte et par 10 minutes : en local,
  `delete from public.rate_limits where key like 'signin:%'` réinitialise le compteur.

## Pistes suivantes (non commencées)

1. Valider Cloudflare Stream sur un compte de test avec une vidéo libre de droits.
2. Relecture des traductions par des locuteurs natifs ; compléter le kabyle.
3. Audit d'accessibilité manuel et test de charge.
4. Paiement annuel (réduit le poids des commissions sur le forfait Fondateur).
5. Applications mobiles et TV (les supports sont déjà modélisés dans les licences).
