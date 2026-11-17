import type { ReactNode } from "react"
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
  articleVenteLabel,
  formatVenteMoney,
  formatVenteQuantity,
  venteLineAmount,
} from "@/lib/ventes"
import type { ApiArticleOption } from "@/types/api"

// Fiche de détail commune aux commandes, livraisons et ventes au comptant :
// métadonnées du document puis lignes article × quantité × prix HT.

export type MVenteDetailField = {
  label: string
  value: ReactNode
}

export type MVenteDetailLine = {
  key: string
  article_id: string
  qty: string
  unit_price_ht?: string
  /** Information complémentaire (quantité livrée, lien commande…). */
  note?: string
}

export type MVenteDocumentDetailsProps = {
  fields: MVenteDetailField[]
  lines: MVenteDetailLine[]
  articles: ApiArticleOption[]
  qtyLabel?: string
  showPrice?: boolean
}

export function MVenteDocumentDetails({
  fields,
  lines,
  articles,
  qtyLabel = "Quantité",
  showPrice = true,
}: MVenteDocumentDetailsProps) {
  const total = lines.reduce(
    (sum, line) => sum + venteLineAmount(line.qty, line.unit_price_ht),
    0
  )
  const columnCount = showPrice ? 5 : 4

  return (
    <div className="grid gap-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="grid gap-0.5">
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
            <dd className="text-sm font-medium wrap-break-word">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead className="w-28 text-right">{qtyLabel}</TableHead>
              {showPrice ? (
                <TableHead className="w-32 text-right">Prix HT</TableHead>
              ) : null}
              {showPrice ? (
                <TableHead className="w-32 text-right">Total HT</TableHead>
              ) : null}
              <TableHead>Complément</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Aucune ligne sur ce document.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell className="max-w-64">
                    <span
                      className="block truncate font-medium"
                      title={articleVenteLabel(articles, line.article_id)}
                    >
                      {articleVenteLabel(articles, line.article_id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVenteQuantity(line.qty)}
                  </TableCell>
                  {showPrice ? (
                    <TableCell className="text-right tabular-nums">
                      {formatVenteMoney(line.unit_price_ht)}
                    </TableCell>
                  ) : null}
                  {showPrice ? (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatVenteMoney(
                        venteLineAmount(line.qty, line.unit_price_ht)
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="max-w-48">
                    <span className="block truncate text-xs text-muted-foreground">
                      {line.note || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {showPrice && lines.length > 0 ? (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total HT</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatVenteMoney(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </div>
  )
}
