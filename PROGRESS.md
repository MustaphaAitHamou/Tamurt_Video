# PROGRESS — Tamurt Vidéo

Suivi de l'avancement. Mis à jour à chaque étape : il doit permettre de reprendre le
travail exactement là où il s'est arrêté.

Branche de travail : `claude/tamurt-video-platform` (jamais `main` : les anciens
workflows Firebase y déployaient en production à chaque push).

## État actuel

- [x] Phase A — Inspection du dépôt, archivage du prototype 2023 dans `legacy/cra-2023`
      (secrets retirés, workflows Firebase désactivés), initialisation Next.js 16.4,
      TypeScript strict, Tailwind 4, composants shadcn/ui écrits à la main (le registre
      ui.shadcn.com est bloqué par le réseau de l'environnement de développement).
- [x] Phase C1 (en cours) — 9 migrations SQL appliquées sans erreur sur la stack
      Supabase locale ; types TypeScript générés.
- [ ] Phase B/C2 — Frontend et catalogue dynamique.
- [ ] Phase D — Lecteur et streaming.
- [ ] Phase E — Abonnements et paiements.
- [ ] Phase F — Administration.
- [ ] Phase G — i18n, emails, légal, sécurité.
- [ ] Phase H — Tests, CI, documentation.

## Reprendre le travail

```bash
pnpm install
pnpm db:start        # stack Supabase locale (Docker)
pnpm db:reset        # migrations + données de démonstration
pnpm dev
```

Voir `README.md` pour le détail.
