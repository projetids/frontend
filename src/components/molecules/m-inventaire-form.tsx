import { useId } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import { articleUnitLabel } from "@/lib/articles"
import type { ApiArticleOption, ApiDepotOption } from "@/types/api"

// Formulaire de création d'inventaire. La session porte sur un dépôt unique :
// chaque ligne associe un article à la quantité réellement comptée. L'API
// valide immédiatement l'inventaire et génère les ajustements de stock dans une
// transaction ; aucune ligne ne peut être enregistrée partiellement.

export type MInventaireLine = {
  /** Clé locale stable pour React (jamais envoyée à l'API). */
  key: string
  article_id: string
  qty_comptee: string
}

export type MInventaireLineError = {
  article_id?: string
  qty_comptee?: string
}

export type MInventaireFormErrors = {
  depot_id?: string
  commentaire?: string
  lines?: string
  lineErrors?: Record<number, MInventaireLineError>
}

export type MInventaireFormValues = {
  depot_id: string
  commentaire: string
  lines: MInventaireLine[]
}

let inventaireLineSequence = 0

/** Crée une ligne vide avec une clé stable. */
export function createInventaireLine(): MInventaireLine {
  inventaireLineSequence += 1
  return {
    key: `inventaire-line-${inventaireLineSequence}`,
    article_id: "",
    qty_comptee: "",
  }
}

/** Valeurs initiales d'un inventaire (une ligne vide). */
export function createEmptyInventaireForm(): MInventaireFormValues {
  return {
    depot_id: "",
    commentaire: "",
    lines: [createInventaireLine()],
  }
}

export type MInventaireFormProps = {
  values: MInventaireFormValues
  errors: MInventaireFormErrors
  articles: ApiArticleOption[]
  depots: ApiDepotOption[]
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  onChange: (patch: Partial<MInventaireFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MInventaireForm({
  values,
  errors,
  articles,
  depots,
  optionsLoading = false,
  optionsError,
  submitting,
  formId,
  showActions = true,
  onChange,
  onSubmit,
  onCancel,
}: MInventaireFormProps) {
  const commentaireId = useId()
  const disabled = submitting || optionsLoading

  const articleOptions = articles.map((article) => ({
    value: article.article_id,
    label: `${article.article_name} · ${article.article_code}`,
  }))
  const depotOptions = depots.map((depot) => ({
    value: depot.depot_id,
    label: `${depot.depot_name} · ${depot.depot_code}`,
  }))

  function updateLine(index: number, patch: Partial<MInventaireLine>) {
    onChange({
      lines: values.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      ),
    })
  }

  function removeLine(index: number) {
    onChange({
      lines: values.lines.filter((_, lineIndex) => lineIndex !== index),
    })
  }

  function addLine() {
    onChange({ lines: [...values.lines, createInventaireLine()] })
  }

  function articleHint(article_id: string): string | undefined {
    const article = articles.find((item) => item.article_id === article_id)
    return article ? `Unité : ${articleUnitLabel(article.article_unit)}` : undefined
  }

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
          <h4 className="text-sm font-medium">Session de comptage</h4>
          <p className="text-xs text-muted-foreground">
            L&apos;inventaire est validé immédiatement : les écarts génèrent des
            ajustements de stock pour le dépôt choisi.
          </p>
        </div>
        <MSelectField
          label="Dépôt"
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
        <div className="grid gap-1.5">
          <AtomLabel htmlFor={commentaireId}>Commentaire</AtomLabel>
          <AtomTextarea
            id={commentaireId}
            rows={2}
            value={values.commentaire}
            placeholder="Ex. Inventaire mensuel, comptage de fin d'année…"
            onChange={(event) =>
              onChange({ commentaire: event.target.value })
            }
            disabled={disabled}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-medium">Articles comptés</h4>
            <p className="text-xs text-muted-foreground">
              Une quantité comptée positive ou nulle par article. Chaque article
              ne peut apparaître qu&apos;une seule fois.
            </p>
          </div>
          <AtomButton
            type="button"
            size="sm"
            variant="outline"
            iconLeft={PlusIcon}
            onClick={addLine}
            disabled={disabled}
          >
            Ajouter une ligne
          </AtomButton>
        </div>

        {errors.lines ? (
          <p className="text-xs text-destructive">{errors.lines}</p>
        ) : null}

        <div className="grid gap-3">
          {values.lines.map((line, index) => {
            const lineError = errors.lineErrors?.[index]
            return (
              <div
                key={line.key}
                className="grid gap-3 rounded-lg border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Ligne {index + 1}
                  </span>
                  <AtomButton
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Supprimer la ligne ${index + 1}`}
                    title="Supprimer la ligne"
                    disabled={disabled || values.lines.length === 1}
                    onClick={() => removeLine(index)}
                  >
                    <Trash2Icon />
                  </AtomButton>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                  <MSelectField
                    label="Article"
                    value={line.article_id}
                    onValueChange={(value) =>
                      updateLine(index, { article_id: value })
                    }
                    options={articleOptions}
                    placeholder={
                      optionsLoading
                        ? "Chargement…"
                        : "Sélectionner un article…"
                    }
                    description={articleHint(line.article_id)}
                    error={lineError?.article_id}
                    disabled={disabled}
                    required
                    searchPlaceholder="Rechercher un article…"
                  />
                  <MField
                    label="Quantité comptée"
                    value={line.qty_comptee}
                    error={lineError?.qty_comptee}
                    placeholder="0.000"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateLine(index, { qty_comptee: event.target.value })
                    }
                    autoComplete="off"
                    disabled={disabled}
                    required
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={disabled}>
            {submitting ? "Validation…" : "Valider l'inventaire"}
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
