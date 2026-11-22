import { useId } from "react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { Checkbox } from "@/components/ui/checkbox"
import { MField } from "./m-field"

// Formulaire de dépôt (création et modification). Le code est généré par le
// backend : il reste toujours en lecture seule. Pour un SUPERADMIN, le point de
// vente de rattachement est requis à la création ; pour un ADMIN il est forcé
// côté API et le champ est masqué.

export type MDepotFormValues = {
  depot_code: string
  depot_name: string
  depot_address: string
  depot_description: string
  is_active: boolean
  point_of_sale_id: string
}

export type MDepotFormErrors = Partial<Record<keyof MDepotFormValues, string>>

export const EMPTY_DEPOT_FORM: MDepotFormValues = {
  depot_code: "",
  depot_name: "",
  depot_address: "",
  depot_description: "",
  is_active: true,
  point_of_sale_id: "",
}

export type MDepotFormProps = {
  values: MDepotFormValues
  errors: MDepotFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MDepotFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  /** Affiche le champ point de vente (SUPERADMIN uniquement). */
  showPointOfSale?: boolean
  /** Rend le point de vente obligatoire (création par un SUPERADMIN). */
  pointOfSaleRequired?: boolean
}

export function MDepotForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
  showPointOfSale = false,
  pointOfSaleRequired = false,
}: MDepotFormProps) {
  const addressId = useId()
  const descriptionId = useId()
  const activeId = useId()

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
            Le code est généré automatiquement par le backend ; le nom est
            affiché dans les sélecteurs de stock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Nom du dépôt"
            id="depotName"
            value={values.depot_name}
            error={errors.depot_name}
            placeholder="Ex. Réserve principale"
            onChange={(event) => onChange({ depot_name: event.target.value })}
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
            Facultatif, mais utile pour retrouver le lieu de stockage.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <AtomLabel htmlFor={addressId}>Adresse</AtomLabel>
            <AtomTextarea
              id={addressId}
              rows={2}
              value={values.depot_address}
              placeholder="Ex. Zone industrielle, Abidjan"
              onChange={(event) =>
                onChange({ depot_address: event.target.value })
              }
              aria-invalid={errors.depot_address ? true : undefined}
              disabled={submitting}
            />
            {errors.depot_address ? (
              <p className="text-xs text-destructive">{errors.depot_address}</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <AtomLabel htmlFor={descriptionId}>Description</AtomLabel>
            <AtomTextarea
              id={descriptionId}
              rows={3}
              value={values.depot_description}
              placeholder="Ex. Stock central, réception des livraisons…"
              onChange={(event) =>
                onChange({ depot_description: event.target.value })
              }
              aria-invalid={errors.depot_description ? true : undefined}
              disabled={submitting}
            />
            {errors.depot_description ? (
              <p className="text-xs text-destructive">
                {errors.depot_description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {showPointOfSale ? (
        <section className="grid gap-4">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-medium">Rattachement</h4>
            <p className="text-xs text-muted-foreground">
              Chaque dépôt appartient à un seul point de vente.
            </p>
          </div>
          <MField
            label="Point de vente (UUID)"
            id="depotPointOfSale"
            value={values.point_of_sale_id}
            error={errors.point_of_sale_id}
            description="Identifiant UUID du point de vente cible. Requis à la création par un superadmin."
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

      <section className="grid gap-3">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id={activeId}
            checked={values.is_active}
            disabled={submitting}
            onCheckedChange={(value) => onChange({ is_active: value === true })}
          />
          <label htmlFor={activeId} className="grid cursor-pointer gap-0.5">
            <span className="text-sm font-medium">Dépôt actif</span>
            <span className="text-xs text-muted-foreground">
              Un dépôt inactif reste visible mais n&apos;est plus proposé dans
              les sélecteurs de stock.
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
