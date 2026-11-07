import { useId } from "react"
import { AtomButton } from "@/components/atoms"
import { Checkbox } from "@/components/ui/checkbox"
import { MField } from "./m-field"

// Formulaire de permission du catalogue (création et modification). Le code
// est la clé métier (immuable en modification) ; `label_fr` est obligatoire.
// `is_active` n'est proposé qu'en modification (l'API active à la création).

export type MPermissionFormValues = {
  code: string
  label_fr: string
  reserved: boolean
  default_enabled: boolean
  is_active: boolean
}

export type MPermissionFormErrors = Partial<
  Record<keyof MPermissionFormValues, string>
>

export const EMPTY_PERMISSION_FORM: MPermissionFormValues = {
  code: "",
  label_fr: "",
  reserved: false,
  default_enabled: false,
  is_active: true,
}

export type MPermissionFormProps = {
  values: MPermissionFormValues
  errors: MPermissionFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MPermissionFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  /** Le code d'une permission existante ne peut pas être modifié. */
  lockCode?: boolean
  /** Affiche l'option `is_active` (uniquement en modification). */
  showActive?: boolean
}

type BooleanOptionProps = {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

function BooleanOption({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: BooleanOptionProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <label htmlFor={id} className="grid cursor-pointer gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </label>
    </div>
  )
}

export function MPermissionForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
  lockCode = false,
  showActive = false,
}: MPermissionFormProps) {
  const idPrefix = useId()

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
            Le code identifie la permission dans l'API ; le libellé est affiché
            aux utilisateurs.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MField
            label="Code"
            id="permissionCode"
            value={values.code}
            error={errors.code}
            description="Ex. A61 — lettres majuscules, chiffres, tiret ou underscore."
            onChange={(event) =>
              onChange({ code: event.target.value.toUpperCase() })
            }
            autoComplete="off"
            disabled={submitting || lockCode}
            required
          />
          <MField
            label="Libellé (français)"
            id="permissionLabel"
            value={values.label_fr}
            error={errors.label_fr}
            onChange={(event) => onChange({ label_fr: event.target.value })}
            autoComplete="off"
            disabled={submitting}
            required
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Options</h4>
          <p className="text-xs text-muted-foreground">
            Valeurs appliquées par défaut et visibilité de la permission.
          </p>
        </div>
        <div className="grid gap-2">
          <BooleanOption
            id={`${idPrefix}-reserved`}
            label="Réservée"
            description="Permission considérée comme réservée (information éditable)."
            checked={values.reserved}
            disabled={submitting}
            onCheckedChange={(checked) => onChange({ reserved: checked })}
          />
          <BooleanOption
            id={`${idPrefix}-default`}
            label="Activée par défaut"
            description="Nouveaux utilisateurs et utilisateurs sans flag : permission activée."
            checked={values.default_enabled}
            disabled={submitting}
            onCheckedChange={(checked) =>
              onChange({ default_enabled: checked })
            }
          />
          {showActive ? (
            <BooleanOption
              id={`${idPrefix}-active`}
              label="Permission active"
              description="Une permission inactive reste cataloguée mais n'est pas appliquée."
              checked={values.is_active}
              disabled={submitting}
              onCheckedChange={(checked) => onChange({ is_active: checked })}
            />
          ) : null}
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
