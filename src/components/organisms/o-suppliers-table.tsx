import { AtomBadge, AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from "@/components/ui/table"
import { civilityLabel, formatSupplierDate } from "@/lib/suppliers"

// Tableau des fournisseurs : affichage conforme à la structure API retour
// (voir réponse curl GET /suppliers) : supplier_number, suppliers_name, etc.

const COLUMN_COUNT = 7
export type OSuppliersTableProps = {
  suppliers: ApiSupplier[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onEdit: (supplier: ApiSupplier) => void
  onDelete: (supplier: ApiSupplier) => void
  onRetry: () => void
}

export function OSuppliersTable({
  suppliers,
  loading,
  error,
  disabled,
  onEdit,
  onDelete,
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
                  <div className="font-medium">{supplier.suppliers_name}</div>
                </TableCell>
                <TableCell>
                  <AtomBadge variant="outline">
                    {civilityLabel(supplier.suppliers_civility)}
                  </AtomBadge>
                </TableCell>
                <TableCell>
                    {supplier.suppliers_contact_name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.suppliers_address || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.suppliers_telephone || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {supplier.suppliers_email || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatSupplierDate(supplier.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
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

