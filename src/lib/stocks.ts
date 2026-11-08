import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiMouvementRefType,
  ApiMouvementStockType,
  ApiStockMovement,
} from "@/types/api"

// Libellés et helpers d'affichage du module Stock. Les quantités sont des
// décimales (3 chiffres maximum) : entrées positives, sorties négatives.

export const MOUVEMENT_TYPE_LABELS: Record<ApiMouvementStockType, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  AJUSTEMENT_POS: "Ajustement positif",
  AJUSTEMENT_NEG: "Ajustement négatif",
  INVENTAIRE: "Inventaire",
  TRANSFERT_SORTIE: "Transfert sortant",
  TRANSFERT_ENTREE: "Transfert entrant",
}

export const MOUVEMENT_TYPE_OPTIONS = (
  Object.keys(MOUVEMENT_TYPE_LABELS) as ApiMouvementStockType[]
).map((value) => ({ value, label: MOUVEMENT_TYPE_LABELS[value] }))

export const MOUVEMENT_REF_LABELS: Record<ApiMouvementRefType, string> = {
  BON_ENTREE: "Bon d'entrée",
  BON_SORTIE: "Bon de sortie",
  INVENTAIRE: "Inventaire",
  TRANSFERT: "Transfert",
  ACHAT_BR: "Achat (BR)",
  VENTE_BL: "Vente (BL)",
  VENTE_COMPTANT: "Vente comptant",
  MANUEL: "Manuel",
}

export const MOUVEMENT_REF_OPTIONS = (
  Object.keys(MOUVEMENT_REF_LABELS) as ApiMouvementRefType[]
).map((value) => ({ value, label: MOUVEMENT_REF_LABELS[value] }))

/** Libellé d'un type de mouvement (repli sur la valeur brute). */
export function mouvementTypeLabel(type?: string): string {
  if (!type) return "—"
  return MOUVEMENT_TYPE_LABELS[type as ApiMouvementStockType] ?? type
}

/** Libellé d'un type de référence (repli sur la valeur brute). */
export function mouvementRefTypeLabel(refType?: string): string {
  if (!refType) return "—"
  return MOUVEMENT_REF_LABELS[refType as ApiMouvementRefType] ?? refType
}

/** Vrai si le type a un effet sortant (quantité négative). */
export function isOutflowType(type: string): boolean {
  return (
    type === "SORTIE" ||
    type === "AJUSTEMENT_NEG" ||
    type === "TRANSFERT_SORTIE"
  )
}

function toNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Quantité lisible (jusqu'à 3 décimales), « — » si absente ou invalide. */
export function formatStockQuantity(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(parsed)
}

/** Quantité signée : « +10 » pour une entrée, « −5 » pour une sortie. */
export function formatSignedStockQuantity(
  value?: string | number | null
): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  const formatted = formatStockQuantity(parsed)
  return parsed > 0 ? `+${formatted}` : formatted
}

/** Date et heure françaises, « — » si la valeur est absente ou invalide. */
export function formatStockDateTime(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Identifiant raccourci pour les références non résolues. */
export function shortStockId(value?: string | null): string {
  if (!value) return "—"
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

/** Libellé d'article : « Eau minérale · ART-001 », repli sur l'identifiant. */
export function stockArticleLabel(
  articles: ApiArticleOption[],
  article_id: string
): string {
  const article = articles.find((item) => item.article_id === article_id)
  if (!article) return `Article ${shortStockId(article_id)}`
  return `${article.article_name} · ${article.article_code}`
}

/** Libellé de dépôt : « Réserve principale · DEP-… », repli sur l'identifiant. */
export function stockDepotLabel(
  depots: ApiDepotOption[],
  depot_id: string
): string {
  const depot = depots.find((item) => item.depot_id === depot_id)
  if (!depot) return `Dépôt ${shortStockId(depot_id)}`
  return `${depot.depot_name} · ${depot.depot_code}`
}

export type StockStateTone = "positive" | "zero" | "negative"

/** Tonalité d'une ligne d'état de stock (badge et couleur de la quantité). */
export function stockStateTone(qty: number): StockStateTone {
  if (qty > 0) return "positive"
  if (qty < 0) return "negative"
  return "zero"
}

/** Libellé du statut d'une ligne d'état de stock. */
export function stockStateLabel(qty: number): string {
  const tone = stockStateTone(qty)
  if (tone === "positive") return "En stock"
  if (tone === "negative") return "Négatif"
  return "Rupture"
}

/** Référence document lisible : type + identifiant court éventuel. */
export function movementReference(movement: ApiStockMovement): string {
  const label = mouvementRefTypeLabel(movement.ref_type)
  return movement.ref_id ? `${label} · ${shortStockId(movement.ref_id)}` : label
}
