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
import { formatClientDate } from "@/lib/clients"
import type { ApiClient } from "@/types/api"

// Tableau des clients. La colonne « Point de vente » n'est affichée qu'au
// SUPERADMIN, seul rôle non scopé à un POS.

export type OClientsTableProps = {
  clients: ApiClient[]
  loading: boolean
  error: string | null
  disabled?: boolean
  /** Affiche la colonne point de vente (SUPERADMIN). */
  showPointOfSale?: boolean
  onEdit: (client: ApiClient) => void
  onDelete: (client: ApiClient) => void
  onViewDetails: (client: ApiClient) => void
  onRetry: () => void
}

export function OClientsTable({
  clients,
  loading,
  error,
  disabled,
  showPointOfSale = false,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OClientsTableProps) {
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
            <TableHead>Client</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Matricule</TableHead>
            <TableHead>Corps</TableHead>
            <TableHead>Grade</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
            <TableHead>Créé le</TableHead>
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
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun client ne correspond à cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.client_id}>
                <TableCell className="max-w-56">
                  <span className="block truncate font-medium">
                    {client.client_name}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.client_telephone?.trim() || "—"}
                </TableCell>
                <TableCell>
                  {client.client_matricule?.trim() ? (
                    <AtomBadge variant="outline" className="font-mono">
                      {client.client_matricule}
                    </AtomBadge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.client_corps?.trim() || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.client_grade?.trim() || "—"}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={client.point_of_sale_id}
                    >
                      {client.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-xs text-muted-foreground">
                  {formatClientDate(client.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      iconLeft={EditIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Modifier le client"
                      title="Modifier"
                      disabled={disabled}
                      onClick={() => onEdit(client)}
                    >
                      <span className="sr-only">Modifier</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={TrashIcon}
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Supprimer le client"
                      title="Supprimer"
                      disabled={disabled}
                      onClick={() => onDelete(client)}
                    >
                      <span className="sr-only">Supprimer</span>
                    </AtomButton>
                    <AtomButton
                      iconLeft={EyeIcon}
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Voir les détails du client"
                      title="Voir détails"
                      disabled={disabled}
                      onClick={() => onViewDetails(client)}
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
