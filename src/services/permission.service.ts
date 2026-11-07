import { apiRequest } from "@/lib/api-client"
import type {
  ApiPermission,
  ApiUserPermissions,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  UpdateUserPermissionsPayload,
} from "@/types/api"

// Endpoints du module Permissions utilisateur (backend : src/user-permissions).
// Le catalogue est dynamique et stocké en base ; les flags sont des paires
// (user_id, code) avec une valeur booléenne. Les routes de gestion des flags
// sont réservées aux rôles `ADMIN` (utilisateurs de son point de vente) et
// `SUPERADMIN` (tout utilisateur). Un caissier ne peut lire que ses propres
// flags via `/auth/profile/permissions`.

/** GET /permissions/catalog — catalogue complet (tous les rôles authentifiés). */
export async function listPermissionCatalog() {
  const envelope = await apiRequest<ApiPermission[]>("/permissions/catalog")
  return { envelope, permissions: envelope.data }
}

/** POST /permissions/catalog — crée une permission (SUPERADMIN). */
export async function createPermission(payload: CreatePermissionPayload) {
  const envelope = await apiRequest<ApiPermission>("/permissions/catalog", {
    method: "POST",
    body: payload,
  })
  return { envelope, permission: envelope.data }
}

/** PATCH /permissions/catalog/:code — met à jour une permission (SUPERADMIN). */
export async function updatePermission(
  code: string,
  payload: UpdatePermissionPayload
) {
  const envelope = await apiRequest<ApiPermission>(
    `/permissions/catalog/${encodeURIComponent(code)}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, permission: envelope.data }
}

/** DELETE /permissions/catalog/:code — supprime la permission et ses flags. */
export async function deletePermission(code: string) {
  const envelope = await apiRequest<{ code?: string } | null>(
    `/permissions/catalog/${encodeURIComponent(code)}`,
    { method: "DELETE" }
  )
  return { envelope, code: envelope.data?.code ?? code }
}

/** GET /auth/profile/permissions — flags effectifs de l'utilisateur connecté. */
export async function getProfilePermissions() {
  const envelope = await apiRequest<ApiUserPermissions>(
    "/auth/profile/permissions"
  )
  return { envelope, permissions: envelope.data }
}

/** GET /users/:id/permissions — flags effectifs d'un utilisateur cible. */
export async function getUserPermissions(userId: string) {
  const envelope = await apiRequest<ApiUserPermissions>(
    `/users/${encodeURIComponent(userId)}/permissions`
  )
  return { envelope, permissions: envelope.data }
}

/**
 * PUT /users/:id/permissions — merge partiel des flags. Seuls les codes
 * transmis sont modifiés ; la réponse contient les flags effectifs complets.
 */
export async function updateUserPermissions(
  userId: string,
  payload: UpdateUserPermissionsPayload
) {
  const envelope = await apiRequest<ApiUserPermissions>(
    `/users/${encodeURIComponent(userId)}/permissions`,
    { method: "PUT", body: payload }
  )
  return { envelope, permissions: envelope.data }
}
