import type { ApiClient } from "@/types/api"

// Libellés et helpers d'affichage du module Clients.

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatClientDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Nom affichable : « Client Alpha · MAT-001 » si un matricule existe. */
export function clientDisplayName(client: ApiClient): string {
  return client.client_matricule
    ? `${client.client_name} · ${client.client_matricule}`
    : client.client_name
}

/** Initiales utilisées dans l'avatar de la fiche client. */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
