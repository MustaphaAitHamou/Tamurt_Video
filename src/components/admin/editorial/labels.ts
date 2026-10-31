export const SECTION_SOURCE_LABELS: Record<string, string> = {
  popular: "Les plus regardés",
  new: "Nouveautés",
  collection: "Collection éditoriale",
  filter: "Sélection filtrée (genre, pays, langue…)",
  continue_watching: "Reprendre la lecture (personnel)",
  watchlist: "Ma liste (personnel)",
  recommended: "Recommandations (personnel)",
  coming_soon: "Prochainement",
};
export const SECTION_LAYOUT_LABELS: Record<string, string> = {
  poster: "Affiches",
  landscape: "Vignettes paysage",
  top10: "Top 10 numéroté",
  large: "Grand format",
};
export const AUDIENCE_LABELS: Record<string, string> = {
  all: "Tout le monde",
  visitors: "Visiteurs non connectés",
  members: "Membres connectés",
  subscribers: "Abonnés",
};
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<string, string> = {
  news: "Actualité",
  roadmap: "Feuille de route",
  partnership: "Partenariat",
  feature: "Nouvelle fonctionnalité",
  launch: "Lancement",
  catalog: "Catalogue",
};
export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<string, string> = {
  public: "Public",
  members: "Membres",
  subscribers: "Abonnés",
  founders: "Fondateurs",
};
export const ROADMAP_STATUS_LABELS: Record<string, string> = {
  planned: "Prévu",
  in_progress: "En cours",
  done: "Réalisé",
  paused: "En pause",
};
export const ROADMAP_CATEGORY_LABELS: Record<string, string> = {
  platform: "Plateforme",
  catalog: "Catalogue",
  apps: "Applications",
  community: "Communauté",
  business: "Modèle économique",
};

export { toParisInputValue as toLocalInput } from "@/lib/format";
