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
import type { ApiArticleFamily } from "@/types/api"

// Tableau des familles d'articles : structure API `{ id, name }`.

const COLUMN_COUNT = 3

export type OArticleFamiliesTableProps = {
  families: ApiArticleFamily[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onEdit: (family: ApiArticleFamily) => void
  onDelete: (family: ApiArticleFamily) => void
  onViewDetails: (family: ApiArticleFamily) => void
  onRetry: () => void
}

export function OArticleFamiliesTable({
  families,
  loading,
  error,
  disabled,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OArticleFamiliesTableProps) {
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

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">ID</TableHead>
            <TableHead>Nom de la famille</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={COLUMN_COUNT}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : families.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune famille d'articles ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            families.map((family) => (
              <TableRow key={family.id}>
                <TableCell>
                  <AtomBadge variant="outline">#{family.id}</AtomBadge>
                </TableCell>
                <TableCell className="font-medium">{family.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      iconLeft={EditIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Modifier la famille"
                      title="Modifier"
                      disabled={disabled}
                      onClick={() => onEdit(family)}
                    >
                      <span className="sr-only">Modifier</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={TrashIcon}
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Supprimer la famille"
                      title="Supprimer"
                      disabled={disabled}
                      onClick={() => onDelete(family)}
                    >
                      <span className="sr-only">Supprimer</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir les détails de la famille"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(family)}
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
