# Architecture — Tamurt Vidéo

## 1. Vue d'ensemble

```
Navigateur ──► Vercel (Next.js 16, App Router)
                 ├─ proxy.ts : nonce CSP, rafraîchissement de session Supabase
                 ├─ pages serveur (RSC) ─────────────► Supabase PostgreSQL (RLS)
                 ├─ actions serveur (formulaires) ───► Supabase (session de l'utilisateur)
                 ├─ routes API (lecture, webhooks, cron, HQ)
                 │      ├─► Stripe (paiements, mode test par défaut)
                 │      ├─► Cloudflare Stream (vidéo, jetons RS256) ou fournisseur de développement
                 │      └─► Fournisseur d'emails (console / SMTP / Resend)
                 └─ ressources statiques
Tamurt HQ ─────► /api/hq/v1/metrics (clé Bearer, lecture seule, données agrégées)
Vercel Cron ───► /api/cron/daily (secret Bearer)
```

Principe directeur : **la base de données est la source de vérité des règles
critiques** (droits, accès, rôles, publication). Le code applicatif vérifie aussi, mais
une erreur côté application ne suffit pas à ouvrir un accès : les politiques RLS, les
contraintes et les fonctions `security definer` le refusent.

## 2. Modèle de données (supabase/migrations)

| Migration                                    | Contenu                                                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…0100_foundation`                           | Types énumérés, paramètres de plateforme, rôles et habilitations (`role_permissions`), `has_permission`, journal d'audit immuable, protection du dernier administrateur             |
| `…0200_accounts`                             | Profils, profils de visionnage, création automatique à l'inscription, suspension                                                                                                    |
| `…0300_billing`                              | Formules, prix historisés, clients, abonnements, factures, remboursements, événements de paiement (idempotence), droits d'accès (`get_entitlements_internal`), suivi des fondateurs |
| `…0400_catalog`                              | Œuvres, saisons, épisodes, personnes, crédits, genres, médias, sous-titres, collections, accueil éditorial, recherche plein texte                                                   |
| `…0500_rights`                               | Ayants droit, licences, territoires (WW + exclusions), justificatifs, réclamations, garde de publication, `check_playback`, retrait                                                 |
| `…0600_viewing`                              | Sessions de lecture (écrans simultanés), progression, historique, liste                                                                                                             |
| `…0700_community`                            | Demandes Premium (doublons, votes, statuts, notes), notifications, actualités, feuille de route                                                                                     |
| `…0800_operations`                           | Publicité, finances, consentements, contact, demandes RGPD, clés HQ, incidents, file d'emails, limitation de débit                                                                  |
| `…0900_storage`                              | Compartiments de stockage et politiques (images publiques, sous-titres et justificatifs privés)                                                                                     |
| `…1000_metrics`                              | `platform_metrics` (indicateurs agrégés)                                                                                                                                            |
| `…1100_admin`                                | Recherche d'utilisateurs pour l'administration                                                                                                                                      |
| `…1200_request_notes`, `…1300_admin_helpers` | Notes internes des demandes, emails pour les listes d'administration                                                                                                                |

Les types TypeScript (`src/lib/supabase/database.types.ts`) sont générés par
`pnpm db:types`.

## 3. Autorisations

- **Rôles** : `admin`, `catalog_editor`, `rights_manager` (table `user_roles`), chacun
  associé à un ensemble d'habilitations (`role_permissions`). `src/lib/permissions.ts`
  en est le miroir pour l'affichage ; un test d'intégration vérifie qu'ils sont identiques.
- **Formules** (`free < founder < standard < premium`) calculées par
  `get_entitlements_internal` : abonnement actif ou en période de grâce, abonnement
  offert, suspension, phase de lancement (un fondateur actif est traité comme Standard en
  phase commerciale, à son tarif).
- **RLS** sur toutes les tables, privilèges explicites (`default privileges` révoqués),
  colonnes modifiables limitées (ex. un utilisateur ne peut changer ni son statut de
  fondateur ni sa suspension).
- **Back-office** : `requireStaff(permission)` (404 pour les non-membres de l'équipe,
  page « accès refusé » sinon) et `adminContext(permission)` dans chaque action ;
  double authentification TOTP exigée pour l'équipe lorsque le paramètre
  `admin_mfa_required` est actif (niveau `aal2` vérifié en base par `staff_mfa_satisfied`).
- **Audit** : déclencheurs sur les tables de référence + `log_audit` pour les actions
  sensibles ; le journal refuse toute modification ou suppression.

## 4. Droits de diffusion et lecture

1. **Publication** : un déclencheur refuse `published`/`announced` sans licence signée,
   en cours de validité et couvrant au moins un territoire.
2. **Évaluation** : `title_rights_status(titre, pays, modes, support)` → `valid`,
   `not_started`, `expired`, `territory`, `mode`, `none`. Un pays inconnu (`XX`) n'est
   couvert que par une licence mondiale sans exclusion.
3. **Décision de lecture** : `check_playback` (rôle serveur uniquement) enchaîne :
   œuvre visible, retrait, connexion, suspension, maintenance, profil, annonce, épisode,
   média prêt, âge, droits (licence, période, territoire, mode, support), formule.
4. **Session** : `start_watch_session` applique la limite d'écrans simultanés (un même
   appareil remplace sa session), puis le fournisseur signe un jeton à durée limitée
   (2 à 12 h) : RS256 avec règle géographique pour Cloudflare Stream, HS256 pour le
   fournisseur de développement. Les sous-titres sont servis par l'application avec un
   jeton dédié.
5. **Expiration** : la lecture est refusée dès l'expiration ; la tâche quotidienne
   dépublie ensuite l'œuvre et alerte l'équipe (30, 7, 1 jours avant).
6. **Retrait** : `takedown_title` bloque immédiatement la lecture et met à jour la
   réclamation liée.

**DRM** : non activé. Cloudflare Stream propose Widevine/FairPlay sur demande ; le
lecteur prévoit le passage d'une configuration `drmSystems` à hls.js. Les URL signées,
le contrôle territorial et la limite d'écrans **réduisent** les usages abusifs mais ne
constituent pas une protection absolue contre la copie (capture d'écran, etc.).

## 5. Abonnements et paiements

- Souscription via **Stripe Checkout** ; gestion via le **portail client** ; aucune
  donnée de carte ne transite par l'application.
- **L'accès n'est jamais accordé depuis la page de retour** : uniquement à réception
  d'un webhook signé. Chaque événement est réservé (`claim_payment_event`), traité une
  seule fois, journalisé ; l'état est **relu chez Stripe** (indépendant de l'ordre
  d'arrivée). La tâche quotidienne rattrape les abonnements non synchronisés.
- Transitions (activation, échec, résiliation programmée, changement de formule…)
  notifiées par email ; période de grâce paramétrable après un échec.
- **Tarif fondateur** : un nouveau prix ne s'applique qu'aux nouvelles souscriptions ;
  les abonnements en cours conservent leur tarif (testé). Changer de formule met fin au
  tarif fondateur, avec avertissement explicite.
- **Garde-fou** : une clé Stripe live est refusée tant que
  `PAYMENTS_LIVE_MODE_ALLOWED` n'est pas activé ; les événements live sont ignorés en
  mode test.

## 6. Vidéo

`src/server/streaming` définit l'interface `StreamingProvider` :

- **dev** : médias HLS synthétiques générés par ffmpeg (`pnpm media:dev`), servis par
  `/api/dev-stream` avec jeton ; refusé en production sauf dérogation explicite.
- **cloudflare** : envoi direct reprenable (tus, attestation de droits obligatoire),
  jetons signés RS256, webhook de fin de traitement signé (HMAC). **Non testé contre le
  service réel** (voir `docs/BLOCKERS.md`).

## 7. Internationalisation

next-intl sans préfixe d'URL (cookie `NEXT_LOCALE`). Le français est la référence ; les
autres langues fusionnent avec lui (une clé manquante s'affiche en français) et
affichent un avertissement « traduction en cours de validation ». `pnpm i18n:check`
contrôle clés, syntaxe ICU, variables et balises. L'arabe active `dir="rtl"` ; les
contenus issus de la base sont marqués `dir="auto"`.

## 8. Sécurité

- CSP avec nonce par requête (`strict-dynamic`), `frame-ancestors 'none'`,
  `upgrade-insecure-requests` en HTTPS ; en-têtes `nosniff`, `Referrer-Policy`,
  `X-Frame-Options`, `COOP`, `Permissions-Policy`, HSTS en production ;
  `X-Robots-Tag: noindex` sur les espaces privés.
- Contrôle d'origine sur les API appelées par le navigateur ; protection CSRF native des
  actions serveur ; validation Zod systématique ; requêtes paramétrées (PostgREST).
- Limitation de débit en base (connexion, inscription, paiement, recherche, lecture,
  formulaires publics, API HQ) ; adresses IP hachées (HMAC) dans les journaux.
- Cookies `HttpOnly`/`SameSite=Lax`/`Secure` en production ; secrets uniquement côté
  serveur (variables d'environnement).
- Redirections internes filtrées (`safeNextPath`) ; Markdown rendu sans HTML brut.

## 9. Tâches planifiées et observabilité

`/api/cron/daily` (Vercel Cron, secret Bearer, comparaison à temps constant) : alertes
d'expiration, dépublication sans droits, publications programmées, popularité, sessions
inactives, purge des limites de débit, rattrapage Stripe, envoi des emails en attente.
Les échecs créent un incident visible dans l'administration.

## 10. Tamurt HQ

Clés `thq_…` générées dans l'administration (affichées une seule fois, empreinte SHA-256
stockée, expiration, révocation). L'API ne renvoie que des agrégats sans donnée
personnelle.

## 11. Recommandations et finances

- `GenreAffinityEngine` : affinité de genres pondérée par l'implication et l'ancienneté,
  popularité, nouveautés ; résultat déterministe avec motif explicite. Interface prête
  pour un moteur plus avancé.
- `src/server/finance/economics.ts` : coût par minute diffusée et stockée, commissions,
  répartition des coûts fixes, marge et seuil de rentabilité par formule, points de
  vigilance (dont le tarif fondateur). Voir `docs/COSTS.md`.

## 12. Tests et CI

- Unitaires (Vitest) : fonctions pures et intégrations simulées (signatures de
  webhooks, jetons).
- Intégration (Vitest + base locale) : RLS, droits, lecture, paiements, communauté.
- Bout en bout (Playwright) : parcours par rôle, lecteur, accessibilité (axe), mobile.
- CI GitHub Actions : qualité, tests unitaires, pile Supabase éphémère, intégration,
  build, E2E. Aucun déploiement automatique.
