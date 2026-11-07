import { AtomButton } from "@/components/atoms"
import { MField } from "./m-field"

// Formulaire de famille d'articles (création et modification). Le DTO de
// l'API n'expose qu'un champ : `article_families_name` (obligatoire).

export type MArticleFamilyFormValues = {
  article_families_name: string
}

export type MArticleFamilyFormErrors = Partial<
  Record<keyof MArticleFamilyFormValues, string>
>

export const EMPTY_ARTICLE_FAMILY_FORM: MArticleFamilyFormValues = {
  article_families_name: "",
}

export type MArticleFamilyFormProps = {
  values: MArticleFamilyFormValues
  errors: MArticleFamilyFormErrors
  submitting: boolean
  submitLabel: string
  onChange: (patch: Partial<MArticleFamilyFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
}

export function MArticleFamilyForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
}: MArticleFamilyFormProps) {
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
          <h4 className="text-sm font-medium">Informations</h4>
          <p className="text-xs text-muted-foreground">
            Le nom de la famille sert à regrouper les articles du catalogue.
          </p>
        </div>
        <MField
          label="Nom de la famille"
          id="articleFamilyName"
          value={values.article_families_name}
          error={errors.article_families_name}
          onChange={(event) =>
            onChange({ article_families_name: event.target.value })
          }
          autoComplete="off"
          disabled={submitting}
          required
        />
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
