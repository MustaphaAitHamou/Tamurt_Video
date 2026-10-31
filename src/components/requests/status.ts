export const REQUEST_STATUS_VARIANT: Record<string, "muted" | "gold" | "success" | "destructive" | "outline"> = {
  received: "muted",
  under_review: "outline",
  rights_search: "outline",
  negotiation: "gold",
  acquisition_confirmed: "success",
  publication_planned: "success",
  available: "success",
  rejected: "destructive",
  impossible: "destructive",
};

/** Libellés français des statuts (administration ; l'interface publique passe par next-intl). */
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  received: "Demande reçue",
  under_review: "En étude",
  rights_search: "Recherche des ayants droit",
  negotiation: "Négociation",
  acquisition_confirmed: "Acquisition confirmée",
  publication_planned: "Publication prévue",
  available: "Disponible",
  rejected: "Refusée",
  impossible: "Impossible à acquérir",
};

/** Statuts réservés aux personnes habilitées à confirmer une acquisition de droits. */
export const ACQUISITION_STATUSES = new Set(["acquisition_confirmed", "publication_planned", "available"]);
