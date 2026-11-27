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
  /** Point de vente résolu (renvoyé par GET /auth/profile). */
  point_of_sale?: {
    id: string
    point_of_sale_code: string
    name: string
  } | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
  password_changed_at?: string | null
  /** Indique si l'utilisateur doit changer son mot de passe (première connexion). */
  must_change_password?: boolean
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
  must_change_password?: boolean
}

/** Caisse encore ouverte renvoyée par `/auth/logout` (caissier). */
export type ApiOpenCashSession = {
  session_id: string
  session_code: string
  business_date: string
  opened_at: string
}

export type LogoutResponse = {
  open_cash_session: ApiOpenCashSession | null
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
  /** Nom du POS associé, renvoyé par `GET /depots` (2026-11-27). */
  point_of_sale_name?: string | null
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

// ——— Points de vente (module /point-of-sales) ———

/** Point de vente renvoyé par l'API. */
export type ApiPointOfSale = {
  id: string
  point_of_sale_code: string
  name: string
  address?: string | null
  description?: string | null
  created_at?: string
}

export type PointOfSalesQuery = {
  page?: number
  limit?: number
  search?: string
  sort_by?: "point_of_sale_code" | "name" | "address" | "created_at"
  sort_order?: "ASC" | "DESC"
}

export type CreatePointOfSalePayload = {
  point_of_sale_name: string
  point_of_sale_code?: string
  address?: string | null
  description?: string | null
}

export type UpdatePointOfSalePayload = Partial<CreatePointOfSalePayload>

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
export type ApiArticleUnit =
  | "piece"
  | "bouteille"
  | "gramme"
  | "kg"
  | "boite"
  | "sachet"
  | "botte"
  | "bocal"

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
  /** Taux de marge (%) utilisé pour calculer le prix de vente. */
  article_margin_rate: string
  /** Montant de marge calculé (PV HT − PA HT), non saisissable. */
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

/** Réponse légère de `GET /articles/select` (articles publiés, écran de caisse). */
export type ApiArticleOption = {
  article_id: string
  article_code: string
  article_name: string
  point_of_sale_id: string
  is_publish: boolean
  article_unit: ApiArticleUnit
  /** Champs ajoutés au sélecteur pour la vente au comptant. */
  article_barcode?: string | null
  article_tva_rate?: string
  article_sale_price_ht?: string
  article_sale_price_ttc?: string
  article_available_qty?: string
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
  article_margin_rate?: string
  article_purchase_price_ht?: string
  article_purchase_price_ttc?: string
  /** Champ calculé par l'API : la valeur envoyée est ignorée. */
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

/** Résultat de `POST /articles/import`. */
export type ImportArticlesResult = {
  imported: number
  skipped: number
  families_created: { article_families_id: number; article_families_name: string }[]
  errors: { row: number; message: string }[]
  entity: string
}

/** Corps de `POST /articles/pricing/preview` (calcul sans écriture). */
export type ArticlePricingPreviewPayload = {
  article_tva_rate?: string | number
  article_margin_rate?: string | number
  article_purchase_price_ht?: string | number
  article_purchase_price_ttc?: string | number
  article_sale_price_ht?: string | number
  article_sale_price_ttc?: string | number
  point_of_sale_id?: string
}

/** Valeurs calculées par l'API, renvoyées en chaînes décimales. */
export type ApiArticlePrices = {
  article_tva_rate: string
  article_margin_rate: string
  article_purchase_price_ht: string
  article_purchase_price_ttc: string
  article_sale_price_ht: string
  article_sale_price_ttc: string
  article_margin: string
}

export type ApiArticlePricingPreview = {
  point_of_sale_id: string | null
  defaults: { default_tva_rate: string; default_margin_rate: string }
  prices: ApiArticlePrices
}

/** Paramètres du point de vente courant (`GET /point-of-sales/me/settings`). */
export type ApiPointOfSaleSettings = {
  point_of_sale_id?: string | null
  default_tva_rate: string
  default_margin_rate: string
  palette_id?: string | null
}

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

// ——— Achats (module /achats) ———

/** Enum `commande_achat_status_enum` de l'API. */
export const COMMANDE_ACHAT_STATUSES = [
  "BROUILLON",
  "VALIDEE",
  "PARTIELLE",
  "CLOTUREE",
  "ANNULEE",
] as const

export type ApiCommandeAchatStatus =
  (typeof COMMANDE_ACHAT_STATUSES)[number]

/** Enum `bon_reception_status_enum` de l'API. */
export const BON_RECEPTION_STATUSES = ["VALIDE", "ANNULE"] as const

export type ApiBonReceptionStatus =
  (typeof BON_RECEPTION_STATUSES)[number]

/** Enum `facture_achat_status_enum` de l'API. */
export const FACTURE_ACHAT_STATUSES = [
  "BROUILLON",
  "VALIDEE",
  "ANNULEE",
] as const

export type ApiFactureAchatStatus =
  (typeof FACTURE_ACHAT_STATUSES)[number]

/** Ligne d'un bon de commande achat (quantités et prix en chaînes décimales). */
export type ApiCommandeAchatLigne = {
  ligne_id: string
  commande_id: string
  article_id: string
  /** numeric(12,3) — quantité commandée. */
  qty_ordered: string
  /** numeric(12,3) — quantité déjà reçue. */
  qty_received: string
  /** numeric(12,2) — prix unitaire HT. */
  unit_price_ht: string
}

/** Bon de commande achat (BCA) — engagement fournisseur, sans impact stock. */
export type ApiCommandeAchat = {
  commande_id: string
  commande_code: string
  supplier_id: string
  point_of_sale_id: string
  status: ApiCommandeAchatStatus
  expected_date?: string | null
  notes?: string | null
  created_by?: string | null
  validated_at?: string | null
  created_at?: string
  updated_at?: string
  /** Présent uniquement sur GET /achats/commandes/:id. */
  lignes?: ApiCommandeAchatLigne[]
}

/** Ligne d'un bon de réception (BR) — chaque ligne génère une ENTRÉE stock. */
export type ApiBonReceptionLigne = {
  ligne_id: string
  reception_id: string
  article_id: string
  /** Ligne du bon de commande source (suivi des réceptions partielles). */
  commande_ligne_id?: string | null
  /** numeric(12,3) — quantité reçue. */
  qty_received: string
  /** numeric(12,2) — prix unitaire HT. */
  unit_price_ht: string
}

/** Bon de réception achat — alimente le stock du dépôt choisi. */
export type ApiBonReception = {
  reception_id: string
  reception_code: string
  commande_id?: string | null
  supplier_id: string
  depot_id: string
  point_of_sale_id: string
  status: ApiBonReceptionStatus
  notes?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /achats/receptions/:id. */
  lignes?: ApiBonReceptionLigne[]
}

/** Ligne d'une facture d'achat (document financier, sans impact stock). */
export type ApiFactureAchatLigne = {
  ligne_id: string
  facture_id: string
  article_id: string
  /** numeric(12,3) — quantité facturée. */
  qty: string
  /** numeric(12,2) — prix unitaire HT. */
  unit_price_ht: string
}

/** Facture d'achat (FAA) — rapprochement optionnel BC/BR. */
export type ApiFactureAchat = {
  facture_id: string
  facture_code: string
  supplier_invoice_ref?: string | null
  commande_id?: string | null
  reception_id?: string | null
  supplier_id: string
  point_of_sale_id: string
  status: ApiFactureAchatStatus
  invoice_date?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /achats/factures/:id. */
  lignes?: ApiFactureAchatLigne[]
}

/** Filtres communs des listes d'achats (paginées et scopées POS). */
export type AchatsListQuery = {
  page?: number
  limit?: number
  /** Réservé au SUPERADMIN : filtre global sur le point de vente. */
  point_of_sale_id?: string
  supplier_id?: string
  commande_id?: string
}


/** Filtres des rapports d'achats (factures `VALIDEE` uniquement). */
export type AchatsReportQuery = {
  date_from?: string
  date_to?: string
  /** Réservé au SUPERADMIN : filtre global sur le point de vente. */
  point_of_sale_id?: string
  article_families_id?: number
}


// ——— Transferts (module /transferts) ———

export const TRANSFERT_STATUSES = ["VALIDE", "ANNULE"] as const
export type ApiTransfertStatus = (typeof TRANSFERT_STATUSES)[number]

/** Ligne d'un transfert. */
export type ApiTransfertLigne = {
  ligne_id: string
  transfert_id: string
  article_id: string
  qty: string | number
}

/** Transfert de stock entre dépôts. */
export type ApiTransfert = {
  transfert_id: string
  transfert_code: string
  depot_source_id: string
  depot_cible_id: string
  pos_source_id: string
  pos_cible_id: string
  is_inter_pos: boolean
  status: ApiTransfertStatus
  commentaire?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /transferts/:id. */
  lignes?: ApiTransfertLigne[]
}

/** Filtres des listes de transferts (paginées). */
export type TransfertsListQuery = {
  page?: number
  limit?: number
  point_of_sale_id?: string
}

export type CreateTransfertLinePayload = {
  article_id: string
  qty: number
}

export type CreateTransfertPayload = {
  depot_source_id: string
  depot_cible_id: string
  commentaire?: string
  lines: CreateTransfertLinePayload[]
}

// ——— Inventaires (module /inventaires) ———


export const INVENTAIRE_STATUSES = ["BROUILLON", "VALIDE", "ANNULE"] as const
export type ApiInventaireStatus = (typeof INVENTAIRE_STATUSES)[number]

/** Ligne d'un inventaire (théorique snapshot + compté + écart). */
export type ApiInventaireLigne = {
  ligne_id: string
  inventaire_id: string
  article_id: string
  qty_theorique: string | number
  qty_comptee: string | number
  ecart: string | number
}

/** Inventaire physique sur un dépôt. */
export type ApiInventaire = {
  inventaire_id: string
  inventaire_code: string
  depot_id: string
  point_of_sale_id: string
  status: ApiInventaireStatus
  commentaire?: string | null
  validated_at?: string | null
  validated_by?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
  /** Présent uniquement sur GET /inventaires/:id. */
  lignes?: ApiInventaireLigne[]
}

/** Filtres des listes d'inventaires (paginées et scopées POS). */
export type InventairesListQuery = {
  page?: number
  limit?: number
  depot_id?: string
  status?: ApiInventaireStatus
}

export type CreateInventaireLinePayload = {
  article_id: string
  qty_comptee: number
}

export type CreateInventairePayload = {
  depot_id: string
  commentaire?: string
  lines: CreateInventaireLinePayload[]
}

export type CreateCommandeAchatLinePayload = {
  article_id: string
  qty_ordered: number
  unit_price_ht?: number
}

export type CreateCommandeAchatPayload = {
  supplier_id: string
  point_of_sale_id?: string
  /** Date ISO courte (`YYYY-MM-DD`). */
  expected_date?: string
  notes?: string
  lines: CreateCommandeAchatLinePayload[]
}

export type CreateBonReceptionLinePayload = {
  article_id: string
  qty_received: number
  commande_ligne_id?: string
  unit_price_ht?: number
}

export type CreateBonReceptionPayload = {
  commande_id?: string
  supplier_id: string
  depot_id: string
  point_of_sale_id?: string
  notes?: string
  lines: CreateBonReceptionLinePayload[]
}

export type CreateFactureAchatLinePayload = {
  article_id: string
  qty: number
  unit_price_ht?: number
}

export type CreateFactureAchatPayload = {
  supplier_id: string
  commande_id?: string
  reception_id?: string
  supplier_invoice_ref?: string
  /** Date ISO courte (`YYYY-MM-DD`). */
  invoice_date?: string
  point_of_sale_id?: string
  notes?: string
  lines: CreateFactureAchatLinePayload[]
}

/**
 * Ligne agrégée d'un rapport d'achat. `total_qty` et `total_ht` proviennent de
 * `SUM(...)` : PostgreSQL les renvoie en chaînes décimales.
 */
export type ApiAchatReportRow = {
  article_id?: string
  article_name?: string
  article_families_id?: number | string
  total_qty: string | number
  total_ht: string | number
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

// ——— Ventes (module /ventes) ———

/** Enum `commande_vente_status_enum` de l'API. */
export const COMMANDE_VENTE_STATUSES = [
  "BROUILLON",
  "VALIDEE",
  "PARTIELLEMENT_LIVREE",
  "LIVREE",
  "FACTUREE",
  "CLOTUREE",
  "ANNULEE",
] as const
export type ApiCommandeVenteStatus =
  (typeof COMMANDE_VENTE_STATUSES)[number]

/** Enum `bon_livraison_status_enum` de l'API. */
export const BON_LIVRAISON_STATUSES = ["VALIDE", "ANNULE"] as const
export type ApiBonLivraisonStatus =
  (typeof BON_LIVRAISON_STATUSES)[number]

/** Enum `vente_comptant_status_enum` de l'API. */
export const VENTE_COMPTANT_STATUSES = ["VALIDEE", "ANNULEE"] as const
export type ApiVenteComptantStatus =
  (typeof VENTE_COMPTANT_STATUSES)[number]

/** Enum `mode_paiement_enum` de l'API. */
export const MODE_PAIEMENT = [
  "ESPECES",
  "MOBILE_MONEY",
  "CARTE",
  "VIREMENT",
  "CHEQUE",
  "AUTRE",
] as const
export type ApiModePaiement = (typeof MODE_PAIEMENT)[number]

/** Ligne d'une commande vente (BCV, 0 impact stock). */
export type ApiCommandeVenteLigne = {
  ligne_id: string
  commande_id: string
  article_id: string
  qty_ordered: string
  qty_delivered: string
  unit_price_ht: string
}

/** Bon de commande vente — engagement, sans impact stock. */
export type ApiCommandeVente = {
  commande_id: string
  commande_code: string
  client_id?: string | null
  supplier_id?: string | null
  point_of_sale_id: string
  status: ApiCommandeVenteStatus
  notes?: string | null
  created_by?: string | null
  validated_at?: string | null
  created_at?: string
  updated_at?: string
  /** Présent uniquement sur GET /ventes/commandes/:id. */
  lignes?: ApiCommandeVenteLigne[]
}

/** Ligne d'un bon de livraison (BL → SORTIE stock). */
export type ApiBonLivraisonLigne = {
  ligne_id: string
  livraison_id: string
  article_id: string
  commande_ligne_id?: string | null
  qty_delivered: string
  unit_price_ht: string
}

/** Bon de livraison — SORTIE stock dépôt source. */
export type ApiBonLivraison = {
  livraison_id: string
  livraison_code: string
  commande_id?: string | null
  client_id?: string | null
  depot_id: string
  point_of_sale_id: string
  status: ApiBonLivraisonStatus
  notes?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /ventes/livraisons/:id. */
  lignes?: ApiBonLivraisonLigne[]
}

/** Ligne d'une vente au comptant (VC → SORTIE stock, BL implicite).
 * Les montants TTC et la TVA sont calculés par l'API (décimales en chaînes). */
export type ApiVenteComptantLigne = {
  ligne_id: string
  vente_id: string
  article_id: string
  qty: string
  unit_price_ht: string
  unit_price_ttc: string
  tva_rate: string
  montant_ht: string
  montant_tva: string
  montant_ttc: string
}

/** Vente au comptant — encaissement + SORTIE stock à validation. */
export type ApiVenteComptant = {
  vente_id: string
  vente_code: string
  client_id?: string | null
  depot_id: string
  point_of_sale_id: string
  /** Session de caisse du caissier ; `null` pour une vente ADMIN/SUPERADMIN. */
  caisse_session_id?: string | null
  status: ApiVenteComptantStatus
  mode_paiement: ApiModePaiement
  montant_total_ht: string
  montant_tva: string
  montant_ttc: string
  montant_encaisse: string
  monnaie_rendue: string
  /** Renseigné dès qu'une facture a été émise depuis cette vente. */
  facture_id?: string | null
  annulee_at?: string | null
  annulee_par?: string | null
  motif_annulation?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /ventes/comptant/:id. */
  lignes?: ApiVenteComptantLigne[]
}

/** Réponse légère de `GET /clients/select` (sélecteurs de vente). */
export type ApiClientOptionVente = {
  client_id: string
  client_name: string
  client_telephone?: string | null
  point_of_sale_id: string
}

/** Filtres communs des listes de ventes (paginées et scopées POS). */
export type VentesListQuery = {
  page?: number
  limit?: number
  point_of_sale_id?: string
  client_id?: string
  commande_id?: string
  /** Filtre ajouté par le module Caisses (ventes rattachées à une session). */
  caisse_session_id?: string
}

export type CreateCommandeVenteLinePayload = {
  article_id: string
  qty_ordered: number
  unit_price_ht?: number
}

export type CreateCommandeVentePayload = {
  client_id?: string
  point_of_sale_id?: string
  notes?: string
  lines: CreateCommandeVenteLinePayload[]
}

export type CreateBonLivraisonLinePayload = {
  article_id: string
  qty_delivered: number
  commande_ligne_id?: string
  unit_price_ht?: number
}

export type CreateBonLivraisonPayload = {
  commande_id?: string
  client_id?: string
  depot_id: string
  point_of_sale_id?: string
  notes?: string
  lines: CreateBonLivraisonLinePayload[]
}

export type CreateVenteComptantLinePayload = {
  article_id: string
  qty: number
  /** PU TTC saisi ; l'API le déduit du PV TTC de l'article si absent. */
  unit_price_ttc?: number
}

export type CreateVenteComptantPayload = {
  client_id?: string
  depot_id: string
  point_of_sale_id?: string
  /** Optionnel : le caissier est toujours rattaché à sa caisse ouverte du jour
   * (409 si la session envoyée n'est pas la sienne). Ignoré pour un admin. */
  caisse_session_id?: string
  mode_paiement?: ApiModePaiement
  /** Doit être >= TTC calculé par l'API ; défaut = TTC. */
  montant_encaisse?: number
  notes?: string
  lines: CreateVenteComptantLinePayload[]
}

/** Annulation d'une vente au comptant (admin/superadmin, A40 + A31). */
export type AnnulerVenteComptantPayload = {
  /** 3 à 1000 caractères. */
  motif: string
}

/** Enum `facture_vente_status_enum` de l'API. */
export const FACTURE_VENTE_STATUSES = ["VALIDEE", "ANNULEE"] as const
export type ApiFactureVenteStatus = (typeof FACTURE_VENTE_STATUSES)[number]
export type ApiFactureVenteSource = "COMPTANT" | "LIVRAISON"

/** Ligne de facture de vente : prix et TVA figés à l'émission. */
export type ApiFactureVenteLigne = {
  ligne_id: string
  facture_id: string
  article_id: string
  livraison_id?: string | null
  article_code: string
  designation: string
  qty: string
  unit_price_ht: string
  unit_price_ttc: string
  tva_rate: string
  montant_ht: string
  montant_tva: string
  montant_ttc: string
}

/** Facture de vente (FAV) — numérotation par POS et par année. */
export type ApiFactureVente = {
  facture_id: string
  facture_code: string
  facture_year: number
  facture_number: number
  point_of_sale_id: string
  point_of_sale_name?: string | null
  client_id?: string | null
  source: ApiFactureVenteSource
  vente_id?: string | null
  status: ApiFactureVenteStatus
  invoice_date: string
  mode_paiement?: ApiModePaiement | null
  montant_ht: string
  montant_tva: string
  montant_ttc: string
  notes?: string | null
  created_by?: string | null
  created_at?: string
  /** Présent uniquement sur GET /ventes/factures/:id. */
  lignes?: ApiFactureVenteLigne[]
  client?: { client_id: string; client_name: string } | null
  point_of_sale?: { point_of_sale_id: string; point_of_sale_name: string } | null
}

export type FacturesVenteListQuery = {
  page?: number
  limit?: number
  client_id?: string
  source?: ApiFactureVenteSource
  date_from?: string
  date_to?: string
  search?: string
  point_of_sale_id?: string
}

/** Exactement un de `vente_id` ou `livraison_ids` doit être fourni. */
export type CreateFactureVentePayload = {
  vente_id?: string
  livraison_ids?: string[]
  invoice_date?: string
  notes?: string
}

export type VenteReportGranularite = "jour" | "semaine" | "mois"
export type VenteReportSource = "tous" | "comptant" | "livraison"

export type VenteReportPeriodeQuery = {
  granularite?: VenteReportGranularite
  date_from?: string
  date_to?: string
  source?: VenteReportSource
  cashier_id?: string
  article_families_id?: number
}

export type VenteReportTotaux = {
  nb_ventes: number
  total_ht: string
  total_tva: string
  total_ttc: string
  panier_moyen_ttc: string
}

export type ApiVenteReportPeriode = VenteReportTotaux & {
  periode: string
  periode_fin?: string
  label: string
  par_mode?: Record<string, { nb_ventes: number; total_ttc: string }>
}

export type ApiVentesReportPeriodes = {
  granularite: VenteReportGranularite
  date_from: string
  date_to: string
  source?: VenteReportSource
  totaux: VenteReportTotaux
  periodes: ApiVenteReportPeriode[]
}

export type VenteReportParCaissierQuery = {
  date_from?: string
  date_to?: string
  granularite?: VenteReportGranularite
  cashier_id?: string
  point_of_sale_id?: string
}

export type ApiVenteCaissierReport = {
  user_id: string
  user_name: string
  role: string
  nb_ventes: number
  total_ht: string
  total_tva: string
  total_ttc: string
  total_encaisse_net: string
  panier_moyen_ttc: string
  par_mode?: Record<string, { nb_ventes: number; total_ttc: string }>
  annulations?: { nb: number; total_ttc: string }
  caisses?: {
    nb_sessions: number
    sessions_ouvertes: number
    ecart_total: string
    manques_total: string
  }
  periodes?: { periode: string; nb_ventes: number; total_ttc: string }[]
}

export type ApiVentesReportParCaissier = {
  date_from: string
  date_to: string
  granularite?: VenteReportGranularite
  caissiers: ApiVenteCaissierReport[]
}

/** Filtres des rapports de ventes (CA BL + ventes comptant validées). */
export type VentesReportQuery = {
  date_from?: string
  date_to?: string
  point_of_sale_id?: string
  article_families_id?: string
}

/**
 * Ligne agrégée d'un rapport de vente. `total_qty` et `total_ht` proviennent
 * de `SUM(...)` : PostgreSQL les renvoie en chaînes décimales.
 */
export type ApiVenteReportRow = {
  article_id?: string
  article_name?: string
  article_families_id?: number | string
  total_qty: string | number
  total_ht: string | number
}

// ——— Stats / tableau de bord (module /stats) ———

/** Filtres partagés par les endpoints `/stats/*`. */
export type StatsQuery = {
  date_from?: string
  date_to?: string
  point_of_sale_id?: string
}

export type ApiStatsPeriod = {
  date_from: string | null
  date_to: string | null
}

export type ApiStatsDashboard = {
  ventes: {
    total_ht: string | number
    total_ttc: string | number
    nb_ventes: number
  }
  stock: {
    nb_articles: number
    valeur_stock_achat: string | number
    stock_bas: number
  }
  utilisateurs: {
    total: number
    par_role: { role: ApiRole; count: number }[]
  }
  period: ApiStatsPeriod
}

export type ApiStatsVentes = {
  total_ht: string | number
  total_ttc: string | number
  nb_ventes: number
  par_moyen_paiement: {
    mode_paiement: ApiModePaiement
    total_ht: string | number
    count: number
  }[]
  ventes_recentes: {
    vente_id: string
    vente_code: string
    montant_ttc: string | number
    created_at: string
  }[]
  period: ApiStatsPeriod
}

export type ApiStatsStock = {
  nb_articles: number
  valeur_stock_achat: string | number
  valeur_stock_vente: string | number
  stock_bas: number
  point_of_sale_id: string | null
}

export type ApiStatsUtilisateurs = {
  total: number
  par_role: { role: ApiRole; count: number }[]
  point_of_sale_id: string | null
}

// ——— Caisses (module /caisses) ———

export const CAISSE_SESSION_STATUSES = ["OUVERTE", "FERMEE"] as const
export type ApiCaisseSessionStatus = (typeof CAISSE_SESSION_STATUSES)[number]

/** Totaux figés à la fermeture, calculés à la volée tant que la caisse est ouverte. */
export type ApiCaisseModeTotal = {
  nb_ventes: number
  total_ttc: string
  total_encaisse: string
}

export type ApiCaisseTotauxParMode = Partial<
  Record<ApiModePaiement, ApiCaisseModeTotal>
>

export type ApiCaisseSession = {
  session_id: string
  session_code: string
  cashier_id: string
  point_of_sale_id: string
  business_date: string
  status: ApiCaisseSessionStatus
  opened_at: string
  fond_ouverture: string
  notes_ouverture?: string | null
  closed_at?: string | null
  closed_by?: string | null
  montant_compte?: string | null
  montant_theorique_especes?: string | null
  ecart?: string | null
  nb_ventes: number
  total_ttc: string
  total_encaisse: string
  totaux_par_mode: ApiCaisseTotauxParMode
  notes_fermeture?: string | null
  /** Vrai si la caisse est restée ouverte depuis un jour précédent. */
  is_previous_day?: boolean
}

export type CaisseSessionsQuery = {
  date?: string
  status?: ApiCaisseSessionStatus
  cashier_id?: string
  point_of_sale_id?: string
  page?: number
  limit?: number
}

export type OpenCaisseSessionPayload = {
  fond_ouverture: number | string
  notes?: string
}

export type CloseCaisseSessionPayload = {
  /** Montant compté, fond de caisse inclus. */
  montant_compte: number | string
  notes?: string
}

export type ApiCaisseDailyReportSession = {
  session_id: string
  session_code: string
  cashier_id: string
  cashier_name?: string
  status: ApiCaisseSessionStatus
  opened_at: string
  closed_at?: string | null
  fond_ouverture: string
  nb_ventes: number
  total_ttc: string
  total_encaisse: string
  montant_theorique_especes?: string | null
  montant_compte?: string | null
  ecart?: string | null
  totaux_par_mode: ApiCaisseTotauxParMode
}

export type ApiCaisseDailyReport = {
  point_of_sale_id: string
  business_date: string
  sessions_ouvertes: number
  totaux: {
    nb_ventes: number
    total_ttc: string
    total_encaisse: string
    ecart_total: string
    totaux_par_mode: ApiCaisseTotauxParMode
  }
  sessions: ApiCaisseDailyReportSession[]
}
