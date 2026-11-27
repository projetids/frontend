import { BanIcon, EyeIcon } from "lucide-react"
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
  depotVenteLabel,
  formatVenteDateTime,
  formatVenteMoney,
  modePaiementLabel,
  venteComptantStatusLabel,
  venteStatusBadgeVariant,
} from "@/lib/ventes"
import type {
  ApiClientOptionVente,
  ApiDepotOption,
  ApiVenteComptant,
} from "@/types/api"

// Liste des ventes au comptant (VC). Validation = encaissement + sortie stock
// (BL implicite) sur le dépôt source.

export type OVentesComptantTableProps = {
  ventes: ApiVenteComptant[]
  clients: ApiClientOptionVente[]
  depots: ApiDepotOption[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onView: (vente: ApiVenteComptant) => void
  /** Annulation réservée aux admins disposant de A40 + A31. */
  onAnnuler?: (vente: ApiVenteComptant) => void
  onRetry: () => void
}

export function OVentesComptantTable({
  ventes,
  clients,
  depots,
  loading,
  error,
  showPointOfSale = false,
  onView,
  onAnnuler,
  onRetry,
}: OVentesComptantTableProps) {
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

  const columnCount = showPointOfSale ? 10 : 9

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Code</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Dépôt</TableHead>
            <TableHead className="w-40">Mode de paiement</TableHead>
            <TableHead className="w-36 text-right">Montant TTC</TableHead>
            <TableHead className="w-36 text-right">Encaissé</TableHead>
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
          ) : ventes.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune vente au comptant ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            ventes.map((vente) => (
              <TableRow key={vente.vente_id}>
                <TableCell className="font-medium">
                  {vente.vente_code}
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={clientVenteLabel(clients, vente.client_id)}
                  >
                    {clientVenteLabel(clients, vente.client_id)}
                  </span>
                </TableCell>
                <TableCell className="max-w-56">
                  <span
                    className="block truncate"
                    title={depotVenteLabel(depots, vente.depot_id)}
                  >
                    {depotVenteLabel(depots, vente.depot_id)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {modePaiementLabel(vente.mode_paiement)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(vente.montant_ttc)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(vente.montant_encaisse)}
                </TableCell>
                <TableCell>
                  <AtomBadge variant={venteStatusBadgeVariant(vente.status)}>
                    {venteComptantStatusLabel(vente.status)}
                  </AtomBadge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatVenteDateTime(vente.created_at)}
                </TableCell>
                {showPointOfSale ? (
                  <TableCell>
                    <span
                      className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                      title={vente.point_of_sale_id}
                    >
                      {vente.point_of_sale_id}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AtomButton
                      size="icon-sm"
                      variant="ghost"
                      iconLeft={EyeIcon}
                      aria-label="Voir la vente"
                      title="Voir le détail"
                      onClick={() => onView(vente)}
                    >
                      <span className="sr-only">Voir le détail</span>
                    </AtomButton>
                    {onAnnuler && vente.status === "VALIDEE" && !vente.facture_id ? (
                      <AtomButton
                        size="icon-sm"
                        variant="ghost"
                        iconLeft={BanIcon}
                        aria-label="Annuler la vente"
                        title="Annuler la vente (retour en stock)"
                        onClick={() => onAnnuler(vente)}
                      >
                        <span className="sr-only">Annuler la vente</span>
                      </AtomButton>
                    ) : null}
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
