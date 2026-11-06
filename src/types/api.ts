// Types reflétant le contrat de l'API IDS (voir docs/auth.md)

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "TOO_MANY_ATTEMPTS",
  "INVALID_RESET_TOKEN",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export type ApiErrorPayload = {
  code: ApiErrorCode | string
  details?: string
}

/** Enveloppe de réponse uniforme : `data` en succès, `error` en échec, jamais les deux. */
export type ApiEnvelope<T> = {
  data: T
  message: string
  status: number
  error: ApiErrorPayload | null
  meta?: ApiMeta | null
  signature: "IDS" | string
}

/** Rempli seulement pour les listes paginées. */
export type ApiMeta = {
  page: number
  limit: number
  total: number
}

export type ApiRole = "superadmin" | "admin" | "caisier"

/** Utilisateur renvoyé par l'API — jamais de `user_password`. */
export type ApiUser = {
  user_id: string
  user_name: string
  user_mail: string
  user_phone?: string | null
  role: ApiRole
  created_at?: string
  updated_at?: string
}

// ——— Payloads ———

export type RegisterPayload = {
  user_name: string
  user_mail: string
  /** ≥ 8 caractères, casse variée, chiffre, caractère spécial */
  user_password: string
  user_phone: string
}

export type LoginPayload = {
  user_mail: string
  user_password: string
}

export type RegisterResponse = {
  user: ApiUser
  access_token: string
}

export type LoginResponse = {
  user: ApiUser
  session_id: string
  access_token: string
  refresh_token: string
}

export type RefreshResponse = {
  access_token: string
}

export type UsersQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: "user_name" | "user_mail" | "user_phone" | "role" | "created_at"
  sort_order?: "ASC" | "DESC"
}

export type ProfileUpdatePayload = {
  user_name?: string
  user_mail?: string
  user_password?: string
  user_phone?: string
}
