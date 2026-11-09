import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import {
  createAchatLine,
  MAchatLinesEditor,
  type MAchatLineError,
  type MAchatLineValues,
} from "./m-achat-lines"
import type { ApiArticleOption, ApiSupplier } from "@/types/api"

// Formulaire de création d'un bon de commande achat (BCA). Aucun impact stock :
// c'est un engagement fournisseur. Les lignes portent la quantité commandée et
// le prix unitaire HT. Le code `BCA-…` est généré par le backend.

export type MCommandeAchatFormValues = {
  supplier_id: string
  point_of_sale_id: string
  expected_date: string
  notes: string
  lines: MAchatLineValues[]
}

export type MCommandeAchatFormErrors = Partial<
  Record<keyof MCommandeAchatFormValues, string>
> & {
  lineErrors?: Record<number, MAchatLineError>
}

export function createEmptyCommandeAchatForm(): MCommandeAchatFormValues {
  return {
    supplier_id: "",
    point_of_sale_id: "",
    expected_date: "",
    notes: "",
    lines: [createAchatLine()],
  }
}

export type MCommandeAchatFormProps = {
  values: MCommandeAchatFormValues
  errors: MCommandeAchatFormErrors
  suppliers: ApiSupplier[]
  articles: ApiArticleOption[]
  /** Affiche le champ point de vente (SUPERADMIN). */
  isSuperadmin?: boolean
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  formId?: string
  showActions?: boolean
  onChange: (patch: Partial<MCommandeAchatFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MCommandeAchatForm({
  values,
  errors,
  suppliers,
  articles,
  isSuperadmin = false,
  optionsLoading = false,
  optionsError,
  submitting,
  formId,
  showActions = true,
  onChange,
  onSubmit,
  onCancel,
}: MCommandeAchatFormProps) {
  const disabled = submitting || optionsLoading

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.supplier_id,
    label: `${supplier.suppliers_name} · ${supplier.supplier_number}`,
  }))

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
      {optionsError ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-destructive">
          {optionsError}
        </p>
      ) : null}

      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Commande fournisseur</h4>
          <p className="text-xs text-muted-foreground">
            Le bon de commande engage le fournisseur sans modifier le stock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Fournisseur"
            value={values.supplier_id}
            onValueChange={(value) => onChange({ supplier_id: value })}
            options={supplierOptions}
            placeholder={
              optionsLoading ? "Chargement…" : "Sélectionner un fournisseur…"
            }
            error={errors.supplier_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un fournisseur…"
          />
          <MField
            label="Date de livraison prévue"
            type="date"
            value={values.expected_date}
            error={errors.expected_date}
            description="Optionnel : date souhaitée de réception."
            onChange={(event) =>
              onChange({ expected_date: event.target.value })
            }
            disabled={disabled}
          />
          {isSuperadmin ? (
            <MField
              label="Point de vente (UUID)"
              value={values.point_of_sale_id}
              error={errors.point_of_sale_id}
              description="Requis pour un superadmin."
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                onChange({ point_of_sale_id: event.target.value.trim() })
              }
              autoComplete="off"
              disabled={disabled}
              required
            />
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor="commandeAchatNotes">Notes</AtomLabel>
          <AtomTextarea
            id="commandeAchatNotes"
            rows={2}
            value={values.notes}
            placeholder="Instructions, conditions de livraison…"
            onChange={(event) => onChange({ notes: event.target.value })}
            disabled={disabled}
          />
          {errors.notes ? (
            <p className="text-xs text-destructive">{errors.notes}</p>
          ) : null}
        </div>
      </section>

      <MAchatLinesEditor
        lines={values.lines}
        errors={errors.lineErrors}
        linesError={errors.lines}
        articles={articles}
        onChange={(lines) => onChange({ lines })}
        disabled={disabled}
        optionsLoading={optionsLoading}
        qtyLabel="Quantité commandée"
        addLabel="Ajouter une ligne"
      />

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={disabled}>
            {submitting ? "Enregistrement…" : "Créer la commande"}
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
