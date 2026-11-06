// Errors from Google or Canva, and the French messages BDE members see instead.

export const ERR_DRIVE = "Le compte de service n'a pas accès au Drive partagé : ajoute-le comme Gestionnaire de contenu.";
export const ERR_TEMPLATE = 'Modèle introuvable : vérifie le lien dans Admin.';
export const ERR_CANVA_AUTH = 'Reconnecte Canva dans Admin.';
export const ERR_CANVA_REFUSED = 'Canva a refusé la création du dossier (droits ou offre) : crée-le à la main.';
export const ERR_NOT_CONFIGURED = 'Les modèles ne sont pas configurés : un admin doit les renseigner dans Admin.';
export const ERR_UNKNOWN = 'Une erreur inattendue est survenue. Réessaie, et si ça continue, préviens un admin.';

// A non-2xx answer from Google or Canva.
export class ApiError extends Error {
  constructor(service, status, body = null) {
    super(`${service} API error ${status}`);
    this.name = 'ApiError';
    this.service = service;
    this.status = status;
    this.body = body;
  }
}

// A failure whose message is already written for the user.
export class StepError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StepError';
  }
}

// context.what says what was being touched: the shared drive, or one of the two templates.
export function translateError(err, context = {}) {
  if (err instanceof StepError) return err.message;
  if (err instanceof ApiError) {
    if (err.service === 'canva') {
      if (err.status === 401) return ERR_CANVA_AUTH;
      if (err.status === 403 || err.status === 404) return ERR_CANVA_REFUSED;
      return ERR_UNKNOWN;
    }
    if (err.status === 403 || err.status === 404) {
      if (context.what === 'sheet_template' || context.what === 'declaration_template') return ERR_TEMPLATE;
      if (context.what === 'drive') return ERR_DRIVE;
    }
  }
  return ERR_UNKNOWN;
}
