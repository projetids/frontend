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
  commandeAchatLabel,
  depotAchatLabel,
  formatAchatDateTime,
  receptionAchatStatusLabel,
  supplierAchatLabel,
} from "@/lib/achats"
import type {
  ApiBonReception,
  ApiCommandeAchat,
  ApiDepotOption,
  ApiSupplier,
} from "@/types/api"

// Liste des bons de réception achat. Chaque BR a alimenté le stock du dépôt
// indiqué via des mouvements append-only `ACHAT_BR`.

export type OReceptionsAchatTableProps = {
  receptions: ApiBonReception[]
  suppliers: ApiSupplier[]
  depots: ApiDepotOption[]
  commandes: ApiCommandeAchat[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (reception: ApiBonReception) => void
  onRetry: () => void
}

export function OReceptionsAchatTable({
  receptions,
  suppliers,
  depots,
  commandes,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onRetry,
}: OReceptionsAchatTableProps) {
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

  const columnCount = showPointOfSale ? 8 : 7

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Dépôt</TableHead>
            <TableHead className="w-36">Commande</TableHead>
            <TableHead className="w-32">Statut</TableHead>
            <TableHead className="w-40">Reçue le</TableHead>
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
          ) : receptions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune réception ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            receptions.map((reception) => (
              <TableRow key={reception.reception_id}>
                <TableCell className="font-medium">
                  {reception.reception_code}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={supplierAchatLabel(
                      suppliers,
                      reception.supplier_id
                    )}
                  >
                    {supplierAchatLabel(suppliers, reception.supplier_id)}
                  </span>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    title={depotAchatLabel(depots, reception.depot_id)}
                  >
                    {depotAchatLabel(depots, reception.depot_id)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {commandeAchatLabel(commandes, reception.commande_id)}
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={achatStatusBadgeVariant(reception.status)}
                  >
                    {receptionAchatStatusLabel(reception.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatAchatDateTime(reception.created_at)}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={reception.point_of_sale_id}
                    >
                      {reception.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <AtomButton
                    size="icon-sm"
                    variant="ghost"
                    iconLeft={EyeIcon}
                    aria-label="Voir la réception"
                    title="Voir le détail"
                    onClick={() => onView(reception)}
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
