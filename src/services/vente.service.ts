import { apiDownload, apiRequest } from "@/lib/api-client"
import type {
  AnnulerVenteComptantPayload,
  ApiBonLivraison,
  ApiBonLivraisonLigne,
  ApiCommandeVente,
  ApiCommandeVenteLigne,
  ApiFactureVente,
  ApiModePaiement,
  ApiVenteComptant,
  ApiVenteComptantLigne,
  ApiVenteReportRow,
  ApiVentesReportParCaissier,
  ApiVentesReportPeriodes,
  CreateBonLivraisonPayload,
  CreateCommandeVentePayload,
  CreateFactureVentePayload,
  CreateVenteComptantPayload,
  FacturesVenteListQuery,
  VenteReportParCaissierQuery,
  VenteReportPeriodeQuery,
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

/** POST /ventes/comptant/:id/annulation — admin/superadmin, A40 + A31. */
export async function annulerVenteComptant(
  vente_id: string,
  payload: AnnulerVenteComptantPayload
) {
  const envelope = await apiRequest<ApiVenteComptant>(
    `/ventes/comptant/${encodeURIComponent(vente_id)}/annulation`,
    { method: "POST", body: payload }
  )
  return { envelope, vente: envelope.data }
}

// ——— Factures de vente (FAV) ———

/** POST /ventes/factures — exactement un de `vente_id` ou `livraison_ids`. */
export async function createFactureVente(payload: CreateFactureVentePayload) {
  const envelope = await apiRequest<ApiFactureVente>("/ventes/factures", {
    method: "POST",
    body: payload,
  })
  return { envelope, facture: envelope.data }
}

export async function listFacturesVente(query: FacturesVenteListQuery = {}) {
  const envelope = await apiRequest<ApiFactureVente[]>("/ventes/factures", {
    query,
  })
  return {
    envelope,
    factures: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

export async function getFactureVente(facture_id: string) {
  const envelope = await apiRequest<ApiFactureVente>(
    `/ventes/factures/${encodeURIComponent(facture_id)}`
  )
  return { envelope, facture: envelope.data }
}

/** GET /ventes/factures/:id/pdf — télécharge la facture au format PDF. */
export async function downloadFactureVentePdf(
  facture: Pick<ApiFactureVente, "facture_id" | "facture_code">
) {
  await apiDownload(
    `/ventes/factures/${encodeURIComponent(facture.facture_id)}/pdf`,
    `${facture.facture_code ?? "facture"}.pdf`
  )
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

/** GET /ventes/report/periodes — série temporelle (admin/superadmin, A40). */
export async function reportPeriodes(query: VenteReportPeriodeQuery = {}) {
  const envelope = await apiRequest<ApiVentesReportPeriodes>(
    "/ventes/report/periodes",
    { query }
  )
  return { envelope, report: envelope.data }
}

/** GET /ventes/report/par-caissier — CA par vendeur (admin/superadmin, A40). */
export async function reportParCaissier(query: VenteReportParCaissierQuery = {}) {
  const envelope = await apiRequest<ApiVentesReportParCaissier>(
    "/ventes/report/par-caissier",
    { query }
  )
  return { envelope, report: envelope.data }
}

// Ré-exports des types de lignes pour les composants (utiles pour les formes).
export type {
  ApiCommandeVenteLigne,
  ApiBonLivraisonLigne,
  ApiVenteComptantLigne,
  ApiModePaiement,
}
