import { apiRequest } from "@/lib/api-client"
import type {
  ApiStockMovement,
  ApiStockStateRow,
  CreateStockBonPayload,
  CreateStockBonResponse,
  MouvementsQuery,
  StockStateQuery,
} from "@/types/api"

// Endpoints du module Stock (backend : src/stock). La source de vérité est le
// journal append-only `mouvements_stock` : on n'édite et ne supprime jamais un
// mouvement. L'API scope automatiquement les admins à leur point de vente ; un
// superadmin voit tous les dépôts et peut filtrer l'état par POS.
//
// Les bons d'entrée/sortie sont transactionnels : si une ligne échoue (stock
// insuffisant, dépôt inactif, article introuvable), aucun mouvement n'est écrit.

/** POST /stock/bons-entree — crée des mouvements `ENTREE` (+). */
export async function createBonEntree(payload: CreateStockBonPayload) {
  const envelope = await apiRequest<CreateStockBonResponse>(
    "/stock/bons-entree",
    { method: "POST", body: payload }
  )
  return { envelope, result: envelope.data }
}

/** POST /stock/bons-sortie — crée des mouvements `SORTIE` (−), 409 si stock insuffisant. */
export async function createBonSortie(payload: CreateStockBonPayload) {
  const envelope = await apiRequest<CreateStockBonResponse>(
    "/stock/bons-sortie",
    { method: "POST", body: payload }
  )
  return { envelope, result: envelope.data }
}

/** GET /stock/mouvements — journal paginé, filtres article/dépôt/type/réf/dates. */
export async function listMouvements(query: MouvementsQuery = {}) {
  const envelope = await apiRequest<ApiStockMovement[]>("/stock/mouvements", {
    query,
  })
  return {
    envelope,
    movements: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /stock/etat — stock théorique agrégé par article × dépôt. */
export async function getStockState(query: StockStateQuery = {}) {
  const envelope = await apiRequest<ApiStockStateRow[]>("/stock/etat", {
    query,
  })
  return { envelope, rows: envelope.data }
}
