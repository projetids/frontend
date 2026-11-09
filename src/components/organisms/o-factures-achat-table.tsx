import { EyeIcon } from "lucide-react"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  achatStatusBadgeVariant,
  factureAchatStatusLabel,
  factureRapprochementLabel,
  formatAchatDate,
  formatAchatDateTime,
  supplierAchatLabel,
} from "@/lib/achats"
import type {
  ApiBonReception,
  ApiCommandeAchat,
  ApiFactureAchat,
  ApiSupplier,
} from "@/types/api"

// Liste des factures d'achat. Document financier : la colonne « Rapprochement »
// rappelle le bon de commande et/ou le bon de réception associé.

export type OFacturesAchatTableProps = {
  factures: ApiFactureAchat[]
  suppliers: ApiSupplier[]
  commandes: ApiCommandeAchat[]
  receptions: ApiBonReception[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (facture: ApiFactureAchat) => void
  onRetry: () => void
}

export function OFacturesAchatTable({
  factures,
  suppliers,
  commandes,
  receptions,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onRetry,
}: OFacturesAchatTableProps) {
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
        <p className="text-sm text-destructive">{error}</p>
        <AtomButton size="sm" variant="outline" onClick={onRetry}>
          Réessayer
        </AtomButton>
      </div>
    )
  }

  const columnCount = showPointOfSale ? 9 : 8

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead className="w-40">Réf. fournisseur</TableHead>
            <TableHead>Rapprochement</TableHead>
            <TableHead className="w-32">Statut</TableHead>
            <TableHead className="w-32">Date facture</TableHead>
            <TableHead className="w-40">Créée le</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={columnCount}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : factures.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune facture ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            factures.map((facture) => (
              <TableRow key={facture.facture_id}>
                <TableCell className="font-medium">
                  {facture.facture_code}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={supplierAchatLabel(suppliers, facture.supplier_id)}
                  >
                    {supplierAchatLabel(suppliers, facture.supplier_id)}
                  </span>
                </TableCell>
                <TableCell className="max-w-40">
                  <span className="block truncate text-xs text-muted-foreground">
                    {facture.supplier_invoice_ref || "—"}
                  </span>
                </TableCell>
                <TableCell className="max-w-52">
                  <span className="block truncate text-xs text-muted-foreground">
                    {factureRapprochementLabel(
                      facture,
                      commandes,
                      receptions
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <AtomBadge variant={achatStatusBadgeVariant(facture.status)}>
                    {factureAchatStatusLabel(facture.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatAchatDate(facture.invoice_date)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatAchatDateTime(facture.created_at)}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={facture.point_of_sale_id}
                    >
                      {facture.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <AtomButton
                    size="icon-sm"
                    variant="ghost"
                    iconLeft={EyeIcon}
                    aria-label="Voir la facture"
                    title="Voir le détail"
                    onClick={() => onView(facture)}
                  >
                    <span className="sr-only">Voir le détail</span>
                  </AtomButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
