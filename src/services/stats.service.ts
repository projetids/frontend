import { apiRequest } from "@/lib/api-client"
import type {
  ApiStatsDashboard,
  ApiStatsStock,
  ApiStatsUtilisateurs,
  ApiStatsVentes,
  StatsQuery,
} from "@/types/api"

// Statistiques de gestion : lectures seules, réservées à ADMIN/SUPERADMIN.
// Les filtres sont envoyés tels quels ; le backend force le PO d'un ADMIN.

export async function getDashboardStats(query: StatsQuery = {}) {
  const envelope = await apiRequest<ApiStatsDashboard>("/stats/dashboard", {
    query,
  })
  return { envelope, stats: envelope.data }
}

export async function getVentesStats(query: StatsQuery = {}) {
  const envelope = await apiRequest<ApiStatsVentes>("/stats/ventes", { query })
  return { envelope, stats: envelope.data }
}

export async function getStockStats(query: StatsQuery = {}) {
  const envelope = await apiRequest<ApiStatsStock>("/stats/stock", { query })
  return { envelope, stats: envelope.data }
}

export async function getUtilisateursStats(query: StatsQuery = {}) {
  const envelope = await apiRequest<ApiStatsUtilisateurs>(
    "/stats/utilisateurs",
    { query }
  )
  return { envelope, stats: envelope.data }
}
