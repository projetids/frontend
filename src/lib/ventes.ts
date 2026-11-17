import type {
  ApiBonLivraison,
  ApiBonLivraisonStatus,
  ApiCommandeVente,
  ApiCommandeVenteStatus,
  ApiDepotOption,
  ApiModePaiement,
  ApiVenteComptantStatus,
  ApiVenteReportRow,
} from "@/types/api"

// ——— Status labels ———

export const COMMANDE_VENTE_STATUS_LABELS: Record<
  ApiCommandeVenteStatus,
  string
> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  LIVREE: "Livrée",
  FACTUREE: "Facturée",
  CLOTUREE: "Clôturée",
  ANNULEE: "Annulée",
}

export const BON_LIVRAISON_STATUS_LABELS: Record<
  ApiBonLivraisonStatus,
  string
> = {
  VALIDE: "Validé",
  ANNULE: "Annulé",
}

export const VENTE_COMPTANT_STATUS_LABELS: Record<
  ApiVenteComptantStatus,
  string
> = {
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
}

export const MODE_PAIEMENT_LABELS: Record<ApiModePaiement, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  AUTRE: "Autre",
}

export function commandeVenteStatusLabel(status?: string): string {
  if (!status) return "—"
  return (
    COMMANDE_VENTE_STATUS_LABELS[status as ApiCommandeVenteStatus] ?? status
  )
}

export function bonLivraisonStatusLabel(status?: string): string {
  if (!status) return "—"
  return BON_LIVRAISON_STATUS_LABELS[status as ApiBonLivraisonStatus] ?? status
}

export function venteComptantStatusLabel(status?: string): string {
  if (!status) return "—"
  return (
    VENTE_COMPTANT_STATUS_LABELS[status as ApiVenteComptantStatus] ?? status
  )
}

export function modePaiementLabel(mode?: string): string {
  if (!mode) return "—"
  return MODE_PAIEMENT_LABELS[mode as ApiModePaiement] ?? mode
}

// ——— Badge variants ———

export function venteStatusBadgeVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "VALIDEE":
    case "VALIDE":
    case "LIVREE":
    case "FACTUREE":
    case "CLOTUREE":
      return "default"
    case "ANNULEE":
    case "ANNULE":
      return "destructive"
    case "BROUILLON":
    default:
      return "outline"
  }
}

// ——— Helpers ———

function toNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Quantité lisible (jusqu'à 3 décimales), « — » si absente ou invalide. */
export function formatVenteQuantity(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(parsed)
}

/** Montant lisible avec devise (Ariary), « — » si absent ou invalide. */
export function formatVenteMoney(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed)} Ariary`
}

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatVenteDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Date-heure courte française, « — » si absente ou invalide. */
export function formatVenteDateTime(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** ID court pour affichage de fallback. */
export function shortVenteId(id?: string | null): string {
  if (!id) return "—"
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

/** Nom du client à partir de son identifiant. */
export function clientVenteLabel(
  clients: { client_id: string; client_name: string }[],
  client_id?: string | null
): string {
  if (!client_id) return "—"
  const client = clients.find((item) => item.client_id === client_id)
  return client?.client_name ?? `Client ${shortVenteId(client_id)}`
}

/** Nom du dépôt à partir de son identifiant. */
export function depotVenteLabel(
  depots: ApiDepotOption[],
  depot_id?: string | null
): string {
  if (!depot_id) return "—"
  const depot = depots.find((item) => item.depot_id === depot_id)
  if (!depot) return `Dépôt ${shortVenteId(depot_id)}`
  return `${depot.depot_name} · ${depot.depot_code}`
}

/** Code d'une commande vente à partir de son identifiant. */
export function commandeVenteLabel(
  commandes: ApiCommandeVente[],
  commande_id?: string | null
): string {
  if (!commande_id) return "—"
  const commande = commandes.find((item) => item.commande_id === commande_id)
  return commande?.commande_code ?? shortVenteId(commande_id)
}

/** Code d'un bon de livraison à partir de son identifiant. */
export function bonLivraisonLabel(
  livraisons: ApiBonLivraison[],
  livraison_id?: string | null
): string {
  if (!livraison_id) return "—"
  const livraison = livraisons.find(
    (item) => item.livraison_id === livraison_id
  )
  return livraison?.livraison_code ?? shortVenteId(livraison_id)
}

/** Libellé d'un article à partir de son identifiant (nom · code). */
export function articleVenteLabel(
  articles: {
    article_id: string
    article_name: string
    article_code: string
  }[],
  article_id?: string | null
): string {
  if (!article_id) return "—"
  const article = articles.find((item) => item.article_id === article_id)
  return article
    ? `${article.article_name} · ${article.article_code}`
    : shortVenteId(article_id)
}

/** Montant HT d'une ligne : quantité × prix unitaire HT. */
export function venteLineAmount(
  qty?: string | number | null,
  unitPrice?: string | number | null
): number {
  return (toNumber(qty) ?? 0) * (toNumber(unitPrice) ?? 0)
}

/** Libellé d'une ligne de rapport (article ou famille). */
export function venteReportLabel(
  row: ApiVenteReportRow,
  families: {
    article_families_id: number | string
    article_families_name: string
  }[]
): string {
  if (
    row.article_families_id !== undefined &&
    row.article_families_id !== null
  ) {
    const family = families.find(
      (item) =>
        String(item.article_families_id) === String(row.article_families_id)
    )
    return family?.article_families_name ?? `#${row.article_families_id}`
  }
  return row.article_name ?? shortVenteId(row.article_id)
}
