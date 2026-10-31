# Blocages et décisions attendues

Points qui **ne peuvent pas être résolus par le code** et qui exigent une action ou une
décision du propriétaire avant toute mise en ligne publique. Classés par priorité.

## 1. Sécurité immédiate

| Sujet                                                                                                                               | Action                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets de l'ancien prototype visibles dans l'historique Git public (clé TMDB, configuration Firebase, clé publique Stripe de test) | Révoquer la clé TMDB, restreindre ou fermer le projet Firebase `tamurt-video`, faire tourner les clés Stripe du compte de test concerné. Détail : `legacy/cra-2023/ARCHIVE.md`. |
| Anciens workflows Firebase toujours actifs sur `main` (déploiement à chaque push)                                                   | Ne pas pousser sur `main` avant la fusion de cette branche, qui les désactive. Supprimer le secret `FIREBASE_SERVICE_ACCOUNT_TAMURT_VIDEO` s'il existe.                         |

## 2. Juridique (validation par un professionnel)

- Les pages légales (`src/content/legal/documents.ts`) sont des **brouillons** : mentions
  légales, CGU, CGA, confidentialité, cookies, remboursement. À faire relire et adapter
  (droit de la consommation, rétractation pour un contenu numérique, RGPD, hébergement).
- Renseigner l'entité éditrice dans **Administration › Paramètres** (raison sociale,
  immatriculation, TVA, directeur de la publication, hébergeur).
- Désigner un médiateur de la consommation (obligatoire en France pour la vente aux
  consommateurs) et l'indiquer dans les CGA.
- Valider la qualification de l'offre Fondateur : abonnement de soutien payant,
  **pas** un don ouvrant droit à réduction d'impôt (ainsi présenté partout).
- Politique de classification d'âge et de protection des mineurs.

## 3. Droits de diffusion

- Aucune œuvre réelle n'est au catalogue : seules des œuvres **fictives** de
  démonstration existent. Chaque acquisition doit passer par un contrat écrit avec les
  ayants droit (territoires, période, modes d'exploitation, supports), enregistré dans
  **Administration › Droits** avec ses justificatifs.
- Désactiver « Afficher les contenus de démonstration » avant toute ouverture publique.
- Définir la procédure interne de traitement des réclamations (délais, contre-notification).

## 4. Paiements

- Stripe est intégré en **mode test** ; aucun paiement réel n'est possible. Le passage
  en mode réel exige : compte Stripe activé, configuration fiscale (TVA, guichet OSS
  européen, Stripe Tax si retenu), relecture des CGA, puis activation explicite de
  `PAYMENTS_LIVE_MODE_ALLOWED`.
- Paiement depuis l'Algérie : les cartes CIB/Edahabia ne sont pas acceptées par Stripe.
  Une solution locale (par ex. passerelle algérienne) relève d'une décision commerciale,
  juridique (réglementation des changes) et technique ultérieure.
- Configurer le portail client Stripe (résiliation, factures, moyens de paiement).

## 5. Vidéo

- L'intégration **Cloudflare Stream n'a pas été testée contre le service réel**
  (documentation inaccessible depuis l'environnement de développement) : envoi tus,
  jetons signés RS256 avec règle géographique, webhook. À valider sur un compte de test
  avec une vidéo libre de droits, sans engager de dépense au-delà de l'offre retenue.
- Décider du DRM (Widevine/FairPlay) selon les exigences des ayants droit ; non activé.
- Exiger les URL signées sur chaque vidéo Stream et restreindre les origines autorisées.

## 6. Traductions

- Anglais et arabe : brouillons complets à faire relire par des traducteurs natifs.
- Kabyle : traduction **partielle** (libellés courants) à compléter et valider par des
  locuteurs natifs ; choix de graphie (latine, tifinagh) à arrêter.
- Les sous-titres générés automatiquement sont signalés comme tels aux spectateurs.

## 7. Services et exploitation

- Créer les comptes de production (Supabase, Vercel, fournisseur d'emails, domaine) :
  voir `docs/SERVICES_SETUP.md`. Le plan Vercel Hobby est réservé à un usage non
  commercial.
- Authentifier le domaine d'envoi des emails (SPF, DKIM, DMARC) avant tout envoi réel.
- Activer la double authentification de chaque membre de l'équipe (paramètre
  `admin_mfa_required` actif en production).
- Audit d'accessibilité manuel (les tests automatiques axe ne couvrent qu'une partie des
  critères WCAG 2.2 AA) et test de charge avant lancement.
- La géolocalisation repose sur l'en-tête de l'hébergeur : les VPN peuvent la
  contourner ; le préciser aux ayants droit.
