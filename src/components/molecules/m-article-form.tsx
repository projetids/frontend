import { useId } from "react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { Checkbox } from "@/components/ui/checkbox"
import { ARTICLE_UNIT_OPTIONS, formatArticlePrice, formatArticleRate } from "@/lib/articles"
import type {
  ApiArticleFamily,
  ApiArticlePrices,
  ApiArticleUnit,
} from "@/types/api"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"

// Formulaire d'article (création et modification). Reprend le DTO de l'API :
// code, désignation, unité et famille sont requis ; les codes secondaires, les
// prix et les quantités sont facultatifs. Les montants sont saisis en texte
// décimal (virgule acceptée) et envoyés en chaînes, conformément au contrat.

export type MArticleFormValues = {
  is_publish: boolean
  article_code: string
  article_name: string
  article_unit: ApiArticleUnit
  article_families_id: string
  article_barcode: string
  article_tva_rate: string
  article_purchase_price_ht: string
  article_purchase_price_ttc: string
  /** Taux de marge saisi (%) : c'est cette valeur que l'API enregistre. */
  article_margin_rate: string
  /** Montant de marge calculé par l'API (lecture seule). */
  article_margin: string
  article_sale_price_ht: string
  article_sale_price_ttc: string
  article_theoretical_stock: string
  article_reserved_qty: string
  article_available_qty: string
  article_location: string
  point_of_sale_id: string
}

export type MArticleFormErrors = Partial<
  Record<keyof MArticleFormValues, string>
>

export const EMPTY_ARTICLE_FORM: MArticleFormValues = {
  is_publish: true,
  article_code: "",
  article_name: "",
  article_unit: "piece",
  article_families_id: "",
  article_barcode: "",
  article_tva_rate: "20",
  article_purchase_price_ht: "0",
  article_purchase_price_ttc: "0",
  article_margin_rate: "30",
  article_margin: "0",
  article_sale_price_ht: "0",
  article_sale_price_ttc: "0",
  article_theoretical_stock: "0",
  article_reserved_qty: "0",
  article_available_qty: "0",
  article_location: "",
  point_of_sale_id: "",
}

export type MArticleFormProps = {
  values: MArticleFormValues
  errors: MArticleFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MArticleFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Familles disponibles pour le sélecteur (GET /article-families/select). */
  families: ApiArticleFamily[]
  familiesLoading?: boolean
  familiesError?: string | null
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  /** Affiche le champ point de vente (SUPERADMIN uniquement). */
  showPointOfSale?: boolean
  /** Rend le point de vente obligatoire (création par un SUPERADMIN). */
  pointOfSaleRequired?: boolean
  /** Mode modification : le code généré est affiché en lecture seule. */
  editing?: boolean
  /** Résultat de `POST /articles/pricing/preview` (calcul en direct). */
  pricingPreview?: ApiArticlePrices | null
  /** Calcul des prix en cours (appel API en différé). */
  pricingLoading?: boolean
}

export function MArticleForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  families,
  familiesLoading = false,
  familiesError,
  formId,
  showActions = true,
  showPointOfSale = false,
  pointOfSaleRequired = false,
  pricingPreview = null,
  pricingLoading = false,
}: MArticleFormProps) {
  const barcodeId = useId()
  const locationId = useId()
  const publishId = useId()

  const familyOptions = families.map((family) => ({
    value: String(family.article_families_id),
    label: family.article_families_name,
  }))

  const familyDescription = familiesLoading
    ? "Chargement des familles d'articles…"
    : familiesError
      ? familiesError
      : familyOptions.length === 0
        ? "Aucune famille disponible : créez d'abord une famille d'articles."
        : ""

  return (
    <form
      id={formId}
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Identification</h4>
          <p className="text-xs text-muted-foreground">
            La désignation, la famille et l&apos;unité sont obligatoires. Le
            code article est généré automatiquement par le serveur.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* <MField
            label="Code article"
            id="articleCode"
            value={values.article_code}
            description={
              editing
                ? "Code généré par le serveur : non modifiable."
                : "Généré à l'enregistrement (3 premiers caractères du nom + numéro)."
            }
            placeholder={editing ? undefined : "Généré automatiquement"}
            readOnly
            autoComplete="off"
            maxLength={100}
            disabled={submitting}
          /> */}
          <MField
            label="Désignation"
            id="articleName"
            value={values.article_name}
            error={errors.article_name}
            placeholder="Ex. Eau minérale 1L"
            onChange={(event) => onChange({ article_name: event.target.value })}
            autoComplete="off"
            maxLength={255}
            disabled={submitting}
            required
          />
          <MSelectField
            label="Famille d'articles"
            id="articleFamily"
            value={values.article_families_id}
            onValueChange={(value) => onChange({ article_families_id: value })}
            options={familyOptions}
            placeholder={
              familiesLoading ? "Chargement…" : "Sélectionner une famille…"
            }
            description={familyDescription}
            error={errors.article_families_id}
            disabled={submitting || familiesLoading}
            required
          />
          <MSelectField
            label="Unité"
            id="articleUnit"
            value={values.article_unit}
            onValueChange={(value) =>
              onChange({ article_unit: value as ApiArticleUnit })
            }
            options={ARTICLE_UNIT_OPTIONS}
            placeholder="Sélectionner une unité…"
            error={errors.article_unit}
            disabled={submitting}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Code-barres"
            id={barcodeId}
            value={values.article_barcode}
            error={errors.article_barcode}
            placeholder="Ex. 1234567890123"
            onChange={(event) =>
              onChange({ article_barcode: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor={locationId}>Emplacement</AtomLabel>
          <AtomTextarea
            id={locationId}
            rows={2}
            value={values.article_location}
            placeholder="Ex. Rayon A1, étagère 2"
            onChange={(event) =>
              onChange({ article_location: event.target.value })
            }
            aria-invalid={errors.article_location ? true : undefined}
            disabled={submitting}
          />
          {errors.article_location ? (
            <p className="text-xs text-destructive">
              {errors.article_location}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 border-t pt-6">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Tarification</h4>
          <p className="text-xs text-muted-foreground">
            Montants en Ariary. Laissez à 0 si l&apos;article n&apos;est pas
            encore valorisé.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MField
            label="Taux de TVA (%)"
            id="articleTva"
            type="text"
            inputMode="decimal"
            value={values.article_tva_rate}
            error={errors.article_tva_rate}
            placeholder="0.00"
            onChange={(event) =>
              onChange({ article_tva_rate: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Prix d'achat HT"
            id="articlePurchaseHt"
            type="text"
            inputMode="decimal"
            value={values.article_purchase_price_ht}
            error={errors.article_purchase_price_ht}
            placeholder="0.00"
            onChange={(event) =>
              onChange({ article_purchase_price_ht: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Prix d'achat TTC"
            id="articlePurchaseTtc"
            type="text"
            inputMode="decimal"
            value={values.article_purchase_price_ttc}
            error={errors.article_purchase_price_ttc}
            placeholder="0.00"
            onChange={(event) =>
              onChange({ article_purchase_price_ttc: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Taux de marge (%)"
            id="articleMarginRate"
            type="text"
            inputMode="decimal"
            value={values.article_margin_rate}
            error={errors.article_margin_rate}
            placeholder="30.00"
            description="Le montant de marge est calculé par l'API."
            onChange={(event) =>
              onChange({ article_margin_rate: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Prix de vente HT"
            id="articleSaleHt"
            type="text"
            inputMode="decimal"
            value={values.article_sale_price_ht}
            error={errors.article_sale_price_ht}
            placeholder="0.00"
            onChange={(event) =>
              onChange({ article_sale_price_ht: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Prix de vente TTC"
            id="articleSaleTtc"
            type="text"
            inputMode="decimal"
            value={values.article_sale_price_ttc}
            error={errors.article_sale_price_ttc}
            placeholder="0.00"
            onChange={(event) =>
              onChange({ article_sale_price_ttc: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
        </div>
        {(pricingPreview || pricingLoading) ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <p className="mb-2 flex items-center gap-2 font-medium">
              Aperçu du calcul
              {pricingLoading ? (
                <span className="text-muted-foreground">(calcul…)</span>
              ) : null}
            </p>
            {pricingPreview ? (
              <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">PA HT</dt>
                  <dd className="font-medium">{formatArticlePrice(pricingPreview.article_purchase_price_ht)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">PA TTC</dt>
                  <dd className="font-medium">{formatArticlePrice(pricingPreview.article_purchase_price_ttc)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">PV HT</dt>
                  <dd className="font-medium">{formatArticlePrice(pricingPreview.article_sale_price_ht)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">PV TTC</dt>
                  <dd className="font-medium">{formatArticlePrice(pricingPreview.article_sale_price_ttc)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Marge</dt>
                  <dd className="font-medium">{formatArticlePrice(pricingPreview.article_margin)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Taux de marge</dt>
                  <dd className="font-medium">{formatArticleRate(pricingPreview.article_margin_rate)}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 border-t pt-6">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Stock</h4>
          <p className="text-xs text-muted-foreground">
            Quantités dénormalisées, à titre indicatif : elles seront pilotées
            par les mouvements de stock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MField
            label="Stock théorique"
            id="articleTheoreticalStock"
            type="text"
            inputMode="decimal"
            value={values.article_theoretical_stock}
            error={errors.article_theoretical_stock}
            placeholder="0.000"
            onChange={(event) =>
              onChange({ article_theoretical_stock: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Quantité réservée"
            id="articleReservedQty"
            type="text"
            inputMode="decimal"
            value={values.article_reserved_qty}
            error={errors.article_reserved_qty}
            placeholder="0.000"
            onChange={(event) =>
              onChange({ article_reserved_qty: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Quantité disponible"
            id="articleAvailableQty"
            type="text"
            inputMode="decimal"
            value={values.article_available_qty}
            error={errors.article_available_qty}
            placeholder="0.000"
            onChange={(event) =>
              onChange({ article_available_qty: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </section>

      {showPointOfSale ? (
        <section className="grid gap-4 border-t pt-6">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-medium">Rattachement</h4>
            <p className="text-xs text-muted-foreground">
              Chaque article appartient à un seul point de vente.
            </p>
          </div>
          <MField
            label="Point de vente (UUID)"
            id="articlePointOfSale"
            value={values.point_of_sale_id}
            error={errors.point_of_sale_id}
            description="Identifiant UUID du point de vente cible. Requis pour un superadmin."
            placeholder="00000000-0000-0000-0000-000000000000"
            onChange={(event) =>
              onChange({ point_of_sale_id: event.target.value.trim() })
            }
            autoComplete="off"
            disabled={submitting}
            required={pointOfSaleRequired}
          />
        </section>
      ) : null}

      <section className="grid gap-3 border-t pt-6">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id={publishId}
            checked={values.is_publish}
            disabled={submitting}
            onCheckedChange={(value) =>
              onChange({ is_publish: value === true })
            }
          />
          <label htmlFor={publishId} className="grid cursor-pointer gap-0.5">
            <span className="text-sm font-medium">Article publié</span>
            <span className="text-xs text-muted-foreground">
              Un article en veille reste consultable mais n&apos;est plus
              proposé dans les sélecteurs de vente.
            </span>
          </label>
        </div>
      </section>

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : submitLabel}
          </AtomButton>
          <AtomButton
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
          >
            Annuler
          </AtomButton>
        </div>
      ) : null}
    </form>
  )
}
