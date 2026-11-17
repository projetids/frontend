import type {
  ApiAchatReportRow,
  ApiArticleFamily,
  ApiArticleOption,
  ApiBonReception,
  ApiBonReceptionStatus,
  ApiCommandeAchat,
  ApiCommandeAchatStatus,
  ApiDepotOption,
  ApiFactureAchat,
  ApiFactureAchatStatus,
  ApiSupplier,
} from "@/types/api"

// Libellés et helpers d'affichage du module Achats. Les montants et quantités
// sont renvoyés par l'API sous forme de chaînes décimales ; les rapports
// agrégés peuvent aussi être des nombres selon le driver SQL.

export const COMMANDE_ACHAT_STATUS_LABELS: Record<
  ApiCommandeAchatStatus,
  string
> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  PARTIELLE: "Partiellement reçue",
  CLOTUREE: "Clôturée",
  ANNULEE: "Annulée",
}

export const BON_RECEPTION_STATUS_LABELS: Record<
  ApiBonReceptionStatus,
  string
> = {
  VALIDE: "Validée",
  ANNULE: "Annulée",
}

export const FACTURE_ACHAT_STATUS_LABELS: Record<
  ApiFactureAchatStatus,
  string
> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
}

export function commandeAchatStatusLabel(status?: string): string {
  if (!status) return "—"
  return (
    COMMANDE_ACHAT_STATUS_LABELS[status as ApiCommandeAchatStatus] ?? status
  )
}

export function receptionAchatStatusLabel(status?: string): string {
  if (!status) return "—"
  return (
    BON_RECEPTION_STATUS_LABELS[status as ApiBonReceptionStatus] ?? status
  )
}

export function factureAchatStatusLabel(status?: string): string {
  if (!status) return "—"
  return FACTURE_ACHAT_STATUS_LABELS[status as ApiFactureAchatStatus] ?? status
}

/** Variante de badge commune aux trois documents d'achat. */
export function achatStatusBadgeVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "VALIDEE":
    case "VALIDE":
    case "CLOTUREE":
      return "default"
    case "PARTIELLE":
      return "secondary"
    case "ANNULEE":
    case "ANNULE":
      return "destructive"
    case "BROUILLON":
    default:
      return "outline"
  }
}

function toNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Quantité lisible (jusqu'à 3 décimales), « — » si absente ou invalide. */
export function formatAchatQuantity(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(parsed)
}

/** Montant lisible avec devise (Ariary), « — » si absent ou invalide. */
export function formatAchatMoney(value?: string | number | null): string {
  const parsed = toNumber(value)
  if (parsed === null) return "—"
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed)} Ariary`
}

/** Date courte française, « — » si la valeur est absente ou invalide. */
export function formatAchatDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Date et heure françaises, « — » si la valeur est absente ou invalide. */
export function formatAchatDateTime(value?: string | null): string {
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

/** Identifiant raccourci pour les références non résolues. */
export function shortAchatId(value?: string | null): string {
  if (!value) return "—"
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

/** Nom du fournisseur à partir de son identifiant. */
export function supplierAchatLabel(
  suppliers: ApiSupplier[],
  supplier_id?: string | null
): string {
  if (!supplier_id) return "—"
  const supplier = suppliers.find((item) => item.supplier_id === supplier_id)
  return supplier?.suppliers_name ?? `Fournisseur ${shortAchatId(supplier_id)}`
}

/** Libellé d'article : « Eau minérale · ART-001 ». */
export function articleAchatLabel(
  articles: ApiArticleOption[],
  article_id?: string | null
): string {
  if (!article_id) return "—"
  const article = articles.find((item) => item.article_id === article_id)
  if (!article) return `Article ${shortAchatId(article_id)}`
  return `${article.article_name} · ${article.article_code}`
}

/** Libellé de dépôt : « Réserve principale · DEP-… ». */
export function depotAchatLabel(
  depots: ApiDepotOption[],
  depot_id?: string | null
): string {
  if (!depot_id) return "—"
  const depot = depots.find((item) => item.depot_id === depot_id)
  if (!depot) return `Dépôt ${shortAchatId(depot_id)}`
  return `${depot.depot_name} · ${depot.depot_code}`
}

/** Code d'une commande à partir de son identifiant. */
export function commandeAchatLabel(
  commandes: ApiCommandeAchat[],
  commande_id?: string | null
): string {
  if (!commande_id) return "—"
  const commande = commandes.find((item) => item.commande_id === commande_id)
  return commande?.commande_code ?? shortAchatId(commande_id)
}

/** Code d'un bon de réception à partir de son identifiant. */
export function receptionAchatLabel(
  receptions: ApiBonReception[],
  reception_id?: string | null
): string {
  if (!reception_id) return "—"
  const reception = receptions.find(
    (item) => item.reception_id === reception_id
  )
  return reception?.reception_code ?? shortAchatId(reception_id)
}

/** Nom d'une famille d'articles à partir de son identifiant. */
export function familyAchatLabel(
  families: ApiArticleFamily[],
  article_families_id?: number | string | null
): string {
  if (article_families_id === undefined || article_families_id === null) {
    return "—"
  }
  const family = families.find(
    (item) => String(item.article_families_id) === String(article_families_id)
  )
  return family?.article_families_name ?? `#${article_families_id}`
}

/** Montant HT d'une ligne : quantité × prix unitaire HT. */
export function achatLineAmount(
  qty?: string | number | null,
  unitPrice?: string | number | null
): number {
  return (toNumber(qty) ?? 0) * (toNumber(unitPrice) ?? 0)
}

/** Libellé d'une ligne de rapport (article ou famille). */
export function achatReportLabel(
  row: ApiAchatReportRow,
  families: ApiArticleFamily[]
): string {
  if (row.article_families_id !== undefined) {
    return familyAchatLabel(families, row.article_families_id)
  }
  return row.article_name ?? shortAchatId(row.article_id)
}

/** Référence de rapprochement d'une facture (commande et/ou réception). */
export function factureRapprochementLabel(
  facture: ApiFactureAchat,
  commandes: ApiCommandeAchat[],
  receptions: ApiBonReception[]
): string {
  const parts: string[] = []
  if (facture.commande_id) {
    parts.push(commandeAchatLabel(commandes, facture.commande_id))
  }
  if (facture.reception_id) {
    parts.push(receptionAchatLabel(receptions, facture.reception_id))
  }
  return parts.length > 0 ? parts.join(" · ") : "—"
}
