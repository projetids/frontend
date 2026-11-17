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
  bonLivraisonStatusLabel,
  clientVenteLabel,
  commandeVenteLabel,
  depotVenteLabel,
  formatVenteDateTime,
  venteStatusBadgeVariant,
} from "@/lib/ventes"
import type {
  ApiBonLivraison,
  ApiClientOptionVente,
  ApiCommandeVente,
  ApiDepotOption,
} from "@/types/api"

// Liste des bons de livraison vente (BL). Chaque BL provoque une sortie de
// stock sur le dépôt source.

export type OLivraisonsVenteTableProps = {
  livraisons: ApiBonLivraison[]
  clients: ApiClientOptionVente[]
  depots: ApiDepotOption[]
  commandes: ApiCommandeVente[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (livraison: ApiBonLivraison) => void
  onRetry: () => void
}

export function OLivraisonsVenteTable({
  livraisons,
  clients,
  depots,
  commandes,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onRetry,
}: OLivraisonsVenteTableProps) {
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
            <TableHead className="w-40">Commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Dépôt</TableHead>
            <TableHead className="w-32">Statut</TableHead>
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
          ) : livraisons.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun bon de livraison ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            livraisons.map((livraison) => (
              <TableRow key={livraison.livraison_id}>
                <TableCell className="font-medium">
                  {livraison.livraison_code}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {commandeVenteLabel(commandes, livraison.commande_id)}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={clientVenteLabel(clients, livraison.client_id)}
                  >
                    {clientVenteLabel(clients, livraison.client_id)}
                  </span>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={depotVenteLabel(depots, livraison.depot_id)}
                  >
                    {depotVenteLabel(depots, livraison.depot_id)}
                  </span>
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={venteStatusBadgeVariant(livraison.status)}
                  >
                    {bonLivraisonStatusLabel(livraison.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatVenteDateTime(livraison.created_at)}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={livraison.point_of_sale_id}
                    >
                      {livraison.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <AtomButton
                    size="icon-sm"
                    variant="ghost"
                    iconLeft={EyeIcon}
                    aria-label="Voir la livraison"
                    title="Voir le détail"
                    onClick={() => onView(livraison)}
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
