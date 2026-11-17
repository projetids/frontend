import { apiRequest } from "@/lib/api-client"
import type {
  ApiBonLivraison,
  ApiBonLivraisonLigne,
  ApiCommandeVente,
  ApiCommandeVenteLigne,
  ApiModePaiement,
  ApiVenteComptant,
  ApiVenteComptantLigne,
  ApiVenteReportRow,
  CreateBonLivraisonPayload,
  CreateCommandeVentePayload,
  CreateVenteComptantPayload,
  VentesListQuery,
  VentesReportQuery,
} from "@/types/api"

function fallbackMeta<T>(data: T[], query: VentesListQuery) {
  return {
    page: 1,
    limit: query.limit ?? 20,
    total: data.length,
  }
}

// ——— Commandes vente (BCV, 0 impact stock) ———

export async function createCommandeVente(payload: CreateCommandeVentePayload) {
  const envelope = await apiRequest<ApiCommandeVente>("/ventes/commandes", {
    method: "POST",
    body: payload,
  })
  return { envelope, commande: envelope.data }
}

export async function listCommandesVente(query: VentesListQuery = {}) {
  const envelope = await apiRequest<ApiCommandeVente[]>("/ventes/commandes", {
    query,
  })
  return {
    envelope,
    commandes: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

export async function getCommandeVente(commande_id: string) {
  const envelope = await apiRequest<ApiCommandeVente>(
    `/ventes/commandes/${encodeURIComponent(commande_id)}`
  )
  return { envelope, commande: envelope.data }
}

// ——— Bons de livraison (BL → SORTIE stock) ———

export async function createBonLivraison(payload: CreateBonLivraisonPayload) {
  const envelope = await apiRequest<ApiBonLivraison>("/ventes/livraisons", {
    method: "POST",
    body: payload,
  })
  return { envelope, livraison: envelope.data }
}

export async function listBonsLivraison(query: VentesListQuery = {}) {
  const envelope = await apiRequest<ApiBonLivraison[]>("/ventes/livraisons", {
    query,
  })
  return {
    envelope,
    livraisons: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

export async function getBonLivraison(livraison_id: string) {
  const envelope = await apiRequest<ApiBonLivraison>(
    `/ventes/livraisons/${encodeURIComponent(livraison_id)}`
  )
  return { envelope, livraison: envelope.data }
}

// ——— Ventes au comptant (VC → SORTIE stock, BL implicite) ———

export async function createVenteComptant(payload: CreateVenteComptantPayload) {
  const envelope = await apiRequest<ApiVenteComptant>("/ventes/comptant", {
    method: "POST",
    body: payload,
  })
  return { envelope, vente: envelope.data }
}

export async function listVentesComptant(query: VentesListQuery = {}) {
  const envelope = await apiRequest<ApiVenteComptant[]>("/ventes/comptant", {
    query,
  })
  return {
    envelope,
    ventes: envelope.data,
    meta: envelope.meta ?? fallbackMeta(envelope.data, query),
  }
}

export async function getVenteComptant(vente_id: string) {
  const envelope = await apiRequest<ApiVenteComptant>(
    `/ventes/comptant/${encodeURIComponent(vente_id)}`
  )
  return { envelope, vente: envelope.data }
}

// ——— Rapports (CA par article / famille) ———

export async function reportParArticle(query: VentesReportQuery = {}) {
  const envelope = await apiRequest<ApiVenteReportRow[]>(
    "/ventes/report/ca-par-article",
    { query }
  )
  return { envelope, rows: envelope.data }
}

export async function reportParFamille(query: VentesReportQuery = {}) {
  const envelope = await apiRequest<ApiVenteReportRow[]>(
    "/ventes/report/ca-par-famille",
    { query }
  )
  return { envelope, rows: envelope.data }
}

// Ré-exports des types de lignes pour les composants (utiles pour les formes).
export type {
  ApiCommandeVenteLigne,
  ApiBonLivraisonLigne,
  ApiVenteComptantLigne,
  ApiModePaiement,
}
