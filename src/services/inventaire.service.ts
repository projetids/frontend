import { apiRequest } from "@/lib/api-client"
import type {
  ApiInventaire,
  CreateInventairePayload,
  InventairesListQuery,
} from "@/types/api"

function fallbackMeta(data: ApiInventaire[], query: InventairesListQuery) {
  return {
    page: 1,
    limit: query.limit ?? 20,
    total: data.length,
  }
}

export async function createInventaire(payload: CreateInventairePayload) {
  const envelope = await apiRequest<ApiInventaire>("/inventaires", {
    method: "POST",
    body: payload,
  })
  return { envelope, inventaire: envelope.data }
}

export async function listInventaires(query: InventairesListQuery = {}) {
  const envelope = await apiRequest<ApiInventaire[]>("/inventaires", { query })
  return {
    envelope,
    inventaires: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

export async function getInventaire(inventaire_id: string) {
  const envelope = await apiRequest<ApiInventaire>(
    `/inventaires/${encodeURIComponent(inventaire_id)}`
  )
  return { envelope, inventaire: envelope.data }
}