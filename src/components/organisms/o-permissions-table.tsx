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
import { formatPermissionDate } from "@/lib/permissions"
import type { ApiPermission } from "@/types/api"

// Tableau du catalogue de permissions : code, libellé, options et état.

const COLUMN_COUNT = 7

export type OPermissionsTableProps = {
  permissions: ApiPermission[]
  loading: boolean
  error: string | null
  disabled?: boolean
  /** Autorise la modification et la suppression (SUPERADMIN). */
  canManage: boolean
  onEdit: (permission: ApiPermission) => void
  onDelete: (permission: ApiPermission) => void
  onViewDetails: (permission: ApiPermission) => void
  onRetry: () => void
}

export function OPermissionsTable({
  permissions,
  loading,
  error,
  disabled,
  canManage,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OPermissionsTableProps) {
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
            <TableHead className="w-24">Code</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>Réservée</TableHead>
            <TableHead>Défaut</TableHead>
            <TableHead>État</TableHead>
            <TableHead>Modifiée le</TableHead>
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
          ) : permissions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune permission ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            permissions.map((permission) => (
              <TableRow key={permission.code}>
                <TableCell>
                  <AtomBadge variant="outline">{permission.code}</AtomBadge>
                </TableCell>
                <TableCell className="max-w-88 font-medium">
                  <span className="line-clamp-2">{permission.label_fr}</span>
                </TableCell>
                <TableCell className="text-xs">
                  {permission.reserved ? (
                    <AtomBadge variant="outline">Oui</AtomBadge>
                  ) : (
                    <span className="text-muted-foreground">Non</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {permission.default_enabled ? (
                    <AtomBadge variant="secondary">Oui</AtomBadge>
                  ) : (
                    <span className="text-muted-foreground">Non</span>
                  )}
                </TableCell>
                <TableCell>
                  <AtomBadge
                    variant={permission.is_active ? "secondary" : "destructive"}
                  >
                    {permission.is_active ? "Active" : "Inactive"}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatPermissionDate(permission.updated_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canManage ? (
                      <>
                        <AtomButton
                          iconLeft={EditIcon}
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Modifier la permission"
                          title="Modifier"
                          disabled={disabled}
                          onClick={() => onEdit(permission)}
                        >
                          <span className="sr-only">Modifier</span>
                        </AtomButton>
                        <AtomButton
                          iconLeft={TrashIcon}
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive"
                          aria-label="Supprimer la permission"
                          title="Supprimer"
                          disabled={disabled}
                          onClick={() => onDelete(permission)}
                        >
                          <span className="sr-only">Supprimer</span>
                        </AtomButton>
                      </>
                    ) : null}
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir les détails de la permission"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(permission)}
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
