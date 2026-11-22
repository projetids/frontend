import { useId } from "react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { CIVILITY_OPTIONS } from "@/lib/suppliers"
import type { ApiCivility } from "@/types/api"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"

// Formulaire fournisseur (création et modification). Les règles reprennent le
// DTO de l'API : `name` requis, `civility` parmi Mr / Mme / Mdlle, e-mail et
// téléphone optionnels mais validés si renseignés. Le numéro est généré par le
// backend : il reste toujours en lecture seule (création comme modification).

export type MSupplierFormValues = {
  supplier_number: string
  suppliers_name: string
  suppliers_civility: ApiCivility
  suppliers_contact_name: string
  suppliers_address: string
  suppliers_telephone: string
  suppliers_email: string
}

export type MSupplierFormErrors = Partial<
  Record<keyof MSupplierFormValues, string>
>

export const EMPTY_SUPPLIER_FORM: MSupplierFormValues = {
  supplier_number: "",
  suppliers_name: "",
  suppliers_civility: "Mr",
  suppliers_contact_name: "",
  suppliers_address: "",
  suppliers_telephone: "",
  suppliers_email: "",
}

export type MSupplierFormProps = {
  values: MSupplierFormValues
  errors: MSupplierFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MSupplierFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
}

export function MSupplierForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
}: MSupplierFormProps) {
  const addressId = useId()

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
            Référence interne et informations du fournisseur.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Nom du fournisseur"
            id="supplierName"
            value={values.suppliers_name}
            error={errors.suppliers_name}
            onChange={(event) =>
              onChange({ suppliers_name: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
            required
          />
          <MSelectField
            label="Civilité"
            id="supplierCivility"
            value={values.suppliers_civility}
            error={errors.suppliers_civility}
            options={CIVILITY_OPTIONS}
            onValueChange={(value) =>
              onChange({ suppliers_civility: value as ApiCivility })
            }
            disabled={submitting}
            required
          />
          <MField
            label="Personne de contact"
            id="supplierContact"
            value={values.suppliers_contact_name}
            error={errors.suppliers_contact_name}
            onChange={(event) =>
              onChange({ suppliers_contact_name: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Coordonnées</h4>
          <p className="text-xs text-muted-foreground">
            Facultatives, mais utiles pour contacter le fournisseur.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Téléphone"
            id="supplierPhone"
            value={values.suppliers_telephone}
            error={errors.suppliers_telephone}
            onChange={(event) =>
              onChange({ suppliers_telephone: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <MField
            label="Adresse e-mail"
            type="email"
            id="supplierMail"
            value={values.suppliers_email}
            error={errors.suppliers_email}
            onChange={(event) =>
              onChange({ suppliers_email: event.target.value })
            }
            autoComplete="off"
            disabled={submitting}
          />
          <div className="grid gap-1.5 sm:col-span-2">
            <AtomLabel htmlFor={addressId}>Adresse</AtomLabel>
            <AtomTextarea
              id={addressId}
              rows={3}
              value={values.suppliers_address}
              onChange={(event) =>
                onChange({ suppliers_address: event.target.value })
              }
              aria-invalid={errors.suppliers_address ? true : undefined}
              disabled={submitting}
            />
            {errors.suppliers_address ? (
              <p className="text-xs text-destructive">
                {errors.suppliers_address}
              </p>
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
