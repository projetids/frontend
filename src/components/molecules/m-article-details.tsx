import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Archive,
  Barcode,
  Boxes,
  CalendarDays,
  DollarSign,
  Hash,
  Layers,
  MapPin,
  Package,
  Percent,
  Ruler,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  User,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import {
  articleUnitLabel,
  formatArticleDate,
  formatArticlePrice,
  formatArticleQuantity,
  formatArticleRate,
} from "@/lib/articles"
import type { ApiArticle } from "@/types/api"

// Fiche article en lecture seule, affichée dans la modal « Voir détails ».
// Organisée en sections : identification, tarification, stock, traçabilité.

type DetailRowProps = {
  icon: LucideIcon
  label: string
  value?: string | null
  mono?: boolean
  multiline?: boolean
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  multiline,
}: DetailRowProps) {
  const displayed = value?.trim() ? value : "—"

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "text-sm font-medium",
            mono ? "font-mono text-xs break-all" : null,
            multiline ? "whitespace-pre-line" : "truncate"
          )}
        >
          {displayed}
        </dd>
      </div>
    </div>
  )
}

type DetailSectionProps = {
  title: string
  children: ReactNode
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="grid gap-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

export type MArticleDetailsProps = {
  article: ApiArticle
  /** Nom résolu de la famille (l'article ne renvoie que son identifiant). */
  familyName?: string
}

export function MArticleDetails({ article, familyName }: MArticleDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Package className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">
            {article.article_name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <Hash className="size-3" />
              {article.article_code}
            </AtomBadge>
            <AtomBadge variant="outline">
              {articleUnitLabel(article.article_unit)}
            </AtomBadge>
            <AtomBadge variant={article.is_publish ? "secondary" : "outline"}>
              {article.is_publish ? "Publié" : "En veille"}
            </AtomBadge>
            <AtomBadge variant="outline">
              {familyName ?? `#${article.article_families_id}`}
            </AtomBadge>
          </div>
        </div>
      </div>

      <DetailSection title="Identification">
        <DetailRow
          icon={Hash}
          label="Code article"
          value={article.article_code}
          mono
        />
        <DetailRow
          icon={Tag}
          label="Désignation"
          value={article.article_name}
        />
        <DetailRow
          icon={Layers}
          label="Famille"
          value={familyName ?? `#${article.article_families_id}`}
        />
        <DetailRow
          icon={Ruler}
          label="Unité"
          value={articleUnitLabel(article.article_unit)}
        />
        <DetailRow
          icon={Barcode}
          label="Code-barres"
          value={article.article_barcode}
          mono
        />
        <DetailRow
          icon={Tag}
          label="Référence"
          value={article.article_reference}
        />
        <DetailRow
          icon={MapPin}
          label="Emplacement"
          value={article.article_location}
          multiline
        />
      </DetailSection>

      <DetailSection title="Tarification">
        <DetailRow
          icon={Percent}
          label="Taux de TVA"
          value={formatArticleRate(article.article_tva_rate)}
        />
        <DetailRow
          icon={ShoppingCart}
          label="Prix d'achat HT"
          value={formatArticlePrice(article.article_purchase_price_ht)}
        />
        <DetailRow
          icon={ShoppingCart}
          label="Prix d'achat TTC"
          value={formatArticlePrice(article.article_purchase_price_ttc)}
        />
        <DetailRow
          icon={TrendingUp}
          label="Marge"
          value={formatArticlePrice(article.article_margin)}
        />
        <DetailRow
          icon={DollarSign}
          label="Prix de vente HT"
          value={formatArticlePrice(article.article_sale_price_ht)}
        />
        <DetailRow
          icon={DollarSign}
          label="Prix de vente TTC"
          value={formatArticlePrice(article.article_sale_price_ttc)}
        />
      </DetailSection>

      <DetailSection title="Stock">
        <DetailRow
          icon={Boxes}
          label="Stock théorique"
          value={formatArticleQuantity(article.article_theoretical_stock)}
        />
        <DetailRow
          icon={Archive}
          label="Quantité réservée"
          value={formatArticleQuantity(article.article_reserved_qty)}
        />
        <DetailRow
          icon={Boxes}
          label="Quantité disponible"
          value={formatArticleQuantity(article.article_available_qty)}
        />
      </DetailSection>

      <DetailSection title="Traçabilité">
        <DetailRow
          icon={Hash}
          label="Identifiant article"
          value={article.article_id}
          mono
        />
        <DetailRow
          icon={Store}
          label="Point de vente"
          value={article.point_of_sale_id}
          mono
        />
        <DetailRow
          icon={User}
          label="Créé par"
          value={article.created_by}
          mono
        />
        <DetailRow
          icon={CalendarDays}
          label="Créé le"
          value={formatArticleDate(article.created_at)}
        />
        <DetailRow
          icon={CalendarDays}
          label="Mis à jour le"
          value={formatArticleDate(article.updated_at)}
        />
      </DetailSection>

      <p className="text-xs text-muted-foreground">
        Les quantités affichées sont dénormalisées et seront pilotées par les
        mouvements de stock.
      </p>
    </div>
  )
}
