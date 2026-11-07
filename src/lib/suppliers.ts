import type { ApiCivility, ApiSupplier } from "@/types/api"

// Libellés et helpers d'affichage du module Fournisseurs.
// L'API stocke la civilité dans l'enum `Mr` / `Mme` / `Mdlle`.

export const CIVILITY_LABELS: Record<ApiCivility, string> = {
  Mr: "M.",
  Mme: "Mme",
  Mdlle: "Mlle",
}

export const CIVILITY_OPTIONS = (
  Object.keys(CIVILITY_LABELS) as ApiCivility[]
).map((value) => ({ value, label: CIVILITY_LABELS[value] }))

export function civilityLabel(civility?: string): string {
  if (!civility) return "—"
  return CIVILITY_LABELS[civility as ApiCivility] ?? civility
}

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatSupplierDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Nom affichable : « ACME Distribution · Jean Martin » si un contact existe. */
export function supplierDisplayName(supplier: ApiSupplier): string {
  return supplier.contact_name
    ? `${supplier.name} · ${supplier.contact_name}`
    : supplier.name
}
