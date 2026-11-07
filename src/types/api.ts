// Types reflétant le contrat de l'API IDS (voir docs/auth.md)

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_ATTEMPTS",
  "ACCOUNT_PENDING",
  "ACCOUNT_REJECTED",
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

/** Rôles exposés par l'API (`caisier` a été renommé `cashier`). */
export type ApiRole = "superadmin" | "admin" | "cashier"

/** Cycle de vie d'un compte : validation par le rôle supérieur. */
export type ApiUserStatus = "pending" | "active" | "rejected"

/** Utilisateur renvoyé par l'API — jamais de `user_password`. */
export type ApiUser = {
  user_id: string
  user_name: string
  user_mail: string
  user_phone?: string | null
  role: ApiRole
  user_is_active?: boolean
  user_status?: ApiUserStatus
  /** Point de vente de rattachement (admins et caissiers). */
  point_of_sale_id?: string | null
  created_by?: string | null
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

/**
 * POST /auth/admins (superadmin) — crée un admin `pending` rattaché à un point
 * de vente : soit existant (`point_of_sale_id`), soit créé à la volée
 * (`point_of_sale_nom`).
 */
export type CreateAdminPayload = {
  user_name: string
  user_mail: string
  user_password: string
  user_phone?: string
  point_of_sale_id?: string
  point_of_sale_nom?: string
}

export type ProfileUpdatePayload = {
  user_name?: string
  user_mail?: string
  user_password?: string
  user_phone?: string
}

// ——— Fournisseurs (module /suppliers) ———

/** Enum `suppliers_civility_enum` de l'API. */
export const SUPPLIER_CIVILITIES = ["Mr", "Mme", "Mdlle"] as const

export type ApiCivility = (typeof SUPPLIER_CIVILITIES)[number]

/** Fournisseur renvoyé par l'API (scopé au point de vente de l'admin). */
export type ApiSupplier = {
  supplier_id: string
  supplier_number: string
  suppliers_name: string
  suppliers_civility: ApiCivility
  suppliers_contact_name?: string | null
  suppliers_address?: string | null
  suppliers_telephone?: string | null
  suppliers_email?: string | null
  point_of_sale_id?: string | null
  created_at?: string
  updated_at?: string
}

export type SupplierSortField =
  | "supplier_number"
  | "suppliers_name"
  | "suppliers_contact_name"
  | "suppliers_email"
  | "created_at"

export type SuppliersQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: SupplierSortField
  sort_order?: "ASC" | "DESC"
}

/** Champs optionnels : `null` efface la valeur existante lors d'un PATCH. */
export type CreateSupplierPayload = {
  suppliers_name: string
  suppliers_civility: ApiCivility
  suppliers_contact_name?: string | null
  suppliers_address?: string | null
  suppliers_telephone?: string | null
  suppliers_email?: string | null
  point_of_sale_id?: string | null
}

export type UpdateSupplierPayload = Partial<
  CreateSupplierPayload & { supplier_number?: string }
>

// ——— Familles d'articles (module /article-families) ———

/** Famille d'articles renvoyée par l'API. `id` est un entier auto-généré. */
export type ApiArticleFamily = {
  id: number
  name: string
}

/** Entrée légère de `GET /article-families/select` (id + nom). */
export type ApiArticleFamilyOption = {
  id: number
  name: string
}

export type ArticleFamilySortField = "id" | "name"

export type ArticleFamiliesQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: ArticleFamilySortField
  sort_order?: "ASC" | "DESC"
}

/** `name` est requis à la création. */
export type CreateArticleFamilyPayload = {
  name: string
}

export type UpdateArticleFamilyPayload = Partial<CreateArticleFamilyPayload>
