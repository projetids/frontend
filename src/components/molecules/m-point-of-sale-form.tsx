import { useId } from "react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"

export type MPointOfSaleFormValues = {
  point_of_sale_code: string
  point_of_sale_name: string
  address: string
  description: string
}

export type MPointOfSaleFormErrors = Partial<
  Record<keyof MPointOfSaleFormValues, string>
>

export const EMPTY_POINT_OF_SALE_FORM: MPointOfSaleFormValues = {
  point_of_sale_code: "",
  point_of_sale_name: "",
  address: "",
  description: "",
}

export type MPointOfSaleFormProps = {
  values: MPointOfSaleFormValues
  errors: MPointOfSaleFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MPointOfSaleFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
}

export function MPointOfSaleForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
}: MPointOfSaleFormProps) {
  const addressId = useId()
  const descriptionId = useId()

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
          <h4 className="text-sm font-medium">Identité</h4>
          <p className="text-xs text-muted-foreground">
            Le code est généré automatiquement par le backend s'il est omis ; le
            nom est affiché dans les sélecteurs.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Nom du point de vente"
            id="pointOfSaleName"
            value={values.point_of_sale_name}
            error={errors.point_of_sale_name}
            placeholder="Ex. Boutique Centre-Ville"
            onChange={(event) =>
              onChange({ point_of_sale_name: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
            required
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Localisation</h4>
          <p className="text-xs text-muted-foreground">
            Facultatif, mais utile pour retrouver le lieu commercial.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <AtomLabel htmlFor={addressId}>Adresse</AtomLabel>
            <AtomTextarea
              id={addressId}
              rows={2}
              value={values.address}
              placeholder="Ex. Avenue de l'Indépendance, Abidjan"
              onChange={(event) => onChange({ address: event.target.value })}
              aria-invalid={errors.address ? true : undefined}
              disabled={submitting}
            />
            {errors.address ? (
              <p className="text-xs text-destructive">{errors.address}</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <AtomLabel htmlFor={descriptionId}>Description</AtomLabel>
            <AtomTextarea
              id={descriptionId}
              rows={3}
              value={values.description}
              placeholder="Ex. Point de vente principal…"
              onChange={(event) => onChange({ description: event.target.value })}
              aria-invalid={errors.description ? true : undefined}
              disabled={submitting}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>
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