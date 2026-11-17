import type { ApiArticleFamily, ApiArticleUnit } from "@/types/api"
import { DECIMAL_REGEX } from "@/lib/validation"

// Libellés et helpers d'affichage du module Articles.
// L'API renvoie les montants et quantités sous forme de chaînes décimales.

export const ARTICLE_UNIT_LABELS: Record<ApiArticleUnit, string> = {
  pièce: "Pièce",
  bouteille: "Bouteille",
  bac: "Bac",
  bocal: "Bocal",
  boîte: "Boîte",
  botte: "Botte",
  carafe: "Carafe",
  course: "Course",
  fft: "FFT",
  grs: "Grs",
  kg: "Kg",
  litre: "Litre",
  "mètre cube": "Mètre cube",
  paquet: "Paquet",
  portion: "Portion",
  pot: "Pot",
  sac: "Sac",
  sachet: "Sachet",
  seau: "Seau",
}

export const ARTICLE_UNIT_OPTIONS = (
  Object.keys(ARTICLE_UNIT_LABELS) as ApiArticleUnit[]
).map((value) => ({ value, label: ARTICLE_UNIT_LABELS[value] }))

export function articleUnitLabel(unit?: string): string {
  if (!unit) return "—"
  return ARTICLE_UNIT_LABELS[unit as ApiArticleUnit] ?? unit
}

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatArticleDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Quantité lisible (jusqu'à 3 décimales), « — » si absente ou invalide. */
export function formatArticleQuantity(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(parsed)
}

/** Montant lisible avec devise (Ariary), « — » si absent ou invalide. */
export function formatArticlePrice(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed)} Ariary`
}

/** Taux de TVA lisible : « 18 % ». */
export function formatArticleRate(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(parsed)} %`
}

/** Nom de la famille à partir de son identifiant (repli « #id »). */
export function articleFamilyLabel(
  families: ApiArticleFamily[],
  article_families_id: number
): string {
  const family = families.find(
    (item) => item.article_families_id === article_families_id
  )
  return family?.article_families_name ?? `#${article_families_id}`
}

/** Nom affichable : « Eau minérale · ART-001 ». */
export function articleDisplayName(article: {
  article_name: string
  article_code: string
}): string {
  return `${article.article_name} · ${article.article_code}`
}

/** Filtre de la liste : tous, publiés ou en veille. */
export const ARTICLE_STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "published", label: "Publiés" },
  { value: "unpublished", label: "En veille" },
] as const

export type ArticleStatusFilter =
  (typeof ARTICLE_STATUS_OPTIONS)[number]["value"]

/** Convertit le filtre de statut en valeur `is_publish` attendue par l'API. */
export function articleStatusToQuery(
  status: ArticleStatusFilter
): boolean | undefined {
  if (status === "published") return true
  if (status === "unpublished") return false
  return undefined
}

/**
 * Les champs numériques du DTO sont des `IsNumberString` : on accepte la
 * virgule française à la saisie puis on la convertit en point avant l'envoi.
 * Une valeur vide devient « 0 » (valeur par défaut côté API).
 */
export function normalizeDecimal(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "0"
  return trimmed.replace(",", ".")
}

/** Vrai si la saisie est un nombre décimal positif (virgule acceptée). */
export function isDecimalInput(value: string): boolean {
  return DECIMAL_REGEX.test(value.trim())
}
