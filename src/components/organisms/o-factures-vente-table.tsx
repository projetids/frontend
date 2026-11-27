import { EyeIcon, FileDownIcon } from "lucide-react"
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
  clientVenteLabel,
  factureVenteSourceLabel,
  factureVenteStatusLabel,
  formatVenteDate,
  formatVenteMoney,
  venteStatusBadgeVariant,
} from "@/lib/ventes"
import type { ApiClientOptionVente, ApiFactureVente } from "@/types/api"

// Liste des factures de vente (FAV). Le PDF est servi par l'API et téléchargé
// avec le token courant (le lien direct ne fonctionne pas derrière le JWT).

export type OFacturesVenteTableProps = {
  factures: ApiFactureVente[]
  clients: ApiClientOptionVente[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (facture: ApiFactureVente) => void
  onDownloadPdf: (facture: ApiFactureVente) => void
  onRetry: () => void
}

export function OFacturesVenteTable({
  factures,
  clients,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onDownloadPdf,
  onRetry,
}: OFacturesVenteTableProps) {
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
            <TableHead className="w-40">Numéro</TableHead>
            <TableHead className="w-32">Date facture</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-40">Source</TableHead>
            <TableHead className="w-36 text-right">Total TTC</TableHead>
            <TableHead className="w-28">Statut</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
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
                <TableCell className="font-medium">{facture.facture_code}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatVenteDate(facture.invoice_date)}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={
                      facture.client?.client_name ??
                      clientVenteLabel(clients, facture.client_id)
                    }
                  >
                    {facture.client?.client_name ??
                      clientVenteLabel(clients, facture.client_id)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {factureVenteSourceLabel(facture.source)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(facture.montant_ttc)}
                </TableCell>
                <TableCell>
                  <AtomBadge variant={venteStatusBadgeVariant(facture.status)}>
                    {factureVenteStatusLabel(facture.status)}
                  </AtomBadge>
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={facture.point_of_sale_name ?? facture.point_of_sale_id}
                    >
                      {facture.point_of_sale_name ?? facture.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
                    <AtomButton
                      size="icon-sm"
                      variant="ghost"
                      iconLeft={FileDownIcon}
                      aria-label="Télécharger le PDF"
                      title="Télécharger le PDF"
                      onClick={() => onDownloadPdf(facture)}
                    >
                      <span className="sr-only">Télécharger le PDF</span>
                    </AtomButton>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
