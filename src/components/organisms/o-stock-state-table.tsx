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
  formatStockQuantity,
  stockArticleLabel,
  stockDepotLabel,
  stockStateLabel,
  stockStateTone,
} from "@/lib/stocks"
import { cn } from "cn"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiStockStateRow,
} from "@/types/api"

// État de stock théorique agrégé par article × dépôt. La colonne « Point de
// vente » n'est affichée qu'au SUPERADMIN, seul rôle non scopé à un POS.

export type OStockStateTableProps = {
  rows: ApiStockStateRow[]
  /** Articles chargés pour résoudre les noms à partir des identifiants. */
  articles: ApiArticleOption[]
  /** Dépôts chargés pour résoudre les noms à partir des identifiants. */
  depots: ApiDepotOption[]
  loading: boolean
  error: string | null
  /** Affiche la colonne point de vente (SUPERADMIN). */
  showPointOfSale?: boolean
  onRetry: () => void
}

export function OStockStateTable({
  rows,
  articles,
  depots,
  loading,
  error,
  showPointOfSale = false,
  onRetry,
}: OStockStateTableProps) {
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

  const columnCount = showPointOfSale ? 5 : 4

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Dépôt</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
            <TableHead className="w-32 text-right">Stock théorique</TableHead>
            <TableHead className="w-28">Statut</TableHead>
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
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun mouvement de stock ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const tone = stockStateTone(row.qty)
              return (
                <TableRow key={`${row.article_id}:${row.depot_id}`}>
                  <TableCell className="max-w-64">
                    <span
                      className="block truncate font-medium"
                      title={stockArticleLabel(articles, row.article_id)}
                    >
                      {stockArticleLabel(articles, row.article_id)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <span
                      className="block truncate text-sm text-muted-foreground"
                      title={stockDepotLabel(depots, row.depot_id)}
                    >
                      {stockDepotLabel(depots, row.depot_id)}
                    </span>
                  </TableCell>
                  {showPointOfSale ? (
                    <TableCell>
                      <span
                        className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                        title={row.point_of_sale_id}
                      >
                        {row.point_of_sale_id}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      tone === "negative" ? "text-destructive" : null,
                      tone === "zero" ? "text-muted-foreground" : null
                    )}
                  >
                    {formatStockQuantity(row.qty)}
                  </TableCell>
                  <TableCell>
                    <AtomBadge
                      variant={
                        tone === "positive"
                          ? "secondary"
                          : tone === "negative"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {stockStateLabel(row.qty)}
                    </AtomBadge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
