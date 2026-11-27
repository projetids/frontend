import { apiRequest, refreshAccessToken } from "@/lib/api-client"
import { getAccessToken } from "@/lib/token-store"
import { API_URL } from "@/lib/env"
import type {
  ApiPointOfSale,
  ApiPointOfSaleSettings,
  CreatePointOfSalePayload,
  PointOfSalesQuery,
  UpdatePointOfSalePayload,
} from "@/types/api"

// Endpoints du module Points de vente (backend : src/point-of-sale).

/** GET /point-of-sales (admin, superadmin) — liste paginée + recherche. */
export async function listPointOfSales(query: PointOfSalesQuery = {}) {
  const envelope = await apiRequest<ApiPointOfSale[]>("/point-of-sales", { query })
  return {
    envelope,
    pointsOfSale: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /point-of-sales/select — liste légère. */
export async function listPointOfSaleOptions() {
  const envelope = await apiRequest<ApiPointOfSale[]>("/point-of-sales/select")
  return { envelope, options: envelope.data }
}

/** GET /point-of-sales/me/settings — TVA et marge par défaut du PO courant. */
export async function getMyPointOfSaleSettings() {
  const envelope = await apiRequest<ApiPointOfSaleSettings>(
    "/point-of-sales/me/settings"
  )
  return { envelope, settings: envelope.data }
}

/** GET /point-of-sales/:id — détail. */
export async function getPointOfSale(id: string) {
  const envelope = await apiRequest<ApiPointOfSale>(
    `/point-of-sales/${encodeURIComponent(id)}`
  )
  return { envelope, pointOfSale: envelope.data }
}

/** POST /point-of-sales — crée un point de vente. */
export async function createPointOfSale(payload: CreatePointOfSalePayload) {
  const envelope = await apiRequest<ApiPointOfSale>("/point-of-sales", {
    method: "POST",
    body: payload,
  })
  return { envelope, pointOfSale: envelope.data }
}

/** PATCH /point-of-sales/:id — met à jour partiellement. */
export async function updatePointOfSale(
  id: string,
  payload: UpdatePointOfSalePayload
) {
  const envelope = await apiRequest<ApiPointOfSale>(
    `/point-of-sales/${encodeURIComponent(id)}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, pointOfSale: envelope.data }
}

/** DELETE /point-of-sales/:id — supprime. */
export async function deletePointOfSale(id: string) {
  const envelope = await apiRequest<{ id?: string }>(
    `/point-of-sales/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
  return { envelope }
}

/** POST /point-of-sales/import — importe depuis Excel. */
export async function importPointOfSales(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  const envelope = await apiRequest<{ imported: number; errors: { row: number; field: string; message: string }[] }>(
    "/point-of-sales/import",
    { method: "POST", body: formData }
  )
  return {
    envelope,
    imported: envelope.data.imported,
    errors: envelope.data.errors,
  }
}

/** GET /point-of-sales/export — télécharge le fichier Excel. */
export async function exportPointOfSales(): Promise<Blob> {
  const url = `${API_URL}/point-of-sales/export`
  let token = getAccessToken()
  let response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      token = getAccessToken()
      response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    }
  }
  if (!response.ok) throw new Error("Export impossible")
  return response.blob()
}