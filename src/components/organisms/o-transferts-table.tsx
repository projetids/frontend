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
import { formatStockDateTime, stockDepotLabel } from "@/lib/stocks"
import type { ApiDepotOption, ApiTransfert } from "@/types/api"

// Tableau des transferts de stock. Un transfert relie un dépôt source à un
// dépôt cible ; les deux mouvements (sortie puis entrée) sont créés dans la
// même transaction côté API.

export type OTransfertsTableProps = {
  transferts: ApiTransfert[]
  depots: ApiDepotOption[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onViewDetails: (transfert: ApiTransfert) => void
  onRetry: () => void
}

export function OTransfertsTable({
  transferts,
  depots,
  loading,
  error,
  disabled,
  onViewDetails,
  onRetry,
}: OTransfertsTableProps) {
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

  const columnCount = 7

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Cible</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="w-28">Statut</TableHead>
            <TableHead className="w-44">Créé le</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
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
          ) : transferts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun transfert ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            transferts.map((transfert) => (
              <TableRow key={transfert.transfert_id}>
                <TableCell>
                  <AtomBadge variant="outline" className="font-mono">
                    {transfert.transfert_code}
                  </AtomBadge>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate font-medium"
                    title={stockDepotLabel(depots, transfert.depot_source_id)}
                  >
                    {stockDepotLabel(depots, transfert.depot_source_id)}
                  </span>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate font-medium"
                    title={stockDepotLabel(depots, transfert.depot_cible_id)}
                  >
                    {stockDepotLabel(depots, transfert.depot_cible_id)}
                  </span>
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={transfert.is_inter_pos ? "secondary" : "outline"}
                  >
                    {transfert.is_inter_pos ? "Inter-POS" : "Intra-POS"}
                  </AtomBadge>
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={
                      transfert.status === "VALIDE" ? "default" : "destructive"
                    }
                  >
                    {transfert.status === "VALIDE" ? "Validé" : "Annulé"}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatStockDateTime(transfert.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <AtomButton
                    iconLeft={EyeIcon}
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Voir le détail du transfert"
                    title="Voir détails"
                    disabled={disabled}
                    onClick={() => onViewDetails(transfert)}
                  >
                    <span className="sr-only">Voir détails</span>
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
