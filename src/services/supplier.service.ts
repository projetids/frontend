import { apiRequest } from "@/lib/api-client"
import type {
  ApiSupplier,
  CreateSupplierPayload,
  SuppliersQuery,
  UpdateSupplierPayload,
} from "@/types/api"

// Endpoints du module Fournisseurs (backend : src/suppliers). L'API restreint
// automatiquement les admins à leur point de vente ; le superadmin voit tout.
// `PATCH`/`DELETE` répondent 404 quand le fournisseur est hors périmètre.

/** GET /suppliers (admin, superadmin) — liste paginée + filtres. */
export async function listSuppliers(query: SuppliersQuery = {}) {
  const envelope = await apiRequest<ApiSupplier[]>("/suppliers", { query })
  return {
    envelope,
    suppliers: envelope.data,
    meta: envelope.meta ?? { page: 1, limit: query.limit ?? 20, total: envelope.data.length },
  }
}

/** GET /suppliers/:id (admin, superadmin) — fiche d'un fournisseur. */
export async function getSupplier(supplier_id: string) {
  const envelope = await apiRequest<ApiSupplier>(
    `/suppliers/${encodeURIComponent(supplier_id)}`,
  )
  return { envelope, supplier: envelope.data }
}

/** POST /suppliers (admin, superadmin) — crée un fournisseur. */
export async function createSupplier(payload: CreateSupplierPayload) {
  const envelope = await apiRequest<ApiSupplier>("/suppliers", {
    method: "POST",
    body: payload,
  })
  return { envelope, supplier: envelope.data }
}

/** PATCH /suppliers/:id (admin, superadmin) — met à jour une fiche. */
export async function updateSupplier(
  supplier_id: string,
  payload: UpdateSupplierPayload,
) {
  const envelope = await apiRequest<ApiSupplier>(
    `/suppliers/${encodeURIComponent(supplier_id)}`,
    { method: "PATCH", body: payload },
  )
  return { envelope, supplier: envelope.data }
}

/** DELETE /suppliers/:id (admin, superadmin) — supprime définitivement. */
export async function deleteSupplier(supplier_id: string) {
  const envelope = await apiRequest<{ supplier_id: string }>(
    `/suppliers/${encodeURIComponent(supplier_id)}`,
    { method: "DELETE" },
  )
  return { envelope, supplier_id: envelope.data.supplier_id }
}
