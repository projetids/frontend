import { apiRequest } from "@/lib/api-client"
import type {
  ApiCaisseDailyReport,
  ApiCaisseSession,
  CaisseSessionsQuery,
  CloseCaisseSessionPayload,
  OpenCaisseSessionPayload,
} from "@/types/api"

// Sessions de caisse journalières (module /caisses). Le caissier ouvre/ferme
// sa propre caisse ; les admins consultent le rapport journalier et peuvent
// fermer une session restée ouverte.

/** POST /caisses/ouverture (CASHIER) — ouvre la caisse du jour. */
export async function openCaisseSession(payload: OpenCaisseSessionPayload) {
  const envelope = await apiRequest<ApiCaisseSession>("/caisses/ouverture", {
    method: "POST",
    body: payload,
  })
  return { envelope, session: envelope.data }
}

/** GET /caisses/session-courante (CASHIER) — `null` si aucune caisse ouverte. */
export async function getCurrentCaisseSession() {
  const envelope = await apiRequest<ApiCaisseSession | null>(
    "/caisses/session-courante"
  )
  return { envelope, session: envelope.data }
}

/** POST /caisses/fermeture (CASHIER) — ferme sa caisse courante. */
export async function closeCaisseSession(payload: CloseCaisseSessionPayload) {
  const envelope = await apiRequest<ApiCaisseSession>("/caisses/fermeture", {
    method: "POST",
    body: payload,
  })
  return { envelope, session: envelope.data }
}

/** GET /caisses — liste paginée (scope selon le rôle). */
export async function listCaisseSessions(query: CaisseSessionsQuery = {}) {
  const envelope = await apiRequest<ApiCaisseSession[]>("/caisses", { query })
  return {
    envelope,
    sessions: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /caisses/:id — détail d'une session (ventes incluses côté API). */
export async function getCaisseSession(session_id: string) {
  const envelope = await apiRequest<ApiCaisseSession>(
    `/caisses/${encodeURIComponent(session_id)}`
  )
  return { envelope, session: envelope.data }
}

/** POST /caisses/:id/fermeture (ADMIN/SUPERADMIN) — fermeture forcée. */
export async function forceCloseCaisseSession(
  session_id: string,
  payload?: Partial<CloseCaisseSessionPayload>
) {
  const envelope = await apiRequest<ApiCaisseSession>(
    `/caisses/${encodeURIComponent(session_id)}/fermeture`,
    { method: "POST", body: payload ?? {} }
  )
  return { envelope, session: envelope.data }
}

/** GET /caisses/rapport-journalier (ADMIN/SUPERADMIN). */
export async function getCaisseDailyReport(query: {
  date?: string
  point_of_sale_id?: string
} = {}) {
  const envelope = await apiRequest<ApiCaisseDailyReport>(
    "/caisses/rapport-journalier",
    { query }
  )
  return { envelope, report: envelope.data }
}
