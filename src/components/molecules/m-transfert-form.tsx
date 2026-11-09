import { useId } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import { articleUnitLabel } from "@/lib/articles"
import type { ApiArticleOption, ApiDepotOption } from "@/types/api"

// Formulaire de bon de transfert. Le déplacement est atomique : la sortie du
// dépôt source et l'entrée dans le dépôt cible sont enregistrées dans la même
// transaction. Un stock insuffisant sur la source annule tout le transfert.

export type MTransfertLine = {
  /** Clé locale stable pour React (jamais envoyée à l'API). */
  key: string
  article_id: string
  qty: string
}

export type MTransfertLineError = {
  article_id?: string
  qty?: string
}

export type MTransfertFormErrors = {
  depot_source_id?: string
  depot_cible_id?: string
  commentaire?: string
  lines?: string
  lineErrors?: Record<number, MTransfertLineError>
}

export type MTransfertFormValues = {
  depot_source_id: string
  depot_cible_id: string
  commentaire: string
  lines: MTransfertLine[]
}

let transfertLineSequence = 0

/** Crée une ligne vide avec une clé stable. */
export function createTransfertLine(): MTransfertLine {
  transfertLineSequence += 1
  return {
    key: `transfert-line-${transfertLineSequence}`,
    article_id: "",
    qty: "",
  }
}

/** Valeurs initiales d'un transfert (une ligne vide). */
export function createEmptyTransfertForm(): MTransfertFormValues {
  return {
    depot_source_id: "",
    depot_cible_id: "",
    commentaire: "",
    lines: [createTransfertLine()],
  }
}

export type MTransfertFormProps = {
  values: MTransfertFormValues
  errors: MTransfertFormErrors
  articles: ApiArticleOption[]
  depots: ApiDepotOption[]
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  onChange: (patch: Partial<MTransfertFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MTransfertForm({
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
}: MTransfertFormProps) {
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

  function updateLine(index: number, patch: Partial<MTransfertLine>) {
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
    onChange({ lines: [...values.lines, createTransfertLine()] })
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
          <h4 className="text-sm font-medium">Dépôts source et cible</h4>
          <p className="text-xs text-muted-foreground">
            Les deux dépôts doivent être distincts et actifs. Un transfert entre
            points de vente différents est réservé au superadmin.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Dépôt source"
            value={values.depot_source_id}
            onValueChange={(value) => onChange({ depot_source_id: value })}
            options={depotOptions}
            placeholder={
              optionsLoading ? "Chargement…" : "Sélectionner un dépôt…"
            }
            error={errors.depot_source_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un dépôt…"
          />
          <MSelectField
            label="Dépôt cible"
            value={values.depot_cible_id}
            onValueChange={(value) => onChange({ depot_cible_id: value })}
            options={depotOptions}
            placeholder={
              optionsLoading ? "Chargement…" : "Sélectionner un dépôt…"
            }
            error={errors.depot_cible_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un dépôt…"
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor={commentaireId}>Commentaire</AtomLabel>
          <AtomTextarea
            id={commentaireId}
            rows={2}
            value={values.commentaire}
            placeholder="Ex. Réapprovisionnement du dépôt principal…"
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
            <h4 className="text-sm font-medium">Articles transférés</h4>
            <p className="text-xs text-muted-foreground">
              Une quantité strictement positive par article. Chaque article ne
              peut apparaître qu&apos;une seule fois.
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
                    label="Quantité"
                    value={line.qty}
                    error={lineError?.qty}
                    placeholder="0.000"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateLine(index, { qty: event.target.value })
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
            {submitting ? "Enregistrement…" : "Valider le transfert"}
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
