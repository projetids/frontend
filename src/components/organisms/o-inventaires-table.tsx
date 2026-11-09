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
  formatInventaireDateTime,
  inventaireDepotLabel,
  inventaireStatusBadgeVariant,
  inventaireStatusLabel,
} from "@/lib/inventaires"
import type { ApiDepotOption, ApiInventaire } from "@/types/api"

// Tableau des inventaires. La colonne « Point de vente » n'est affichée qu'au
// SUPERADMIN, seul rôle non scopé à un POS.

export type OInventairesTableProps = {
  inventaires: ApiInventaire[]
  depots: ApiDepotOption[]
  loading: boolean
  error: string | null
  disabled?: boolean
  /** Affiche la colonne point de vente (SUPERADMIN). */
  showPointOfSale?: boolean
  onViewDetails: (inventaire: ApiInventaire) => void
  onRetry: () => void
}

export function OInventairesTable({
  inventaires,
  depots,
  loading,
  error,
  disabled,
  showPointOfSale = false,
  onViewDetails,
  onRetry,
}: OInventairesTableProps) {
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

  const columnCount = showPointOfSale ? 7 : 6

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Dépôt</TableHead>
            <TableHead className="w-28">Statut</TableHead>
            <TableHead>Commentaire</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
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
          ) : inventaires.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun inventaire ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          ) : (
            inventaires.map((inventaire) => (
              <TableRow key={inventaire.inventaire_id}>
                <TableCell>
                  <AtomBadge variant="outline" className="font-mono">
                    {inventaire.inventaire_code}
                  </AtomBadge>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate font-medium"
                    title={inventaireDepotLabel(depots, inventaire.depot_id)}
                  >
                    {inventaireDepotLabel(depots, inventaire.depot_id)}
                  </span>
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={inventaireStatusBadgeVariant(inventaire.status)}
                  >
                    {inventaireStatusLabel(inventaire.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    title={inventaire.commentaire ?? undefined}
                  >
                    {inventaire.commentaire?.trim() || "—"}
                  </span>
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={inventaire.point_of_sale_id}
                    >
                      {inventaire.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatInventaireDateTime(inventaire.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <AtomButton
                    iconLeft={EyeIcon}
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Voir le détail de l'inventaire"
                    title="Voir détails"
                    disabled={disabled}
                    onClick={() => onViewDetails(inventaire)}
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
