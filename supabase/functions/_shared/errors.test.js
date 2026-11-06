import {
  ApiError, StepError, translateError,
  ERR_DRIVE, ERR_TEMPLATE, ERR_CANVA_AUTH, ERR_CANVA_REFUSED, ERR_UNKNOWN,
} from './errors.js';

test('Google access problems on the shared drive', () => {
  expect(translateError(new ApiError('google', 404), { what: 'drive' })).toBe(ERR_DRIVE);
  expect(translateError(new ApiError('google', 403), { what: 'drive' })).toBe(ERR_DRIVE);
});

test('missing templates', () => {
  expect(translateError(new ApiError('google', 404), { what: 'sheet_template' })).toBe(ERR_TEMPLATE);
  expect(translateError(new ApiError('google', 404), { what: 'declaration_template' })).toBe(ERR_TEMPLATE);
});

test('Canva', () => {
  expect(translateError(new ApiError('canva', 401))).toBe(ERR_CANVA_AUTH);
  expect(translateError(new ApiError('canva', 403))).toBe(ERR_CANVA_REFUSED);
});

test('step errors pass through, the rest is generic', () => {
  expect(translateError(new StepError('Message précis.'))).toBe('Message précis.');
  expect(translateError(new TypeError('boom'))).toBe(ERR_UNKNOWN);
  expect(translateError(new ApiError('google', 500), { what: 'drive' })).toBe(ERR_UNKNOWN);
});

test('exact French copy', () => {
  expect(ERR_DRIVE).toBe("Le compte de service n'a pas accès au Drive partagé : ajoute-le comme Gestionnaire de contenu.");
  expect(ERR_TEMPLATE).toBe('Modèle introuvable : vérifie le lien dans Admin.');
  expect(ERR_CANVA_AUTH).toBe('Reconnecte Canva dans Admin.');
});
