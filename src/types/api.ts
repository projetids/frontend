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

/** Le numéro est généré par le backend : il n'est jamais modifiable. */
export type UpdateSupplierPayload = Partial<CreateSupplierPayload>

// ——— Familles d'articles (module /article-families) ———

/** Famille d'articles renvoyée par l'API (colonnes préfixées). */
export type ApiArticleFamily = {
  article_families_id: number
  article_families_name: string
}

export type ArticleFamilySortField = "id" | "name"

export type ArticleFamiliesQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: ArticleFamilySortField
  sort_order?: "ASC" | "DESC"
}

/** `article_families_name` est requis à la création. */
export type CreateArticleFamilyPayload = {
  article_families_name: string
}

export type UpdateArticleFamilyPayload = Partial<CreateArticleFamilyPayload>

// ——— Dépôts (module /depots) ———

/**
 * Dépôt = lieu de stockage logistique rattaché à un point de vente. Le
 * `depot_code` est généré par le backend (`DEP-<12 hex>`), jamais fourni.
 */
export type ApiDepot = {
  depot_id: string
  depot_code: string
  depot_name: string
  depot_address?: string | null
  depot_description?: string | null
  is_active: boolean
  point_of_sale_id: string
  created_at?: string
  updated_at?: string
}

/** Réponse légère de `GET /depots/select` (sélecteurs). */
export type ApiDepotOption = {
  depot_id: string
  depot_name: string
  depot_code: string
  point_of_sale_id: string
  is_active: boolean
}

export type DepotSortField =
  "depot_code" | "depot_name" | "is_active" | "created_at"

export type DepotsQuery = {
  page?: number
  limit?: number
  search?: string
  is_active?: boolean
  sort_by?: DepotSortField
  sort_order?: "ASC" | "DESC"
}

/**
 * `point_of_sale_id` est requis pour un SUPERADMIN et ignoré pour un ADMIN
 * (l'API force alors le PO du compte).
 */
export type CreateDepotPayload = {
  depot_name: string
  depot_address?: string | null
  depot_description?: string | null
  is_active?: boolean
  point_of_sale_id?: string
}

export type UpdateDepotPayload = Partial<CreateDepotPayload>

// ——— Clients (module /clients) ———

/** Client rattaché à un point de vente (scopé pour les admins). */
export type ApiClient = {
  client_id: string
  point_of_sale_id: string
  client_name: string
  client_telephone?: string | null
  client_matricule?: string | null
  client_corps?: string | null
  client_grade?: string | null
  created_at?: string
  updated_at?: string
}

/** Réponse légère de `GET /clients/select` (sélecteurs de vente). */
export type ApiClientOption = {
  client_id: string
  client_name: string
  client_telephone?: string | null
  point_of_sale_id: string
}

export type ClientSortField = "client_name" | "client_matricule" | "created_at"

export type ClientsQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: ClientSortField
  sort_order?: "ASC" | "DESC"
}

/**
 * `point_of_sale_id` est requis pour un SUPERADMIN et ignoré pour un ADMIN
 * (l'API force alors le PO du compte). Les champs optionnels acceptent `null`
 * pour effacer une valeur existante lors d'un PATCH.
 */
export type CreateClientPayload = {
  client_name: string
  client_telephone?: string | null
  client_matricule?: string | null
  client_corps?: string | null
  client_grade?: string | null
  point_of_sale_id?: string
}

export type UpdateClientPayload = Partial<CreateClientPayload>

// ——— Articles (module /articles) ———

/** Unité de vente d'un article (enum `article_unit_enum` côté API). */
export type ApiArticleUnit = "pièce" | "bouteille" | "bac" | "bocal" | "boîte" | "botte" | "bouteille" | "carafe" | "course" | "fft" | "grs" | "kg" | "litre" | "mètre cube" | "paquet" | "pièce" | "portion" | "pot" | "sac" | "sachet" | "seau"

/**
 * Article du catalogue, rattaché à un point de vente. Les montants et les
 * quantités sont renvoyés sous forme de chaînes décimales (`"12.50"`).
 */
export type ApiArticle = {
  article_id: string
  point_of_sale_id: string
  is_publish: boolean
  article_code: string
  article_name: string
  article_unit: ApiArticleUnit
  article_families_id: number
  article_barcode?: string | null
  article_tva_rate: string
  article_purchase_price_ht: string
  article_purchase_price_ttc: string
  article_margin: string
  article_sale_price_ht: string
  article_sale_price_ttc: string
  article_theoretical_stock: string
  article_reserved_qty: string
  article_available_qty: string
  article_location?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

/** Réponse légère de `GET /articles/select` (articles publiés). */
export type ApiArticleOption = {
  article_id: string
  article_code: string
  article_name: string
  point_of_sale_id: string
  is_publish: boolean
  article_unit: ApiArticleUnit
}

export type ArticleSortField = "article_code" | "article_name" | "created_at"

export type ArticlesQuery = {
  page?: number
  limit?: number
  search?: string
  article_families_id?: number
  is_publish?: boolean
  sort_by?: ArticleSortField
  sort_order?: "ASC" | "DESC"
}

/**
 * `point_of_sale_id` est requis pour un SUPERADMIN et ignoré pour un ADMIN
 * (l'API force alors le PO du compte). Les champs libres optionnels acceptent
 * `null` pour effacer une valeur existante lors d'un PATCH ; les montants et
 * quantités restent des chaînes décimales.
 *
 * `article_code` est **généré par le serveur** (3 premiers caractères du nom +
 * suffixe numérique par POS) : il ne doit jamais être envoyé, ni à la création
 * ni en modification.
 */
export type CreateArticlePayload = {
  is_publish?: boolean
  article_name: string
  article_unit: ApiArticleUnit
  article_families_id: number
  article_barcode?: string | null
  article_tva_rate?: string
  article_purchase_price_ht?: string
  article_purchase_price_ttc?: string
  article_margin?: string
  article_sale_price_ht?: string
  article_sale_price_ttc?: string
  article_theoretical_stock?: string
  article_reserved_qty?: string
  article_available_qty?: string
  article_location?: string | null
  point_of_sale_id?: string
}

export type UpdateArticlePayload = Partial<CreateArticlePayload>

// ——— Stock (module /stock) ———

/** Enum `mouvement_stock_type_enum` de l'API. */
export const MOUVEMENT_STOCK_TYPES = [
  "ENTREE",
  "SORTIE",
  "AJUSTEMENT_POS",
  "AJUSTEMENT_NEG",
  "INVENTAIRE",
  "TRANSFERT_SORTIE",
  "TRANSFERT_ENTREE",
] as const

export type ApiMouvementStockType = (typeof MOUVEMENT_STOCK_TYPES)[number]

/** Enum `mouvement_ref_type_enum` de l'API (document à l'origine du mouvement). */
export const MOUVEMENT_REF_TYPES = [
  "BON_ENTREE",
  "BON_SORTIE",
  "INVENTAIRE",
  "TRANSFERT",
  "ACHAT_BR",
  "VENTE_BL",
  "VENTE_COMPTANT",
  "MANUEL",
] as const

export type ApiMouvementRefType = (typeof MOUVEMENT_REF_TYPES)[number]

/**
 * Mouvement de stock (journal append-only). `qty` est la quantité **signée**
 * renvoyée sous forme de chaîne décimale : positive pour une entrée, négative
 * pour une sortie.
 */
export type ApiStockMovement = {
  mouvement_id: string
  article_id: string
  depot_id: string
  point_of_sale_id: string
  type: ApiMouvementStockType
  qty: string
  ref_type: ApiMouvementRefType
  ref_id?: string | null
  motif?: string | null
  movement_date: string
  created_by?: string | null
  created_at?: string
}

/**
 * Ligne de l'état de stock théorique (`GET /stock/etat`) : agrégat des
 * mouvements par article × dépôt. Contrairement aux mouvements, `qty` est un
 * nombre déjà additionné par l'API.
 */
export type ApiStockStateRow = {
  article_id: string
  depot_id: string
  point_of_sale_id: string
  qty: number
}

export type MouvementsQuery = {
  page?: number
  limit?: number
  article_id?: string
  depot_id?: string
  type?: ApiMouvementStockType
  ref_type?: ApiMouvementRefType
  /** Date ISO de début (`movement_date >=`). */
  date_from?: string
  /** Date ISO de fin (`movement_date <=`). */
  date_to?: string
  sort_by?: "movement_date" | "created_at"
  sort_order?: "ASC" | "DESC"
}

export type StockStateQuery = {
  article_id?: string
  depot_id?: string
  /** Filtre réservé au SUPERADMIN (ignoré pour un ADMIN). */
  point_of_sale_id?: string
}

/** Ligne d'un bon d'entrée ou de sortie (`qty` > 0, le signe est déduit). */
export type CreateStockBonLinePayload = {
  article_id: string
  qty: number
  motif?: string
}

/** Corps de `POST /stock/bons-entree` et `POST /stock/bons-sortie`. */
export type CreateStockBonPayload = {
  depot_id: string
  motif?: string
  ref_id?: string
  lines: CreateStockBonLinePayload[]
}

/** Réponse 201 des bons : mouvements créés dans la transaction. */
export type CreateStockBonResponse = {
  depot_id: string
  count: number
  movements: ApiStockMovement[]
}

// ——— Permissions utilisateur (module /permissions) ———

/**
 * Entrée du catalogue dynamique `permission_catalog`. `code` est la clé
 * métier (ex. `A01`, `A61`) ; `reserved` et `default_enabled` pilotent les
 * valeurs proposées par défaut, `is_active` l'application de la permission.
 */
export type ApiPermission = {
  code: string
  label_fr: string
  reserved: boolean
  default_enabled: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** Flags effectifs d'un utilisateur : un booléen pour chaque code du catalogue. */
export type ApiUserPermissions = {
  user_id: string
  flags: Record<string, boolean>
}

export type PermissionCatalogSortField = "code" | "label_fr" | "created_at"

export type PermissionsCatalogQuery = {
  search?: string
  sort_by?: PermissionCatalogSortField
  sort_order?: "ASC" | "DESC"
}

/** POST /permissions/catalog — `is_active` démarre à `true` côté API. */
export type CreatePermissionPayload = {
  code: string
  label_fr: string
  reserved?: boolean
  default_enabled?: boolean
}

/** PATCH /permissions/catalog/:code — le code est immuable. */
export type UpdatePermissionPayload = Partial<{
  label_fr: string
  reserved: boolean
  default_enabled: boolean
  is_active: boolean
}>

/** PUT /users/:id/permissions — merge partiel strict (codes connus uniquement). */
export type UpdateUserPermissionsPayload = {
  flags: Record<string, boolean>
}
