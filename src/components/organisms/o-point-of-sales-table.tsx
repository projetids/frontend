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
import type { ApiPointOfSale } from "@/types/api"

export type OPointOfSalesTableProps = {
  pointsOfSale: ApiPointOfSale[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onEdit: (pos: ApiPointOfSale) => void
  onDelete: (pos: ApiPointOfSale) => void
  onViewDetails: (pos: ApiPointOfSale) => void
  onRetry: () => void
}

export function OPointOfSalesTable({
  pointsOfSale,
  loading,
  error,
  disabled,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OPointOfSalesTableProps) {
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

  const columnCount = 4

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Adresse</TableHead>
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
          ) : pointsOfSale.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun point de vente ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            pointsOfSale.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell>
                  <AtomBadge variant="outline" className="font-mono">
                    {pos.point_of_sale_code}
                  </AtomBadge>
                </TableCell>
                <TableCell className="max-w-56">
                  <span className="block truncate font-medium">{pos.name}</span>
                  {pos.description?.trim() ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {pos.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate text-sm text-muted-foreground"
                    title={pos.address ?? undefined}
                  >
                    {pos.address?.trim() || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      iconLeft={EditIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Modifier le point de vente"
                      title="Modifier"
                      disabled={disabled}
                      onClick={() => onEdit(pos)}
                    >
                      <span className="sr-only">Modifier</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={TrashIcon}
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Supprimer le point de vente"
                      title="Supprimer"
                      disabled={disabled}
                      onClick={() => onDelete(pos)}
                    >
                      <span className="sr-only">Supprimer</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir les détails du point de vente"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(pos)}
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