# Déploiement

> **Rien n'est déployé automatiquement.** La CI (`.github/workflows/ci.yml`) teste et
> construit l'application sans jamais la publier. Toute mise en ligne, et a fortiori
> l'activation des paiements réels, requiert l'accord explicite du propriétaire.

## 0. Prérequis

- Les points de sécurité immédiats de `docs/BLOCKERS.md` sont traités (anciennes clés
  révoquées, anciens workflows Firebase neutralisés).
- Services configurés selon `docs/SERVICES_SETUP.md` (Supabase, Stripe en test, emails,
  Vercel). Cloudflare Stream est facultatif pour une prévisualisation.
- La branche à déployer passe la CI (lint, typage, format, traductions, tests unitaires,
  d'intégration et de bout en bout).

## 1. Environnement de prévisualisation (recommandé en premier)

1. Projet Supabase dédié à la prévisualisation ; `supabase db push` depuis le dépôt.
2. Projet Vercel relié au dépôt ; variables de l'environnement **Preview** :
   - `NEXT_PUBLIC_SITE_URL` (URL de prévisualisation ou domaine de recette) ;
   - Supabase (URL, clé publique, clé secrète) ;
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` **de test** ;
   - `EMAIL_PROVIDER=console` tant que le domaine d'envoi n'est pas authentifié ;
   - `CRON_SECRET` (valeur aléatoire longue).
3. Déployer la branche (prévisualisation Vercel). Les prévisualisations ne sont jamais
   indexées (`robots.txt` refuse tout hors production).
4. Créer le premier administrateur (voir `SERVICES_SETUP.md` §1.10), activer sa double
   authentification, vérifier les paramètres de la plateforme.
5. Recette : inscription et confirmation d'email, souscription avec une carte de test
   Stripe (`4242 4242 4242 4242`), réception du webhook, accès accordé, résiliation,
   portail client, back-office, géolocalisation (en-tête `x-vercel-ip-country`).

## 2. Production

À n'engager qu'après validation explicite.

1. Projet Supabase de production (sauvegardes activées, plan adapté), migrations
   appliquées avec `supabase db push`.
2. Variables de l'environnement **Production** dans Vercel. Laisser
   `PAYMENTS_LIVE_MODE_ALLOWED` absent ou à `false` tant que les paiements réels ne sont
   pas autorisés : l'application refuse alors toute clé Stripe live.
3. Paramètres de plateforme à vérifier dans l'administration :
   - « Afficher les contenus de démonstration » : **désactivé** ;
   - « Double authentification obligatoire pour l'équipe » : **activé** ;
   - informations légales de l'éditeur renseignées ; email de contact ;
   - phase de lancement « fondateur » ; taux indicatif EUR → DZD daté.
4. Webhooks Stripe et Cloudflare pointant vers le domaine de production.
5. Domaine en HTTPS ; `NEXT_PUBLIC_SITE_URL` et l'URL du site Supabase mis à jour.
6. Vérifier après déploiement : en-têtes de sécurité (CSP, HSTS), `robots.txt`,
   `sitemap.xml`, tâche quotidienne (journal Vercel Cron), réception des emails.

## 3. Mises à jour

- Migrations : nouvelles migrations horodatées dans `supabase/migrations`, jamais de
  modification d'une migration déjà appliquée ; `supabase db push` avant le déploiement
  du code qui en dépend.
- Types : `pnpm db:types` après toute migration.
- Retour arrière : promotion d'un déploiement précédent dans Vercel ; les migrations
  doivent rester rétrocompatibles le temps de la transition.

## 4. Passage aux paiements réels (décision du propriétaire)

1. Validation juridique des CGA et de la politique de remboursement, médiateur désigné.
2. Compte Stripe activé, configuration fiscale (TVA, OSS, Stripe Tax si retenu).
3. Produits et prix recréés en mode réel (bouton de synchronisation de l'administration
   une fois les clés live renseignées).
4. `PAYMENTS_LIVE_MODE_ALLOWED=true`, nouvelles clés live et nouveau secret de webhook.
5. Test réel de bout en bout avec un petit montant puis remboursement.
