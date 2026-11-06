import type { ApiRole } from "@/types/api"

// Libellés affichés pour les rôles renvoyés par l'API (docs/auth.md §5).
export const ROLE_LABELS: Record<ApiRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  caisier: "Caissier",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as ApiRole] ?? role
}
