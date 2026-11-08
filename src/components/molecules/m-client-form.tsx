import { AtomButton } from "@/components/atoms"
import { MField } from "./m-field"

// Formulaire de client (création et modification). Les règles reprennent le DTO
// de l'API : `client_name` est requis, les autres champs sont facultatifs. Pour
// un SUPERADMIN, le point de vente de rattachement est requis ; pour un ADMIN il
// est forcé côté API et le champ est masqué.

export type MClientFormValues = {
  client_name: string
  client_telephone: string
  client_matricule: string
  client_corps: string
  client_grade: string
  point_of_sale_id: string
}

export type MClientFormErrors = Partial<Record<keyof MClientFormValues, string>>

export const EMPTY_CLIENT_FORM: MClientFormValues = {
  client_name: "",
  client_telephone: "",
  client_matricule: "",
  client_corps: "",
  client_grade: "",
  point_of_sale_id: "",
}

export type MClientFormProps = {
  values: MClientFormValues
  errors: MClientFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MClientFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  /** Affiche le champ point de vente (SUPERADMIN uniquement). */
  showPointOfSale?: boolean
  /** Rend le point de vente obligatoire (SUPERADMIN). */
  pointOfSaleRequired?: boolean
}

export function MClientForm({
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
}: MClientFormProps) {
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
            Le nom est obligatoire ; le téléphone facilite le contact.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Nom du client"
            id="clientName"
            value={values.client_name}
            error={errors.client_name}
            placeholder="Ex. Client Alpha"
            onChange={(event) => onChange({ client_name: event.target.value })}
            autoComplete="off"
            disabled={submitting}
            required
          />
          <MField
            label="Téléphone"
            id="clientPhone"
            value={values.client_telephone}
            error={errors.client_telephone}
            placeholder="Ex. +225 07 00 00 00 00"
            onChange={(event) =>
              onChange({ client_telephone: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Informations professionnelles</h4>
          <p className="text-xs text-muted-foreground">
            Facultatives, mais utiles pour identifier le client (matricule,
            corps, grade).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Matricule"
            id="clientMatricule"
            value={values.client_matricule}
            error={errors.client_matricule}
            placeholder="Ex. MAT-001"
            onChange={(event) =>
              onChange({ client_matricule: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Corps"
            id="clientCorps"
            value={values.client_corps}
            error={errors.client_corps}
            placeholder="Ex. Infanterie"
            onChange={(event) => onChange({ client_corps: event.target.value })}
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Grade"
            id="clientGrade"
            value={values.client_grade}
            error={errors.client_grade}
            placeholder="Ex. Capitaine"
            onChange={(event) => onChange({ client_grade: event.target.value })}
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </section>

      {showPointOfSale ? (
        <section className="grid gap-4">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-medium">Rattachement</h4>
            <p className="text-xs text-muted-foreground">
              Chaque client appartient à un seul point de vente.
            </p>
          </div>
          <MField
            label="Point de vente (UUID)"
            id="clientPointOfSale"
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
