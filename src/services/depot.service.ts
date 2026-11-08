import { apiRequest } from "@/lib/api-client"
import type {
  ApiDepot,
  ApiDepotOption,
  CreateDepotPayload,
  DepotsQuery,
  UpdateDepotPayload,
} from "@/types/api"

// Endpoints du module Dépôts (backend : src/depots). Un dépôt est un lieu de
// stockage rattaché à un seul point de vente. L'API scope automatiquement les
// admins à leur PO ; le superadmin voit tout et doit fournir `point_of_sale_id`
// à la création. `depot_code` est généré par le backend.

/** GET /depots (admin, superadmin) — liste paginée + recherche + filtre actif. */
export async function listDepots(query: DepotsQuery = {}) {
  const envelope = await apiRequest<ApiDepot[]>("/depots", { query })
  return {
    envelope,
    depots: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /depots/select — liste légère des dépôts actifs, triée par nom. */
export async function listDepotOptions() {
  const envelope = await apiRequest<ApiDepotOption[]>("/depots/select")
  return { envelope, options: envelope.data }
}

/** GET /depots/:id — détail d'un dépôt (404 hors périmètre PO). */
export async function getDepot(depot_id: string) {
  const envelope = await apiRequest<ApiDepot>(
    `/depots/${encodeURIComponent(depot_id)}`
  )
  return { envelope, depot: envelope.data }
}

/** POST /depots — crée un dépôt (code généré côté backend). */
export async function createDepot(payload: CreateDepotPayload) {
  const envelope = await apiRequest<ApiDepot>("/depots", {
    method: "POST",
    body: payload,
  })
  return { envelope, depot: envelope.data }
}

/** PATCH /depots/:id — met à jour partiellement un dépôt. */
export async function updateDepot(
  depot_id: string,
  payload: UpdateDepotPayload
) {
  const envelope = await apiRequest<ApiDepot>(
    `/depots/${encodeURIComponent(depot_id)}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, depot: envelope.data }
}

/** DELETE /depots/:id — supprime définitivement un dépôt. */
export async function deleteDepot(depot_id: string) {
  const envelope = await apiRequest<{ depot_id: string }>(
    `/depots/${encodeURIComponent(depot_id)}`,
    { method: "DELETE" }
  )
  return { envelope, depot_id: envelope.data.depot_id }
}
