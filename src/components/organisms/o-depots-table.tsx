import { AtomBadge, AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import { EditIcon, EyeIcon, TrashIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ApiDepot } from "@/types/api"

// Tableau des dépôts. La colonne « Point de vente » n'est affichée qu'au
// SUPERADMIN, seul rôle non scopé à un POS.

export type ODepotsTableProps = {
  depots: ApiDepot[]
  loading: boolean
  error: string | null
  disabled?: boolean
  /** Affiche la colonne point de vente (SUPERADMIN). */
  showPointOfSale?: boolean
  onEdit: (depot: ApiDepot) => void
  onDelete: (depot: ApiDepot) => void
  onViewDetails: (depot: ApiDepot) => void
  onRetry: () => void
}

export function ODepotsTable({
  depots,
  loading,
  error,
  disabled,
  showPointOfSale = false,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: ODepotsTableProps) {
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
            <TableHead>Nom</TableHead>
            <TableHead>Adresse</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
            <TableHead className="w-24">Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
          ) : depots.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun dépôt ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            depots.map((depot) => (
              <TableRow key={depot.depot_id}>
                <TableCell>
                  <AtomBadge variant="outline" className="font-mono">
                    {depot.depot_code}
                  </AtomBadge>
                </TableCell>
                <TableCell className="max-w-56">
                  <span className="block truncate font-medium">
                    {depot.depot_name}
                  </span>
                  {depot.depot_description?.trim() ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {depot.depot_description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    title={depot.depot_address ?? undefined}
                  >
                    {depot.depot_address?.trim() || "—"}
                  </span>
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate text-sm"
                      title={`${depot.point_of_sale_name ?? depot.point_of_sale_id} (${depot.point_of_sale_id})`}
                    >
                      {depot.point_of_sale_name?.trim() ||
                        depot.point_of_sale_id}
                    </span>
                    {depot.point_of_sale_name?.trim() ? (
                      <span className="block max-w-40 truncate font-mono text-xs text-muted-foreground">
                        {depot.point_of_sale_id}
                      </span>
                    ) : null}
                  </TableCell>
                ) : null}
                <TableCell>
                  <AtomBadge
                    variant={depot.is_active ? "secondary" : "outline"}
                  >
                    {depot.is_active ? "Actif" : "Inactif"}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      iconLeft={EditIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Modifier le dépôt"
                      title="Modifier"
                      disabled={disabled}
                      onClick={() => onEdit(depot)}
                    >
                      <span className="sr-only">Modifier</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={TrashIcon}
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Supprimer le dépôt"
                      title="Supprimer"
                      disabled={disabled}
                      onClick={() => onDelete(depot)}
                    >
                      <span className="sr-only">Supprimer</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir les détails du dépôt"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(depot)}
                    >
                      <span className="sr-only">Voir détails</span>
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
