import { apiRequest } from "@/lib/api-client"
import type {
  ApiClient,
  ApiClientOption,
  ClientsQuery,
  CreateClientPayload,
  UpdateClientPayload,
} from "@/types/api"

// Endpoints du module Clients (backend : src/clients). Un client est rattaché à
// un point de vente : l'API scope automatiquement les admins à leur PO, tandis
// que le superadmin voit tout et doit fournir `point_of_sale_id` à la création.
// Les routes `PATCH`/`DELETE` répondent 404 quand le client est hors périmètre.

/** GET /clients (admin, superadmin) — liste paginée + recherche. */
export async function listClients(query: ClientsQuery = {}) {
  const envelope = await apiRequest<ApiClient[]>("/clients", { query })
  return {
    envelope,
    clients: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /clients/select — liste légère triée par nom (sélecteurs de vente). */
export async function listClientOptions() {
  const envelope = await apiRequest<ApiClientOption[]>("/clients/select")
  return { envelope, options: envelope.data }
}

/** GET /clients/:id — détail d'un client (404 hors périmètre PO). */
export async function getClient(client_id: string) {
  const envelope = await apiRequest<ApiClient>(
    `/clients/${encodeURIComponent(client_id)}`
  )
  return { envelope, client: envelope.data }
}

/** POST /clients — crée un client. */
export async function createClient(payload: CreateClientPayload) {
  const envelope = await apiRequest<ApiClient>("/clients", {
    method: "POST",
    body: payload,
  })
  return { envelope, client: envelope.data }
}

/** PATCH /clients/:id — met à jour partiellement un client. */
export async function updateClient(
  client_id: string,
  payload: UpdateClientPayload
) {
  const envelope = await apiRequest<ApiClient>(
    `/clients/${encodeURIComponent(client_id)}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, client: envelope.data }
}

/** DELETE /clients/:id — supprime définitivement un client. */
export async function deleteClient(client_id: string) {
  const envelope = await apiRequest<{ client_id: string }>(
    `/clients/${encodeURIComponent(client_id)}`,
    { method: "DELETE" }
  )
  return { envelope, client_id: envelope.data.client_id }
}
