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
  formatSignedStockQuantity,
  formatStockDateTime,
  isOutflowType,
  movementReference,
  mouvementTypeLabel,
  stockArticleLabel,
  stockDepotLabel,
} from "@/lib/stocks"
import { cn } from "cn"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiStockMovement,
} from "@/types/api"

// Journal append-only des mouvements de stock. Les quantités sont signées :
// positives pour les entrées, négatives pour les sorties. La colonne « Point
// de vente » n'est affichée qu'au SUPERADMIN.

export type OStockMovementsTableProps = {
  movements: ApiStockMovement[]
  articles: ApiArticleOption[]
  depots: ApiDepotOption[]
  loading: boolean
  error: string | null
  showPointOfSale?: boolean
  onRetry: () => void
}

export function OStockMovementsTable({
  movements,
  articles,
  depots,
  loading,
  error,
  showPointOfSale = false,
  onRetry,
}: OStockMovementsTableProps) {
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
            <TableHead className="w-40">Date</TableHead>
            <TableHead>Article</TableHead>
            <TableHead>Dépôt</TableHead>
            <TableHead className="w-36">Type</TableHead>
            <TableHead className="w-24 text-right">Quantité</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Motif</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
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
          ) : movements.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun mouvement ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            movements.map((movement) => {
              const outflow = isOutflowType(movement.type)
              const qty = Number(movement.qty)
              return (
                <TableRow key={movement.mouvement_id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatStockDateTime(movement.movement_date)}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <span
                      className="block truncate font-medium"
                      title={stockArticleLabel(articles, movement.article_id)}
                    >
                      {stockArticleLabel(articles, movement.article_id)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <span
                      className="block truncate text-sm text-muted-foreground"
                      title={stockDepotLabel(depots, movement.depot_id)}
                    >
                      {stockDepotLabel(depots, movement.depot_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AtomBadge variant={outflow ? "destructive" : "secondary"}>
                      {mouvementTypeLabel(movement.type)}
                    </AtomBadge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      Number.isFinite(qty) && qty < 0
                        ? "text-destructive"
                        : null
                    )}
                  >
                    {formatSignedStockQuantity(movement.qty)}
                  </TableCell>
                  <TableCell className="max-w-44">
                    <span
                      className="block truncate text-xs text-muted-foreground"
                      title={movementReference(movement)}
                    >
                      {movementReference(movement)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <span
                      className="block truncate text-sm"
                      title={movement.motif ?? undefined}
                    >
                      {movement.motif?.trim() || "—"}
                    </span>
                  </TableCell>
                  {showPointOfSale ? (
                    <TableCell>
                      <span
                        className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                        title={movement.point_of_sale_id}
                      >
                        {movement.point_of_sale_id}
                      </span>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
