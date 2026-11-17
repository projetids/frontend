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
  ApiCommandeAchat,
  ApiDepotOption,
  ApiSupplier,
} from "@/types/api"

// Formulaire de création d'un bon de réception (BR). Chaque ligne génère une
// ENTRÉE de stock dans le dépôt choisi. Une commande source est optionnelle :
// quand elle est sélectionnée, le parent préremplit le fournisseur et les
// lignes restantes (réception partielle supportée via `commande_ligne_id`).

export type MReceptionAchatFormValues = {
  commande_id: string
  supplier_id: string
  depot_id: string
  point_of_sale_id: string
  notes: string
  lines: MAchatLineValues[]
}

export type MReceptionAchatFormErrors = Partial<
  Record<keyof MReceptionAchatFormValues, string>
> & {
  lineErrors?: Record<number, MAchatLineError>
}

export function createEmptyReceptionAchatForm(): MReceptionAchatFormValues {
  return {
    commande_id: "",
    supplier_id: "",
    depot_id: "",
    point_of_sale_id: "",
    notes: "",
    lines: [createAchatLine()],
  }
}

export type MReceptionAchatFormProps = {
  values: MReceptionAchatFormValues
  errors: MReceptionAchatFormErrors
  suppliers: ApiSupplier[]
  articles: ApiArticleOption[]
  depots: ApiDepotOption[]
  commandes: ApiCommandeAchat[]
  /** Affiche le champ point de vente (SUPERADMIN). */
  isSuperadmin?: boolean
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  formId?: string
  showActions?: boolean
  onChange: (patch: Partial<MReceptionAchatFormValues>) => void
  /** Appelé quand la commande source change (préremplissage côté parent). */
  onCommandeChange?: (commande_id: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MReceptionAchatForm({
  values,
  errors,
  suppliers,
  articles,
  depots,
  commandes,
  isSuperadmin = false,
  optionsLoading = false,
  optionsError,
  submitting,
  formId,
  showActions = true,
  onChange,
  onCommandeChange,
  onSubmit,
  onCancel,
}: MReceptionAchatFormProps) {
  const disabled = submitting || optionsLoading

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.supplier_id,
    label: `${supplier.suppliers_name} · ${supplier.supplier_number}`,
  }))
  const depotOptions = depots.map((depot) => ({
    value: depot.depot_id,
    label: `${depot.depot_name} · ${depot.depot_code}`,
  }))
  const commandeOptions = [
    { value: "none", label: "Aucune commande liée" },
    ...commandes.map((commande) => ({
      value: commande.commande_id,
      label: commande.commande_code,
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
          <h4 className="text-sm font-medium">Réception fournisseur</h4>
          <p className="text-xs text-muted-foreground">
            Les quantités reçues alimentent immédiatement le stock du dépôt.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Commande source"
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
          <MSelectField
            label="Dépôt de réception"
            value={values.depot_id}
            onValueChange={(value) => onChange({ depot_id: value })}
            options={depotOptions}
            placeholder={
              optionsLoading ? "Chargement…" : "Sélectionner un dépôt…"
            }
            description="Seuls les dépôts actifs de votre point de vente sont proposés."
            error={errors.depot_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un dépôt…"
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
          <AtomLabel htmlFor="receptionAchatNotes">Notes</AtomLabel>
          <AtomTextarea
            id="receptionAchatNotes"
            rows={2}
            value={values.notes}
            placeholder="État de la livraison, écarts constatés…"
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
        qtyLabel="Qté reçue"
        addLabel="Ajouter une ligne"
      />

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={disabled}>
            {submitting ? "Enregistrement…" : "Valider la réception"}
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
