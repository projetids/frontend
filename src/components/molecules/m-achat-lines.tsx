import { PlusIcon, Trash2Icon } from "lucide-react"
import { AtomButton } from "@/components/atoms"
import { MField } from "./m-field"
import { MSelectField } from "./m-select-field"
import type { ApiArticleOption } from "@/types/api"

// Éditeur de lignes partagé par les trois documents d'achat (commande,
// réception, facture). Chaque ligne associe un article, une quantité et un prix
// unitaire HT. Les lignes issues d'une commande conservent `commande_ligne_id`
// pour le suivi des réceptions partielles.

export type MAchatLineValues = {
  /** Clé locale stable pour React (jamais envoyée à l'API). */
  key: string
  article_id: string
  qty: string
  unit_price_ht: string
  /** Ligne du bon de commande source (réception / facture). */
  commande_ligne_id?: string
  /** Aide affichée sous la ligne (quantités commandées/reçues). */
  hint?: string
}

export type MAchatLineError = {
  article_id?: string
  qty?: string
  unit_price_ht?: string
}

let achatLineSequence = 0

/** Crée une ligne vide avec une clé stable. */
export function createAchatLine(
  seed: Partial<MAchatLineValues> = {}
): MAchatLineValues {
  achatLineSequence += 1
  return {
    key: `achat-line-${achatLineSequence}`,
    article_id: "",
    qty: "",
    unit_price_ht: "",
    ...seed,
  }
}

export type MAchatLinesEditorProps = {
  lines: MAchatLineValues[]
  errors?: Record<number, MAchatLineError>
  /** Erreur globale de la section (aucune ligne, doublon…). */
  linesError?: string
  articles: ApiArticleOption[]
  onChange: (lines: MAchatLineValues[]) => void
  disabled?: boolean
  optionsLoading?: boolean
  qtyLabel?: string
  priceLabel?: string
  addLabel?: string
  showPrice?: boolean
}

export function MAchatLinesEditor({
  lines,
  errors,
  linesError,
  articles,
  onChange,
  disabled = false,
  optionsLoading = false,
  qtyLabel = "Quantité",
  priceLabel = "Prix unitaire HT",
  addLabel = "Ajouter une ligne",
  showPrice = true,
}: MAchatLinesEditorProps) {
  const articleOptions = articles.map((article) => ({
    value: article.article_id,
    label: `${article.article_name} · ${article.article_code}`,
  }))

  function updateLine(index: number, patch: Partial<MAchatLineValues>) {
    onChange(
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    )
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, lineIndex) => lineIndex !== index))
  }

  function addLine() {
    onChange([...lines, createAchatLine()])
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Lignes du document</h4>
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
          {addLabel}
        </AtomButton>
      </div>

      {linesError ? (
        <p className="text-xs text-destructive">{linesError}</p>
      ) : null}

      <div className="grid gap-3">
        {lines.map((line, index) => {
          const lineError = errors?.[index]
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
                  disabled={disabled || lines.length === 1}
                  onClick={() => removeLine(index)}
                >
                  <Trash2Icon />
                </AtomButton>
              </div>
              <div
                className={
                  showPrice
                    ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_9rem]"
                    : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"
                }
              >
                <MSelectField
                  label="Article"
                  value={line.article_id}
                  onValueChange={(value) =>
                    updateLine(index, {
                      article_id: value,
                      commande_ligne_id: undefined,
                      hint: undefined,
                    })
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
                  label={qtyLabel}
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
                {showPrice ? (
                  <MField
                    label={priceLabel}
                    value={line.unit_price_ht}
                    error={lineError?.unit_price_ht}
                    placeholder="0"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateLine(index, { unit_price_ht: event.target.value })
                    }
                    autoComplete="off"
                    disabled={disabled}
                  />
                ) : null}
              </div>
              {line.hint ? (
                <p className="text-xs text-muted-foreground">{line.hint}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
