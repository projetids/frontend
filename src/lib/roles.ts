import type { ApiRole, ApiUserStatus } from "@/types/api"

// Libellés affichés pour les rôles et statuts renvoyés par l'API
// (docs/auth.md §5 : superadmin, admin, cashier).
export const ROLE_LABELS: Record<ApiRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  cashier: "Caissier",
}

export const STATUS_LABELS: Record<ApiUserStatus, string> = {
  pending: "En attente",
  active: "Actif",
  rejected: "Rejeté",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as ApiRole] ?? role
}

export function statusLabel(status?: string): string {
  if (!status) return "—"
  return STATUS_LABELS[status as ApiUserStatus] ?? status
}

/** Variante de badge associée à chaque statut de compte. */
export function statusBadgeVariant(
  status: ApiUserStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default"
    case "rejected":
      return "destructive"
    case "pending":
    default:
      return "outline"
  }
}
