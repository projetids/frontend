// Validation côté front, miroir des DTOs de l'API (docs/auth.md §7) :
// user_mail email valide, user_password ≥ 8 chars avec casse variée, chiffre, spécial.
//
// Deux niveaux sont exposés :
// - `validate*` : fonctions historiques renvoyant directement un message ;
// - `*Rule` : fabriques de règles composables avec `useFormValidation`.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_REGEX = /^\+?[0-9\s]{6,20}$/
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const DECIMAL_REGEX = /^\d+(?:[.,]\d+)?$/

const RULES = [
  { test: (pw: string) => pw.length >= 8, message: "au moins 8 caractères" },
  { test: (pw: string) => /[a-z]/.test(pw), message: "une minuscule" },
  { test: (pw: string) => /[A-Z]/.test(pw), message: "une majuscule" },
  { test: (pw: string) => /[0-9]/.test(pw), message: "un chiffre" },
  {
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    message: "un caractère spécial",
  },
] as const

/** Retourne null si le mot de passe est valide, sinon le message d'erreur. */
export function validatePassword(password: string): string | null {
  if (!password) return "Le mot de passe est requis."
  const missing = RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.message
  )
  if (missing.length === 0) return null
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} et ${missing[missing.length - 1]}`
  return `Le mot de passe doit contenir ${list}.`
}

/** Retourne null si l'email est valide, sinon le message d'erreur. */
export function validateEmail(email: string): string | null {
  if (!email) return "L'adresse e-mail est requise."
  return EMAIL_REGEX.test(email) ? null : "Adresse e-mail invalide."
}

/** Retourne null si le téléphone est valide (ou vide), sinon le message. */
export function validatePhone(phone: string, required = true): string | null {
  if (!phone) return required ? "Le numéro de téléphone est requis." : null
  return PHONE_REGEX.test(phone.trim()) ? null : "Numéro de téléphone invalide."
}

// ——— Règles composables pour `useFormValidation` ———

type Rule = (value: unknown) => string | null

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** Champ obligatoire (espaces ignorés). */
export function requiredRule(message = "Ce champ est requis."): Rule {
  return (value) => {
    if (value === null || value === undefined) return message
    if (typeof value === "string" && !value.trim()) return message
    return null
  }
}

/** E-mail valide ; un champ vide est ignoré (combiner avec `requiredRule`). */
export function emailRule(message = "Adresse e-mail invalide."): Rule {
  return (value) => {
    const text = asText(value)
    if (!text) return null
    return EMAIL_REGEX.test(text) ? null : message
  }
}

/** Téléphone valide ; un champ vide est ignoré. */
export function phoneRule(message = "Numéro de téléphone invalide."): Rule {
  return (value) => {
    const text = asText(value)
    if (!text) return null
    return PHONE_REGEX.test(text) ? null : message
  }
}

/** Mot de passe conforme au DTO ; vide → message « requis ». */
export function passwordRule(): Rule {
  return (value) => validatePassword(asText(value))
}

/** UUID valide ; un champ vide est ignoré. */
export function uuidRule(message = "Identifiant UUID invalide."): Rule {
  return (value) => {
    const text = asText(value)
    if (!text) return null
    return UUID_REGEX.test(text) ? null : message
  }
}

/** Nombre décimal positif (virgule ou point) ; un champ vide est ignoré. */
export function decimalRule(
  message = "Valeur numérique positive attendue (ex. 12.50)."
): Rule {
  return (value) => {
    const text = asText(value)
    if (!text) return null
    return DECIMAL_REGEX.test(text) ? null : message
  }
}

/** Longueur minimale (espaces compris, comme la saisie réelle). */
export function minLengthRule(
  length: number,
  message = `Ce champ doit contenir au moins ${length} caractères.`
): Rule {
  return (value) => (asText(value).length >= length ? null : message)
}

/** Longueur maximale. */
export function maxLengthRule(
  length: number,
  message = `Ce champ ne peut pas dépasser ${length} caractères.`
): Rule {
  return (value) => (asText(value).length <= length ? null : message)
}

/** Format imposé par une expression régulière ; vide ignoré. */
export function patternRule(
  pattern: RegExp,
  message = "Format invalide."
): Rule {
  return (value) => {
    const text = asText(value)
    if (!text) return null
    return pattern.test(text) ? null : message
  }
}

/**
 * Deux champs doivent être identiques (ex. confirmation de mot de passe).
 * Le second paramètre est le nom du champ de référence.
 */
export function sameAsRule<TValues extends Record<string, unknown>>(
  field: keyof TValues,
  message = "Les valeurs ne correspondent pas."
): (value: unknown, values: TValues) => string | null {
  return (value, values) => (value === values[field] ? null : message)
}
