import type { ApiPointOfSale } from "@/types/api"

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatPointOfSaleDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Nom affichable : « Boutique Centre-Ville · POS-… ». */
export function pointOfSaleDisplayName(pos: ApiPointOfSale): string {
  return `${pos.name} · ${pos.point_of_sale_code}`
}