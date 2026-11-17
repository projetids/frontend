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
  clientVenteLabel,
  commandeVenteStatusLabel,
  formatVenteDateTime,
  venteStatusBadgeVariant,
} from "@/lib/ventes"
import type { ApiClientOptionVente, ApiCommandeVente } from "@/types/api"

// Liste des bons de commande vente (BCV). Aucun impact stock : le document
// matérialise seulement l'engagement du client.

export type OCommandesVenteTableProps = {
  commandes: ApiCommandeVente[]
  clients: ApiClientOptionVente[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (commande: ApiCommandeVente) => void
  onRetry: () => void
}

export function OCommandesVenteTable({
  commandes,
  clients,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onRetry,
}: OCommandesVenteTableProps) {
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

  const columnCount = showPointOfSale ? 6 : 5

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-40">Statut</TableHead>
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
          ) : commandes.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune commande ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            commandes.map((commande) => (
              <TableRow key={commande.commande_id}>
                <TableCell className="font-medium">
                  {commande.commande_code}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={clientVenteLabel(clients, commande.client_id)}
                  >
                    {clientVenteLabel(clients, commande.client_id)}
                  </span>
                </TableCell>
                <TableCell>
                  <AtomBadge variant={venteStatusBadgeVariant(commande.status)}>
                    {commandeVenteStatusLabel(commande.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatVenteDateTime(commande.created_at)}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={commande.point_of_sale_id}
                    >
                      {commande.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <AtomButton
                    size="icon-sm"
                    variant="ghost"
                    iconLeft={EyeIcon}
                    aria-label="Voir la commande"
                    title="Voir le détail"
                    onClick={() => onView(commande)}
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
