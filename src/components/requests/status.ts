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
