// Validation côté front, miroir des DTOs de l'API (docs/auth.md §7) :
// user_mail email valide, user_password ≥ 8 chars avec casse variée, chiffre, spécial.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s]{6,20}$/

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
    (rule) => rule.message,
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
