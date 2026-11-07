import { AtomBadge, AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import { EditIcon, TrashIcon, EyeIcon } from "lucide-react"
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from "@/components/ui/table"
import { civilityLabel, formatSupplierDate } from "@/lib/suppliers"
import type { ApiSupplier } from "@/types/api"

// Tableau des fournisseurs : affichage conforme à la structure API retour
// (voir réponse curl GET /suppliers) : supplier_number, suppliers_name, etc.

const COLUMN_COUNT = 9
export type OSuppliersTableProps = {
  suppliers: ApiSupplier[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onEdit: (supplier: ApiSupplier) => void
  onDelete: (supplier: ApiSupplier) => void
  onViewDetails: (supplier: ApiSupplier) => void
  onRetry: () => void
}

export function OSuppliersTable({
  suppliers,
  loading,
  error,
  disabled,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OSuppliersTableProps) {
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
        <p className="text-destructive text-sm">{error}</p>
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
            <TableHead>Numéro</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Civilité</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Tél.</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Créé le</TableHead>
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
          ) : suppliers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="text-muted-foreground py-10 text-center text-sm"
              >
                Aucun fournisseur ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            suppliers.map((supplier) => (
              <TableRow key={supplier.supplier_id}>
                <TableCell className="font-medium">{supplier.supplier_number}</TableCell>
                <TableCell>
                  <div className="font-medium">{supplier.name}</div>
                </TableCell>
                <TableCell>
                  <AtomBadge variant="outline">
                    {civilityLabel(supplier.civility)}
                  </AtomBadge>
                </TableCell>
                <TableCell>
                    {supplier.contact_name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.address || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.telephone || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.email || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatSupplierDate(supplier.created_at)}
                </TableCell>
                <TableCell className="text-right" style={{ minWidth: '120' }}>
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      iconLeft={EditIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Modifier fournisseur"
                      title="Modifier"
                      disabled={disabled}
                      onClick={() => onEdit(supplier)}
                    >
                      <span className="sr-only">Modifier</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={TrashIcon}
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Supprimer fournisseur"
                      title="Supprimer"
                      disabled={disabled}
                      onClick={() => onDelete(supplier)}
                    >
                      <span className="sr-only">Supprimer</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir détails fournisseur"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(supplier)}
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

