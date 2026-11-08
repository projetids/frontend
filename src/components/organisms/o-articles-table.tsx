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
import {
  articleFamilyLabel,
  articleUnitLabel,
  formatArticlePrice,
  formatArticleQuantity,
} from "@/lib/articles"
import type { ApiArticle, ApiArticleFamily } from "@/types/api"

// Tableau des articles. La colonne « Point de vente » n'est affichée qu'au
// SUPERADMIN, seul rôle non scopé à un POS. Les prix et stocks proviennent de
// chaînes décimales : ils sont formatés côté affichage.

export type OArticlesTableProps = {
  articles: ApiArticle[]
  /** Familles chargées pour résoudre les noms à partir des identifiants. */
  families: ApiArticleFamily[]
  loading: boolean
  error: string | null
  disabled?: boolean
  /** Affiche la colonne point de vente (SUPERADMIN). */
  showPointOfSale?: boolean
  onEdit: (article: ApiArticle) => void
  onDelete: (article: ApiArticle) => void
  onViewDetails: (article: ApiArticle) => void
  onRetry: () => void
}

export function OArticlesTable({
  articles,
  families,
  loading,
  error,
  disabled,
  showPointOfSale = false,
  onEdit,
  onDelete,
  onViewDetails,
  onRetry,
}: OArticlesTableProps) {
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

  const columnCount = showPointOfSale ? 9 : 8

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead className="w-36">Code</TableHead>
            <TableHead>Famille</TableHead>
            <TableHead className="w-24">Unité</TableHead>
            <TableHead className="text-right">Prix vente TTC</TableHead>
            <TableHead className="text-right">Stock dispo.</TableHead>
            <TableHead className="w-24">Statut</TableHead>
            {showPointOfSale ? <TableHead>Point de vente</TableHead> : null}
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
          ) : articles.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun article ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            articles.map((article) => {
              const available = Number(article.article_available_qty)
              const inStock = Number.isFinite(available) && available > 0

              return (
                <TableRow key={article.article_id}>
                  <TableCell className="max-w-60">
                    <span className="block truncate font-medium">
                      {article.article_name}
                    </span>
                    {article.article_barcode?.trim() ? (
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {article.article_barcode}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <AtomBadge variant="outline" className="font-mono">
                      {article.article_code}
                    </AtomBadge>
                  </TableCell>
                  <TableCell className="max-w-40">
                    <span className="block truncate text-sm">
                      {articleFamilyLabel(
                        families,
                        article.article_families_id
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {articleUnitLabel(article.article_unit)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatArticlePrice(article.article_sale_price_ttc)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AtomBadge variant={inStock ? "secondary" : "outline"}>
                      {formatArticleQuantity(article.article_available_qty)}
                    </AtomBadge>
                  </TableCell>
                  <TableCell>
                    <AtomBadge
                      variant={article.is_publish ? "secondary" : "outline"}
                    >
                      {article.is_publish ? "Publié" : "En veille"}
                    </AtomBadge>
                  </TableCell>
                  {showPointOfSale ? (
                    <TableCell>
                      <span
                        className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
                        title={article.point_of_sale_id}
                      >
                        {article.point_of_sale_id}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <AtomButton
                        iconLeft={EditIcon}
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Modifier l'article"
                        title="Modifier"
                        disabled={disabled}
                        onClick={() => onEdit(article)}
                      >
                        <span className="sr-only">Modifier</span>
                      </AtomButton>
                      <AtomButton
                        iconLeft={TrashIcon}
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive"
                        aria-label="Supprimer l'article"
                        title="Supprimer"
                        disabled={disabled}
                        onClick={() => onDelete(article)}
                      >
                        <span className="sr-only">Supprimer</span>
                      </AtomButton>
                      <AtomButton
                        iconLeft={EyeIcon}
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Voir les détails de l'article"
                        title="Voir détails"
                        disabled={disabled}
                        onClick={() => onViewDetails(article)}
                      >
                        <span className="sr-only">Voir détails</span>
                      </AtomButton>
                    </div>
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
