import { apiRequest } from "@/lib/api-client"
import type {
  ApiTransfert,
  CreateTransfertPayload,
  TransfertsListQuery,
} from "@/types/api"

function fallbackMeta(data: ApiTransfert[], query: TransfertsListQuery) {
  return {
    page: 1,
    limit: query.limit ?? 20,
    total: data.length,
  }
}

export async function createTransfert(payload: CreateTransfertPayload) {
  const envelope = await apiRequest<ApiTransfert>("/transferts", {
    method: "POST",
    body: payload,
  })
  return { envelope, transfert: envelope.data }
}

export async function listTransferts(query: TransfertsListQuery = {}) {
  const envelope = await apiRequest<ApiTransfert[]>("/transferts", { query })
  return {
    envelope,
    transferts: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

export async function getTransfert(transfert_id: string) {
  const envelope = await apiRequest<ApiTransfert>(
    `/transferts/${encodeURIComponent(transfert_id)}`
  )
  return { envelope, transfert: envelope.data }
}