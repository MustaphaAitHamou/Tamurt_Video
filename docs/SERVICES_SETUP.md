# Configuration des services externes

Chaque service est **facultatif en développement** : sans configuration, l'application
fonctionne avec la pile Supabase locale, des paiements désactivés, des médias de test et
des emails journalisés. Aucune ressource payante n'est créée par le code.

> Ne jamais committer de clé. Les clés de production se saisissent uniquement dans les
> variables d'environnement de l'hébergeur. Liste complète : `.env.example`.

## 1. Supabase (base de données, authentification, stockage)

1. Créer un projet (région européenne proche des utilisateurs, ex. Paris `eu-west-3`).
2. Appliquer les migrations depuis le dépôt :
   ```bash
   pnpm exec supabase link --project-ref <ref>
   ```
   ```bash
   pnpm exec supabase db push
   ```
   Ne **pas** exécuter `supabase/seed.sql` ni `pnpm seed:demo` en production : ils
   concernent le développement local (le script de démonstration refuse d'ailleurs une
   base non locale sans option explicite).
3. Clés : `NEXT_PUBLIC_SUPABASE_URL`, clé publique (`sb_publishable_…`) et clé secrète
   (`sb_secret_…`, serveur uniquement).
4. **Authentication › URL Configuration** : _Site URL_ = URL du site ; _Redirect URLs_ :
   `https://<domaine>/**` (et l'URL des prévisualisations Vercel si nécessaire).
5. **Authentication › Email** : confirmation d'email activée, changement d'email sécurisé,
   mot de passe d'au moins 10 caractères avec majuscules, minuscules et chiffres
   (identique à `supabase/config.toml`). Reprendre les modèles de `supabase/templates/`
   (liens `{{ .SiteURL }}/auth/confirm?token_hash=…`).
6. **SMTP personnalisé** : indispensable en production (l'envoi par défaut de Supabase
   est très limité) ; utiliser le même fournisseur que les emails transactionnels.
7. **MFA** : activer TOTP. Le paramètre de plateforme `admin_mfa_required` doit rester
   actif en production.
8. **Google** (facultatif) : créer un identifiant OAuth, le déclarer dans Supabase, puis
   `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.
9. Stockage : les compartiments et politiques sont créés par les migrations
   (`media-public`, `subtitles`, `rights-documents` privés).
10. Premier administrateur : créer le compte via l'inscription, puis en SQL :
    `insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');`

## 2. Stripe (paiements) — mode test

1. Utiliser **exclusivement les clés de test** (`sk_test_…`) tant que la mise en
   production des paiements n'est pas validée (voir `docs/BLOCKERS.md`).
2. `STRIPE_SECRET_KEY` = clé secrète de test.
3. Produits et prix : depuis **Administration › Abonnements › Formules et prix**,
   bouton « Synchroniser avec Stripe » (crée produit et prix de test, clé d'idempotence).
4. Webhook : point de terminaison `https://<domaine>/api/stripe/webhook`, événements :
   `checkout.session.completed`, `customer.subscription.created|updated|deleted|paused|resumed|pending_update_applied|pending_update_expired|trial_will_end`,
   `invoice.paid|payment_succeeded|payment_failed|finalized|updated|voided|marked_uncollectible`.
   Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
   En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. Portail client : activer la résiliation à l'échéance, l'historique des factures et la
   mise à jour du moyen de paiement ; désactiver les changements de formule depuis le
   portail (gérés par l'application pour préserver la règle du tarif fondateur).
6. TVA : prix affichés TTC (`tax_behavior: inclusive`). Stripe Tax (`STRIPE_AUTOMATIC_TAX`)
   seulement après configuration fiscale.
7. Mode réel : uniquement après validation explicite, avec
   `PAYMENTS_LIVE_MODE_ALLOWED=true`. Sinon une clé live est refusée au démarrage.

## 3. Cloudflare Stream (vidéo)

> Intégration écrite d'après l'API publique de Stream, **non testée contre le service
> réel**. Points à vérifier lors du premier essai : en-têtes de l'envoi tus
> (`Upload-Metadata`, `Upload-Creator`), format des jetons signés et des règles d'accès
> géographiques, format de l'en-tête `Webhook-Signature`.

1. Créer un jeton d'API avec la permission _Stream: Edit_ : `CLOUDFLARE_STREAM_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, code client (`customer-<code>.cloudflarestream.com`) :
   `CLOUDFLARE_STREAM_CUSTOMER_CODE`.
2. Créer une clé de signature (API Stream « keys ») : identifiant →
   `CLOUDFLARE_STREAM_SIGNING_KEY_ID`, clé PEM (ou base64) →
   `CLOUDFLARE_STREAM_SIGNING_KEY_PEM`.
3. Webhook : `https://<domaine>/api/cloudflare/webhook`, secret →
   `CLOUDFLARE_STREAM_WEBHOOK_SECRET`.
4. Paramètres recommandés : URL signées obligatoires sur chaque vidéo, origines
   autorisées limitées au domaine, téléchargements désactivés.
5. Les envois se font depuis la fiche d'une œuvre (Administration › Catalogue › Vidéos),
   uniquement si une licence signée existe et après attestation de droits.

## 4. Emails transactionnels

- Développement : `EMAIL_PROVIDER=console` (aucun envoi, journal dans l'administration).
- Production : `resend` (`RESEND_API_KEY`) ou `smtp` (`SMTP_*`), `EMAIL_FROM`,
  `EMAIL_REPLY_TO`. Authentifier le domaine (SPF, DKIM, DMARC) avant le premier envoi.

## 5. Vercel (hébergement)

1. Importer le dépôt ; framework Next.js détecté ; pnpm via `packageManager`.
2. Variables d'environnement : celles de `.env.example` (production et prévisualisation
   séparées ; prévisualisation avec un projet Supabase et des clés Stripe de test dédiés).
3. `CRON_SECRET` : Vercel l'envoie en `Authorization: Bearer` à `/api/cron/daily`
   (planification dans `vercel.json`, une fois par jour).
4. Région des fonctions : `cdg1` (Paris) dans `vercel.json`, à aligner sur la région
   Supabase.
5. Le plan Hobby est réservé à un usage non commercial : prévoir le plan adapté avant
   l'ouverture commerciale.

## 6. Domaine

Pointer le domaine vers Vercel, forcer HTTPS, puis mettre à jour `NEXT_PUBLIC_SITE_URL`,
l'URL du site dans Supabase et les points de terminaison des webhooks.

## 7. Tamurt HQ

Créer une clé dans **Administration › Tamurt HQ** (affichée une seule fois) et la
transmettre par un canal sûr. Appel : `GET /api/hq/v1/metrics?jours=30` avec
`Authorization: Bearer thq_…`.
