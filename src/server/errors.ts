import { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: FieldErrors };

export function success<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function failure(
  error: string,
  code?: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return { ok: false, error, code, fieldErrors };
}

export function fromZodError(
  error: z.ZodError,
  message = "Certains champs sont invalides.",
): ActionResult<never> {
  return failure(message, "VALIDATION", z.flattenError(error).fieldErrors as FieldErrors);
}

/** Erreur applicative avec un code stable, traduite en message lisible par l'appelant. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
    public readonly status = 400,
  ) {
    super(message ?? code);
    this.name = "AppError";
  }
}

type DbError = { code?: string; message?: string; details?: string | null } | null | undefined;

/**
 * Extrait un code métier d'une erreur PostgreSQL / PostgREST. Les fonctions
 * SQL lèvent des exceptions « CODE: message » (voir supabase/migrations).
 */
export function dbErrorCode(error: DbError): string | undefined {
  if (!error) return undefined;
  if (error.code === "42501") return "FORBIDDEN";
  if (error.code === "P0002") return "NOT_FOUND";
  if (error.code === "23505") return "ALREADY_EXISTS";
  if (error.code === "23514") return "CONSTRAINT";
  if (error.code === "23503") return "REFERENCE";
  if (error.code === "PGRST116") return "NOT_FOUND";
  const match = error.message?.match(/^([A-Z][A-Z_]+)(?::|$)/);
  return match?.[1];
}

const DB_MESSAGES: Record<string, string> = {
  FORBIDDEN: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  NOT_FOUND: "Élément introuvable.",
  ALREADY_EXISTS: "Cet élément existe déjà.",
  CONSTRAINT: "Les données ne respectent pas les règles de validation.",
  REFERENCE: "Cet élément est encore utilisé ailleurs.",
  PUBLICATION_REQUIRES_VALID_LICENSE:
    "Publication impossible : une licence signée, en cours de validité et couvrant au moins un territoire est requise.",
  DUPLICATE_REQUEST: "Cette œuvre a déjà été demandée : votez pour la demande existante.",
  REQUEST_LIMIT: "Vous avez atteint le nombre maximal de demandes pour cette période.",
  PROFILE_LIMIT: "Votre formule ne permet pas de créer davantage de profils.",
  LAST_ADMIN: "Impossible de retirer le dernier administrateur.",
  SELF_SUSPENSION: "Vous ne pouvez pas suspendre votre propre compte.",
  DEFAULT_PROFILE: "Le profil principal ne peut pas être modifié de cette manière.",
  LINKED_TITLE_REQUIRED: "Associez d'abord l'œuvre publiée à cette demande.",
  UNKNOWN_PRICE: "Prix inconnu : synchronisez les formules avec le prestataire de paiement.",
  INVALID_AMOUNT: "Montant invalide.",
  INVALID_END_DATE: "La date de fin doit être dans le futur.",
  REASON_REQUIRED: "Un motif est obligatoire.",
};

export function dbErrorMessage(
  error: DbError,
  fallback = "Une erreur est survenue. Réessayez plus tard.",
): string {
  const code = dbErrorCode(error);
  return (code && DB_MESSAGES[code]) || fallback;
}

export function failureFromDb(error: DbError, fallback?: string): ActionResult<never> {
  return failure(dbErrorMessage(error, fallback), dbErrorCode(error));
}
