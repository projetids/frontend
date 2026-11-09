import {
  formatSignedStockQuantity,
  formatStockDateTime,
  formatStockQuantity,
  stockArticleLabel,
  stockDepotLabel,
} from "@/lib/stocks"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiInventaireStatus,
} from "@/types/api"

// Libellés et helpers d'affichage du module Inventaires. Un inventaire est une
// session de comptage physique sur un dépôt : la validation enregistre les
// écarts (quantité comptée − quantité théorique) sous forme de mouvements
// d'ajustement append-only.

export const INVENTAIRE_STATUS_LABELS: Record<ApiInventaireStatus, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  ANNULE: "Annulé",
}

export const INVENTAIRE_STATUS_OPTIONS = (
  Object.keys(INVENTAIRE_STATUS_LABELS) as ApiInventaireStatus[]
).map((value) => ({ value, label: INVENTAIRE_STATUS_LABELS[value] }))

/** Libellé d'un statut d'inventaire (repli sur la valeur brute). */
export function inventaireStatusLabel(status?: string): string {
  if (!status) return "—"
  return INVENTAIRE_STATUS_LABELS[status as ApiInventaireStatus] ?? status
}

/** Variante de badge associée à un statut d'inventaire. */
export function inventaireStatusBadgeVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status as ApiInventaireStatus | undefined) {
    case "VALIDE":
      return "default"
    case "ANNULE":
      return "destructive"
    case "BROUILLON":
    default:
      return "outline"
  }
}

/** Quantité lisible (jusqu'à 3 décimales), « — » si absente ou invalide. */
export function formatInventaireQuantity(
  value?: string | number | null
): string {
  return formatStockQuantity(value)
}

/**
 * Écart signé : « +10 » quand le comptage dépasse le théorique, « −5 » quand il
 * est inférieur. Utilise le même format que le journal des mouvements de stock.
 */
export function formatInventaireGap(value?: string | number | null): string {
  return formatSignedStockQuantity(value)
}

/** Date et heure françaises, « — » si la valeur est absente ou invalide. */
export function formatInventaireDateTime(value?: string | null): string {
  return formatStockDateTime(value ?? undefined)
}

/** Libellé d'article : « Eau minérale · ART-001 », repli sur l'identifiant. */
export function inventaireArticleLabel(
  articles: ApiArticleOption[],
  article_id: string
): string {
  return stockArticleLabel(articles, article_id)
}

/** Libellé de dépôt : « Réserve principale · DEP-… », repli sur l'identifiant. */
export function inventaireDepotLabel(
  depots: ApiDepotOption[],
  depot_id: string
): string {
  return stockDepotLabel(depots, depot_id)
}
