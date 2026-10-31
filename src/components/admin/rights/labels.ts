/** Libellés de l'administration des droits (module partagé serveur/client). */
export const LICENSE_TYPE_LABELS: Record<string, string> = {
  owned_production: "Production propre",
  exclusive_license: "Licence exclusive",
  non_exclusive_license: "Licence non exclusive",
  public_domain_verified: "Domaine public (vérifié)",
  open_license: "Licence libre (ex. Creative Commons)",
  promotional: "Usage promotionnel",
};

export const LICENSE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  pending_signature: "En attente de signature",
  signed: "Signée",
  suspended: "Suspendue",
  terminated: "Résiliée",
};

export const MODE_LABELS: Record<string, string> = {
  svod: "Abonnement (SVOD)",
  avod: "Gratuit financé par la publicité (AVOD)",
  free: "Gratuit pour les membres",
  trailer: "Bande-annonce",
  promo: "Extraits promotionnels",
};

export const SUPPORT_LABELS: Record<string, string> = {
  web: "Web",
  mobile_app: "Application mobile",
  tv_app: "Application TV",
  download: "Téléchargement hors ligne",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: "Contrat",
  amendment: "Avenant",
  chain_of_title: "Chaîne des droits",
  public_domain_proof: "Preuve de domaine public",
  license_text: "Texte de licence",
  correspondence: "Correspondance",
  other: "Autre",
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  received: "Reçue",
  reviewing: "En examen",
  content_disabled: "Contenu retiré",
  rejected: "Rejetée",
  resolved: "Résolue",
};

export const CLAIM_TYPE_LABELS: Record<string, string> = {
  copyright: "Droit d'auteur",
  trademark: "Marque",
  privacy: "Vie privée / droit à l'image",
  defamation: "Diffamation",
  other: "Autre",
};
