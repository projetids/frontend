import type { ApiPermission } from "@/types/api"

// Helpers d'affichage du module Permissions utilisateur.

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatPermissionDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Valeur effective d'un flag : la valeur enregistrée si elle existe, sinon la
 * valeur par défaut du catalogue (`default_enabled`).
 */
export function effectiveFlag(
  permission: ApiPermission,
  flags: Record<string, boolean>
): boolean {
  return flags[permission.code] ?? permission.default_enabled
}

/** Nombre de permissions activées pour un utilisateur. */
export function countEnabledPermissions(
  permissions: ApiPermission[],
  flags: Record<string, boolean>
): number {
  return permissions.reduce(
    (count, permission) => count + (effectiveFlag(permission, flags) ? 1 : 0),
    0
  )
}

/** Normalise un jeu de flags en complétant les codes absents du catalogue. */
export function normalizeFlags(
  permissions: ApiPermission[],
  flags: Record<string, boolean>
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...flags }
  for (const permission of permissions) {
    if (!(permission.code in next)) {
      next[permission.code] = permission.default_enabled
    }
  }
  return next
}

/** Différence entre deux jeux de flags (seuls les codes modifiés sont inclus). */
export function diffFlags(
  permissions: ApiPermission[],
  next: Record<string, boolean>,
  previous: Record<string, boolean>
): Record<string, boolean> {
  const nextFlags = normalizeFlags(permissions, next)
  const previousFlags = normalizeFlags(permissions, previous)
  const changed: Record<string, boolean> = {}

  for (const code of new Set([
    ...Object.keys(nextFlags),
    ...Object.keys(previousFlags),
  ])) {
    if (nextFlags[code] !== previousFlags[code]) {
      changed[code] = nextFlags[code]
    }
  }

  return changed
}
