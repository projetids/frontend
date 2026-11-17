import { AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatVenteMoney,
  formatVenteQuantity,
  venteReportLabel,
} from "@/lib/ventes"
import type { ApiArticleFamily, ApiVenteReportRow } from "@/types/api"

// Rapport de ventes agrégé (BL validés + ventes comptant validées) : par article
// ou par famille. `total_qty` et `total_ht` sont des agrégats SQL.

export type OVentesReportTableProps = {
  mode: "article" | "famille"
  rows: ApiVenteReportRow[]
  families: ApiArticleFamily[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function OVentesReportTable({
  mode,
  rows,
  families,
  loading,
  error,
  onRetry,
}: OVentesReportTableProps) {
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

  const totalQty = rows.reduce(
    (sum, row) => sum + (Number(row.total_qty) || 0),
    0
  )
  const totalHt = rows.reduce(
    (sum, row) => sum + (Number(row.total_ht) || 0),
    0
  )

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {mode === "article" ? "Article" : "Famille d'articles"}
            </TableHead>
            <TableHead className="w-40 text-right">Quantité totale</TableHead>
            <TableHead className="w-40 text-right">
              Chiffre d&apos;affaires HT
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={3}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune vente validée ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={
                  mode === "article"
                    ? `article-${row.article_id}`
                    : `famille-${row.article_families_id}`
                }
              >
                <TableCell className="max-w-64">
                  <span
                    className="block truncate font-medium"
                    title={venteReportLabel(row, families)}
                  >
                    {venteReportLabel(row, families)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteQuantity(row.total_qty)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatVenteMoney(row.total_ht)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!loading && rows.length > 0 ? (
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatVenteQuantity(totalQty)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatVenteMoney(totalHt)}
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  )
}
