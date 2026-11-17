import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import {
  createAchatLine,
  MAchatLinesEditor,
  type MAchatLineError,
  type MAchatLineValues,
} from "./m-achat-lines"
import type {
  ApiArticleOption,
  ApiBonReception,
  ApiCommandeAchat,
  ApiSupplier,
} from "@/types/api"

// Formulaire de création d'une facture d'achat (FAA). Document financier sans
// impact stock : il peut être rapproché d'un bon de commande et/ou d'un bon de
// réception. Le code `FAA-…` est généré par le backend.

export type MFactureAchatFormValues = {
  supplier_id: string
  commande_id: string
  reception_id: string
  supplier_invoice_ref: string
  invoice_date: string
  point_of_sale_id: string
  notes: string
  lines: MAchatLineValues[]
}

export type MFactureAchatFormErrors = Partial<
  Record<keyof MFactureAchatFormValues, string>
> & {
  lineErrors?: Record<number, MAchatLineError>
}

export function createEmptyFactureAchatForm(): MFactureAchatFormValues {
  return {
    supplier_id: "",
    commande_id: "",
    reception_id: "",
    supplier_invoice_ref: "",
    invoice_date: "",
    point_of_sale_id: "",
    notes: "",
    lines: [createAchatLine()],
  }
}

export type MFactureAchatFormProps = {
  values: MFactureAchatFormValues
  errors: MFactureAchatFormErrors
  suppliers: ApiSupplier[]
  articles: ApiArticleOption[]
  commandes: ApiCommandeAchat[]
  receptions: ApiBonReception[]
  /** Affiche le champ point de vente (SUPERADMIN). */
  isSuperadmin?: boolean
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  formId?: string
  showActions?: boolean
  onChange: (patch: Partial<MFactureAchatFormValues>) => void
  /** Appelé quand la commande de rapprochement change. */
  onCommandeChange?: (commande_id: string) => void
  /** Appelé quand la réception de rapprochement change. */
  onReceptionChange?: (reception_id: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MFactureAchatForm({
  values,
  errors,
  suppliers,
  articles,
  commandes,
  receptions,
  isSuperadmin = false,
  optionsLoading = false,
  optionsError,
  submitting,
  formId,
  showActions = true,
  onChange,
  onCommandeChange,
  onReceptionChange,
  onSubmit,
  onCancel,
}: MFactureAchatFormProps) {
  const disabled = submitting || optionsLoading

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.supplier_id,
    label: `${supplier.suppliers_name} · ${supplier.supplier_number}`,
  }))
  const commandeOptions = [
    { value: "none", label: "Aucune commande liée" },
    ...commandes.map((commande) => ({
      value: commande.commande_id,
      label: commande.commande_code,
    })),
  ]
  const receptionOptions = [
    { value: "none", label: "Aucune réception liée" },
    ...receptions.map((reception) => ({
      value: reception.reception_id,
      label: reception.reception_code,
    })),
  ]

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
          <h4 className="text-sm font-medium">Facture fournisseur</h4>
          <p className="text-xs text-muted-foreground">
            Document financier : aucun mouvement de stock n&apos;est généré.
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
            label="Réf. facture fournisseur"
            value={values.supplier_invoice_ref}
            error={errors.supplier_invoice_ref}
            placeholder="FV-FRN-00123"
            onChange={(event) =>
              onChange({ supplier_invoice_ref: event.target.value })
            }
            autoComplete="off"
            disabled={disabled}
          />
          <MField
            label="Date de facture"
            type="date"
            value={values.invoice_date}
            error={errors.invoice_date}
            onChange={(event) => onChange({ invoice_date: event.target.value })}
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
          <MSelectField
            label="Commande rapprochée"
            value={values.commande_id || "none"}
            onValueChange={(value) => {
              const commande_id = value === "none" ? "" : value
              onChange({ commande_id })
              onCommandeChange?.(commande_id)
            }}
            options={commandeOptions}
            error={errors.commande_id}
            disabled={disabled}
            searchPlaceholder="Rechercher une commande…"
          />
          <MSelectField
            label="Réception rapprochée"
            value={values.reception_id || "none"}
            onValueChange={(value) => {
              const reception_id = value === "none" ? "" : value
              onChange({ reception_id })
              onReceptionChange?.(reception_id)
            }}
            options={receptionOptions}
            description="Optionnel : rapproche la facture d'un bon de réception."
            error={errors.reception_id}
            disabled={disabled}
            searchPlaceholder="Rechercher une réception…"
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor="factureAchatNotes">Notes</AtomLabel>
          <AtomTextarea
            id="factureAchatNotes"
            rows={2}
            value={values.notes}
            placeholder="Conditions de paiement, échéance…"
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
        qtyLabel="Qté facturée"
        addLabel="Ajouter une ligne"
      />

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={disabled}>
            {submitting ? "Enregistrement…" : "Créer la facture"}
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
