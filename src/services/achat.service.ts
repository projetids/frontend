import { apiRequest } from "@/lib/api-client"
import type {
  AchatsListQuery,
  AchatsReportQuery,
  ApiAchatReportRow,
  ApiBonReception,
  ApiCommandeAchat,
  ApiFactureAchat,
  CreateBonReceptionPayload,
  CreateCommandeAchatPayload,
  CreateFactureAchatPayload,
} from "@/types/api"

// Endpoints du module Achats (backend : src/achats). Les admins sont scopés à
// leur point de vente ; le superadmin voit tout et peut cibler un POS.
//
// Flux métier :
// - commande (BCA) : engagement fournisseur, aucun impact stock ;
// - réception (BR) : ENTRÉE stock au dépôt choisi (mouvements `ACHAT_BR`) ;
// - facture (FAA) : document financier, rapprochement optionnel BC/BR.
//
// Les trois créations sont transactionnelles côté API : si une ligne échoue
// (article/fournisseur/dépôt introuvable, stock, FK), rien n'est enregistré.

function fallbackMeta<T>(data: T[], query: AchatsListQuery) {
  return {
    page: 1,
    limit: query.limit ?? 20,
    total: data.length,
  }
}

/** POST /achats/commandes — crée un bon de commande `BCA` (0 impact stock). */
export async function createCommande(payload: CreateCommandeAchatPayload) {
  const envelope = await apiRequest<ApiCommandeAchat>("/achats/commandes", {
    method: "POST",
    body: payload,
  })
  return { envelope, commande: envelope.data }
}

/** GET /achats/commandes — liste paginée, scopée POS. */
export async function listCommandes(query: AchatsListQuery = {}) {
  const envelope = await apiRequest<ApiCommandeAchat[]>("/achats/commandes", {
    query,
  })
  return {
    envelope,
    commandes: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

/** GET /achats/commandes/:id — détail + lignes (qty_ordered/qty_received). */
export async function getCommande(commande_id: string) {
  const envelope = await apiRequest<ApiCommandeAchat>(
    `/achats/commandes/${encodeURIComponent(commande_id)}`
  )
  return { envelope, commande: envelope.data }
}

/** POST /achats/receptions — crée un BR et les mouvements `ENTREE` associés. */
export async function createReception(payload: CreateBonReceptionPayload) {
  const envelope = await apiRequest<ApiBonReception>("/achats/receptions", {
    method: "POST",
    body: payload,
  })
  return { envelope, reception: envelope.data }
}

/** GET /achats/receptions — liste paginée, scopée POS. */
export async function listReceptions(query: AchatsListQuery = {}) {
  const envelope = await apiRequest<ApiBonReception[]>("/achats/receptions", {
    query,
  })
  return {
    envelope,
    receptions: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

/** GET /achats/receptions/:id — détail + lignes. */
export async function getReception(reception_id: string) {
  const envelope = await apiRequest<ApiBonReception>(
    `/achats/receptions/${encodeURIComponent(reception_id)}`
  )
  return { envelope, reception: envelope.data }
}

/** POST /achats/factures — crée une facture `FAA` (0 impact stock). */
export async function createFacture(payload: CreateFactureAchatPayload) {
  const envelope = await apiRequest<ApiFactureAchat>("/achats/factures", {
    method: "POST",
    body: payload,
  })
  return { envelope, facture: envelope.data }
}

/** GET /achats/factures — liste paginée, scopée POS. */
export async function listFactures(query: AchatsListQuery = {}) {
  const envelope = await apiRequest<ApiFactureAchat[]>("/achats/factures", {
    query,
  })
  return {
    envelope,
    factures: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

/** GET /achats/factures/:id — détail + lignes. */
export async function getFacture(facture_id: string) {
  const envelope = await apiRequest<ApiFactureAchat>(
    `/achats/factures/${encodeURIComponent(facture_id)}`
  )
  return { envelope, facture: envelope.data }
}

/** GET /achats/report/par-article — agrégat qty/HT par article. */
export async function reportParArticle(query: AchatsReportQuery = {}) {
  const envelope = await apiRequest<ApiAchatReportRow[]>(
    "/achats/report/par-article",
    { query }
  )
  return { envelope, rows: envelope.data }
}

/** GET /achats/report/par-famille — agrégat qty/HT par famille. */
export async function reportParFamille(query: AchatsReportQuery = {}) {
  const envelope = await apiRequest<ApiAchatReportRow[]>(
    "/achats/report/par-famille",
    { query }
  )
  return { envelope, rows: envelope.data }
}
