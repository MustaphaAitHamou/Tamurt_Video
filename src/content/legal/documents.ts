/**
 * Documents juridiques PROVISOIRES. Rédigés comme base de travail : ils
 * doivent être relus et validés par un professionnel du droit, adaptés à
 * l'entité qui exploitera réellement le service (pays d'établissement, TVA,
 * médiation de la consommation) avant toute commercialisation.
 * Les marqueurs {{...}} sont remplacés par les paramètres administrables.
 */
export type LegalDocument = { slug: string; title: string; updatedAt: string; body: string };

const mentions: LegalDocument = {
  slug: "mentions-legales",
  title: "Mentions légales",
  updatedAt: "2026-10-31",
  body: `
## Éditeur du service

Tamurt Vidéo est un service de l'écosystème Tamurt Services, édité par :

- **Raison sociale :** {{entity.name}}
- **Forme juridique :** {{entity.form}}
- **Adresse :** {{entity.address}}
- **Immatriculation :** {{entity.registration}}
- **TVA intracommunautaire :** {{entity.vat}}
- **Directeur ou directrice de la publication :** {{entity.publication_director}}
- **Contact :** {{support_email}}

## Hébergement

- **Application web :** {{entity.host}}
- **Base de données et authentification :** Supabase Inc. (région d'hébergement à préciser lors de la mise en production ; une région de l'Union européenne est recommandée).
- **Diffusion vidéo :** Cloudflare, Inc. (Cloudflare Stream).
- **Paiements :** Stripe Payments Europe, Ltd. Tamurt Vidéo ne stocke aucune donnée de carte bancaire.

## Propriété intellectuelle

La marque, le logo et l'identité visuelle de Tamurt Vidéo sont la propriété de l'éditeur. Les œuvres diffusées restent la propriété de leurs ayants droit ; elles sont mises à disposition dans le cadre de licences, pour les territoires et les durées convenus. Toute reproduction, extraction ou rediffusion est interdite.

Polices de caractères : Geist (licence SIL Open Font), Outfit, Noto Sans Arabic et Noto Sans Tifinagh (licence SIL Open Font).

## Signalement d'un contenu

Tout titulaire de droits peut signaler un contenu via la [procédure de signalement](/signalement). Les signalements sont examinés en priorité et peuvent entraîner le retrait immédiat du contenu.
`,
};

const cgu: LegalDocument = {
  slug: "cgu",
  title: "Conditions générales d'utilisation",
  updatedAt: "2026-10-31",
  body: `
## 1. Objet

Les présentes conditions encadrent l'accès au site et aux services Tamurt Vidéo, plateforme de diffusion en ligne de films, séries, documentaires et émissions, éditée par {{entity.name}}.

## 2. Compte utilisateur

L'inscription nécessite une adresse email valide, confirmée par un lien. Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez activer la double authentification depuis votre compte. Un compte est personnel ; les profils de visionnage permettent aux membres d'un même foyer de disposer d'un historique distinct, dans la limite prévue par votre formule.

## 3. Disponibilité des contenus

Les œuvres sont diffusées dans le cadre de licences limitées dans le temps et dans l'espace. Une œuvre peut ne pas être disponible dans votre pays, ou cesser d'être disponible à l'expiration des droits. Le catalogue annoncé est donné à titre d'information et ne constitue pas un engagement de mise en ligne à une date précise.

## 4. Usages interdits

Il est interdit de télécharger, enregistrer, copier, rediffuser ou partager publiquement les contenus ; de contourner les mesures techniques de protection ou les restrictions territoriales ; de partager ses identifiants en dehors de son foyer ; d'utiliser le service à des fins commerciales ; de perturber son fonctionnement.

## 5. Demandes de contenus

Les membres Premium peuvent proposer des œuvres et voter. Une demande ne crée aucune obligation d'acquisition ni promesse de disponibilité. Les demandes contraires à la loi ou aux présentes conditions peuvent être masquées.

## 6. Suspension et résiliation

En cas de manquement grave aux présentes conditions, l'éditeur peut suspendre l'accès au compte après en avoir informé l'utilisateur, sauf urgence. Vous pouvez supprimer votre compte à tout moment depuis la page Confidentialité de votre compte.

## 7. Responsabilité

L'éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie d'absence d'interruption (maintenance, incident d'un prestataire, connexion de l'utilisateur).

## 8. Données personnelles

Le traitement des données est décrit dans la [politique de confidentialité](/legal/confidentialite).

## 9. Modification des conditions

Les conditions peuvent évoluer ; les utilisateurs sont informés des modifications substantielles avant leur entrée en vigueur.

## 10. Droit applicable

Droit applicable et juridiction compétente : **à déterminer selon le pays d'établissement de l'entité exploitante**, sans préjudice des règles protectrices du pays de résidence du consommateur.
`,
};

const cga: LegalDocument = {
  slug: "cga",
  title: "Conditions générales d'abonnement",
  updatedAt: "2026-10-31",
  body: `
## 1. Formules

Les formules en vigueur, leur prix et leur contenu sont présentés sur la page [Offres](/offres). Les prix sont exprimés et **facturés en euros (EUR)**, toutes taxes comprises lorsque la TVA est applicable. Toute conversion en dinars algériens affichée sur le site est **purement indicative** et n'est jamais utilisée pour facturer.

## 2. Abonnement Fondateur (phase de soutien)

- L'abonnement Fondateur est un **abonnement de soutien payant** destiné à financer la construction de la plateforme. Il ne constitue pas un don ouvrant droit à une réduction d'impôt.
- Pendant la phase fondatrice, il donne accès à l'espace membre, aux actualités du projet, au catalogue annoncé, à la liste de souhaits et aux seuls contenus légalement disponibles pour cette formule. **Il ne donne pas accès à un catalogue de films commerciaux tant que les droits correspondants n'ont pas été acquis.**
- **Tarif historique :** lors du lancement du catalogue Standard, les membres fondateurs dont l'abonnement est toujours actif bénéficient des fonctionnalités Standard au tarif de leur abonnement fondateur, **tant que cet abonnement reste actif sans interruption**. Ce tarif n'est jamais augmenté automatiquement au niveau du tarif Standard.
- Le tarif fondateur prend fin définitivement en cas de résiliation effective de l'abonnement, ou de changement volontaire de formule.

## 3. Souscription et paiement

Le paiement est réalisé par l'intermédiaire de notre prestataire de paiement sécurisé. L'accès est activé à réception de la confirmation du paiement par le prestataire, et non au simple retour sur le site.

## 4. Durée et renouvellement

L'abonnement est **mensuel, sans engagement**, et se **renouvelle automatiquement** à chaque échéance jusqu'à résiliation.

## 5. Échec de paiement

En cas d'échec de prélèvement, l'abonné est informé par email et dispose d'une **période de grâce de {{grace_period_days}} jours** pour mettre à jour son moyen de paiement, pendant laquelle l'accès est maintenu. Au-delà, l'accès aux contenus de la formule est suspendu.

## 6. Résiliation

L'abonné peut résilier à tout moment depuis son compte ou le portail de paiement. La résiliation prend effet à la fin de la période déjà payée ; aucun prélèvement ultérieur n'est effectué. Jusqu'à cette date, l'abonné peut réactiver son abonnement.

## 7. Changement de formule

Un changement de formule prend effet immédiatement ; la différence de prix pour la période en cours est calculée au prorata.

## 8. Évolution des prix

Toute évolution du prix d'une formule est notifiée au moins trente jours avant son application aux abonnements en cours, qui peuvent être résiliés sans frais. Ce mécanisme ne s'applique pas au tarif historique des fondateurs, qui est conservé dans les conditions de l'article 2.

## 9. Droit de rétractation

Les modalités du droit de rétractation applicable aux consommateurs (délai, exercice, éventuelle renonciation lorsque l'accès commence immédiatement à la demande expresse du consommateur) **doivent être précisées après validation juridique**, selon le pays d'établissement de l'entité exploitante et le pays de résidence de l'abonné.

## 10. Remboursements

Voir la [politique de remboursement](/legal/remboursement).

## 11. Réclamations et médiation

Réclamations : via le [formulaire de contact](/contact) (catégorie Facturation). Médiateur de la consommation : **à désigner** par l'entité exploitante.
`,
};

const privacy: LegalDocument = {
  slug: "confidentialite",
  title: "Politique de confidentialité",
  updatedAt: "2026-10-31",
  body: `
## Responsable du traitement

{{entity.name}}, {{entity.address}}. Contact pour toute question relative aux données personnelles : {{support_email}} ou la page [Mes données](/compte/confidentialite).

## Données traitées

| Catégorie | Exemples | Finalité | Base légale |
| --- | --- | --- | --- |
| Compte | email, nom affiché, langue | création et gestion du compte | contrat |
| Abonnement | formule, statut, factures (via le prestataire) | facturation | contrat, obligation légale |
| Visionnage | progression, historique, liste, profils | reprise de lecture, suggestions | contrat ; suggestions personnalisées désactivables |
| Territoire | pays déduit de l'adresse IP au moment de la lecture | respect des droits de diffusion | obligation contractuelle envers les ayants droit, intérêt légitime |
| Sécurité | empreinte non réversible de l'adresse IP, journaux | prévention des abus, sécurité | intérêt légitime |
| Consentement | choix relatifs aux cookies | preuve du consentement | obligation légale |
| Demandes Premium | œuvres proposées, votes | priorisation des acquisitions | contrat |

Aucune donnée de carte bancaire n'est stockée par Tamurt Vidéo : elles sont traitées directement par le prestataire de paiement.

## Destinataires et sous-traitants

Supabase (base de données, authentification, stockage), Vercel (hébergement de l'application), Cloudflare (diffusion vidéo), Stripe (paiements), le prestataire d'emails transactionnels configuré. Certains de ces prestataires peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par des clauses contractuelles types ou un mécanisme équivalent, **à documenter lors de la mise en production**.

## Durées de conservation

- Compte : jusqu'à sa suppression par l'utilisateur, ou après **3 ans d'inactivité** (proposition à valider).
- Historique de visionnage : supprimable à tout moment depuis le compte.
- Pièces comptables (factures) : durée légale applicable (par exemple 10 ans en France), sans lien avec le compte après sa suppression.
- Journaux de sécurité et de consentement : durée limitée à leur finalité (proposition : 13 mois).

## Vos droits

Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Vous pouvez exporter vos données et supprimer votre compte directement depuis la page [Confidentialité](/compte/confidentialite), ou formuler une demande que nous traitons dans un délai d'un mois. Vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente (par exemple la CNIL en France ; pour les personnes résidant en Algérie, l'Autorité nationale de protection des données à caractère personnel, conformément à la loi n° 18-07).

## Mineurs

Les profils enfants permettent de restreindre les contenus. La création d'un compte est réservée aux personnes majeures ou autorisées par leur représentant légal.

## Sécurité

Chiffrement des échanges (HTTPS), contrôle d'accès par rôles, cloisonnement des données en base (Row Level Security), double authentification disponible et exigée pour l'équipe d'administration, journalisation des actions sensibles.
`,
};

const cookies: LegalDocument = {
  slug: "cookies",
  title: "Politique de cookies",
  updatedAt: "2026-10-31",
  body: `
## Cookies indispensables (sans consentement)

| Nom | Finalité | Durée |
| --- | --- | --- |
| \`sb-*\` | session d'authentification | durée de la session, renouvelée |
| \`NEXT_LOCALE\` | langue de l'interface | 1 an |
| \`tv_profile\` | profil de visionnage actif | 1 an |
| \`tv_device\` | identification de l'appareil pour la limite d'écrans simultanés | 13 mois |
| \`tv_consent\` | mémorisation de vos choix de cookies | 6 mois |

## Cookies soumis à consentement

- **Mesure d'audience :** aucun outil n'est activé à ce jour.
- **Publicité :** des emplacements publicitaires peuvent être activés sur certaines pages publiques. Aucune régie n'est chargée sans votre consentement, et aucune publicité n'interrompt la lecture des abonnés payants.

## Gérer vos choix

Vous pouvez modifier vos choix à tout moment via le lien « Gérer les cookies » en bas de chaque page. Refuser est aussi simple qu'accepter.
`,
};

const refunds: LegalDocument = {
  slug: "remboursement",
  title: "Politique de remboursement",
  updatedAt: "2026-10-31",
  body: `
## Principe

L'abonnement est mensuel et sans engagement. Une résiliation prend effet à la fin de la période payée ; la période en cours n'est pas remboursée au prorata, l'accès restant ouvert jusqu'à son terme.

## Cas donnant lieu à remboursement

- erreur de facturation ou double prélèvement ;
- indisponibilité prolongée du service imputable à l'éditeur ;
- exercice du droit de rétractation, dans les conditions prévues par les [conditions générales d'abonnement](/legal/cga) ;
- toute autre situation appréciée au cas par cas par l'équipe.

## Procédure

Adressez votre demande via le [formulaire de contact](/contact) (catégorie Facturation) en précisant le numéro de facture. Les remboursements acceptés sont effectués sur le moyen de paiement d'origine, par l'intermédiaire du prestataire de paiement ; le délai d'apparition sur le relevé dépend de votre banque.
`,
};

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = Object.fromEntries(
  [mentions, cgu, cga, privacy, cookies, refunds].map((doc) => [doc.slug, doc]),
);
