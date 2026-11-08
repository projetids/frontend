import { useId } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { AtomButton, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import type { ApiArticleOption, ApiDepotOption } from "@/types/api"

// Formulaire de bon d'entrée / bon de sortie. Le dépôt et le motif global sont
// communs aux lignes ; chaque ligne associe un article à une quantité positive
// (le signe est déduit du type de bon côté API). L'API est transactionnelle :
// si une ligne est refusée, aucune n'est enregistrée.

export type MStockBonMode = "entree" | "sortie"

export type MStockBonLine = {
  /** Clé locale stable pour React (jamais envoyée à l'API). */
  key: string
  article_id: string
  qty: string
  motif: string
}

export type MStockBonLineError = {
  article_id?: string
  qty?: string
}

export type MStockBonFormErrors = {
  depot_id?: string
  ref_id?: string
  lines?: string
  lineErrors?: Record<number, MStockBonLineError>
}

export type MStockBonFormValues = {
  depot_id: string
  motif: string
  ref_id: string
  lines: MStockBonLine[]
}

let stockBonLineSequence = 0

/** Crée une ligne vide avec une clé stable. */
export function createStockBonLine(): MStockBonLine {
  stockBonLineSequence += 1
  return {
    key: `stock-line-${stockBonLineSequence}`,
    article_id: "",
    qty: "",
    motif: "",
  }
}

/** Valeurs initiales d'un bon (une ligne vide). */
export function createEmptyStockBonForm(): MStockBonFormValues {
  return {
    depot_id: "",
    motif: "",
    ref_id: "",
    lines: [createStockBonLine()],
  }
}

export type MStockBonFormProps = {
  mode: MStockBonMode
  values: MStockBonFormValues
  errors: MStockBonFormErrors
  articles: ApiArticleOption[]
  depots: ApiDepotOption[]
  optionsLoading?: boolean
  optionsError?: string | null
  submitting: boolean
  /** Identifiant du `<form>` : permet à des boutons externes de le soumettre. */
  formId?: string
  /** Masque la barre d'actions interne (utile dans une modal à pied de page). */
  showActions?: boolean
  onChange: (patch: Partial<MStockBonFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function MStockBonForm({
  mode,
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
}: MStockBonFormProps) {
  const motifId = useId()
  const disabled = submitting || optionsLoading

  const articleOptions = articles.map((article) => ({
    value: article.article_id,
    label: `${article.article_name} · ${article.article_code}`,
  }))
  const depotOptions = depots.map((depot) => ({
    value: depot.depot_id,
    label: `${depot.depot_name} · ${depot.depot_code}`,
  }))

  function updateLine(index: number, patch: Partial<MStockBonLine>) {
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
    onChange({ lines: [...values.lines, createStockBonLine()] })
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
          <h4 className="text-sm font-medium">
            {mode === "entree" ? "Réception" : "Expédition"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {mode === "entree"
              ? "Les quantités reçues seront ajoutées au stock du dépôt choisi."
              : "Le stock disponible est contrôlé dans la transaction : une quantité insuffisante annule tout le bon."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <MField
            label="Référence document (UUID)"
            id="stockBonRefId"
            value={values.ref_id}
            error={errors.ref_id}
            description="Facultatif : bon de réception, BR d'achat, BL de vente…"
            placeholder="00000000-0000-0000-0000-000000000000"
            onChange={(event) =>
              onChange({ ref_id: event.target.value.trim() })
            }
            autoComplete="off"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor={motifId}>Motif du bon</AtomLabel>
          <AtomTextarea
            id={motifId}
            rows={2}
            value={values.motif}
            placeholder={
              mode === "entree"
                ? "Ex. Réception fournisseur, retour client…"
                : "Ex. Livraison, casse, consommation interne…"
            }
            onChange={(event) => onChange({ motif: event.target.value })}
            disabled={disabled}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-medium">Lignes du bon</h4>
            <p className="text-xs text-muted-foreground">
              Une quantité strictement positive par article.
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
                <MField
                  label="Motif de la ligne (optionnel)"
                  value={line.motif}
                  placeholder="Ex. Lot endommagé, retour…"
                  onChange={(event) =>
                    updateLine(index, { motif: event.target.value })
                  }
                  autoComplete="off"
                  disabled={disabled}
                />
              </div>
            )
          })}
        </div>
      </section>

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <AtomButton type="submit" disabled={disabled}>
            {submitting
              ? "Enregistrement…"
              : mode === "entree"
                ? "Enregistrer l'entrée"
                : "Enregistrer la sortie"}
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
