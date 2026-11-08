import type { ApiDepot } from "@/types/api"

// Libellés et helpers d'affichage du module Dépôts.

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatDepotDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Nom affichable : « Réserve principale · DEP-… ». */
export function depotDisplayName(depot: ApiDepot): string {
  return `${depot.depot_name} · ${depot.depot_code}`
}

/** Filtre de la liste : tous, actifs ou inactifs. */
export const DEPOT_STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
] as const

export type DepotStatusFilter = (typeof DEPOT_STATUS_OPTIONS)[number]["value"]

/** Convertit le filtre de statut en valeur `is_active` attendue par l'API. */
export function depotStatusToQuery(
  status: DepotStatusFilter
): boolean | undefined {
  if (status === "active") return true
  if (status === "inactive") return false
  return undefined
}
