import { useCallback, useEffect, useState } from "react"
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  BoxesIcon,
  HistoryIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton, AtomInput } from "@/components/atoms"
import {
  MPagination,
  MStockBonForm,
  createEmptyStockBonForm,
  type MStockBonFormErrors,
  type MStockBonFormValues,
  type MStockBonLineError,
  type MStockBonMode,
} from "@/components/molecules"
import { OStockMovementsTable, OStockStateTable } from "@/components/organisms"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { hasFormErrors, useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { isDecimalInput, normalizeDecimal } from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import { MOUVEMENT_REF_OPTIONS, MOUVEMENT_TYPE_OPTIONS } from "@/lib/stocks"
import { requiredRule, UUID_REGEX, uuidRule } from "@/lib/validation"
import * as articleService from "@/services/article.service"
import * as depotService from "@/services/depot.service"
import * as stockService from "@/services/stock.service"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiMouvementRefType,
  ApiMouvementStockType,
  ApiStockMovement,
  ApiStockStateRow,
  CreateStockBonPayload,
} from "@/types/api"
import { cn } from "cn"

// Module Stock (API /stock) : état théorique agrégé par article × dépôt,
// journal append-only des mouvements et création de bons d'entrée / sortie.
// Les admins sont limités à leur point de vente ; le superadmin voit tout et
// peut filtrer l'état par POS.

const PAGE_SIZE = 10
const BON_FORM_ID = "stock-bon-form"

type StockTab = "etat" | "mouvements"

/** Convertit une date de filtre (`YYYY-MM-DD`) en début de journée ISO. */
function startOfDayIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** Convertit une date de filtre (`YYYY-MM-DD`) en fin de journée ISO. */
function endOfDayIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function StocksPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [tab, setTab] = useState<StockTab>("etat")

  // Référentiels utilisés par les filtres, les tableaux et le formulaire de bon.
  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [depots, setDepots] = useState<ApiDepotOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  // Filtres partagés entre l'état et le journal.
  const [articleFilter, setArticleFilter] = useState("all")
  const [depotFilter, setDepotFilter] = useState("all")
  // Filtre POS de l'état (superadmin uniquement).
  const [posFilter, setPosFilter] = useState("")
  const [appliedPosFilter, setAppliedPosFilter] = useState("")
  // Filtres propres au journal.
  const [movementType, setMovementType] = useState("all")
  const [refType, setRefType] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // État de stock théorique.
  const [stateRows, setStateRows] = useState<ApiStockStateRow[]>([])
  const [stateLoading, setStateLoading] = useState(true)
  const [stateError, setStateError] = useState<string | null>(null)
  const [stateReloadKey, setStateReloadKey] = useState(0)

  // Journal des mouvements.
  const [movements, setMovements] = useState<ApiStockMovement[]>([])
  const [movementsTotal, setMovementsTotal] = useState(0)
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState<string | null>(null)
  const [movementsReloadKey, setMovementsReloadKey] = useState(0)

  // Modal de création d'un bon d'entrée ou de sortie.
  const [bonMode, setBonMode] = useState<MStockBonMode | null>(null)
  const bonForm = useFormValidation<MStockBonFormValues>({
    initialValues: createEmptyStockBonForm,
    rules: {
      depot_id: requiredRule("Le dépôt est requis."),
      ref_id: uuidRule(),
    },
  })
  const [bonSaving, setBonSaving] = useState(false)

  // Référentiels : articles publiés et dépôts actifs de l'utilisateur.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setOptionsLoading(true)
      const [articlesResult, depotsResult] = await Promise.allSettled([
        articleService.listArticleOptions(),
        depotService.listDepotOptions(),
      ])
      if (cancelled) return

      setArticles(
        articlesResult.status === "fulfilled"
          ? articlesResult.value.options
          : []
      )
      setDepots(
        depotsResult.status === "fulfilled" ? depotsResult.value.options : []
      )
      setOptionsError(
        articlesResult.status === "rejected" ||
          depotsResult.status === "rejected"
          ? "Impossible de charger la liste complète des articles et des dépôts. Les libellés seront remplacés par leurs identifiants."
          : null
      )
      setOptionsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Recherche différée du POS pour éviter un appel API à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedPosFilter(posFilter.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [posFilter])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const pointOfSale = isSuperadmin ? appliedPosFilter : ""
      if (pointOfSale && !UUID_REGEX.test(pointOfSale)) {
        setStateRows([])
        setStateError("Identifiant de point de vente invalide (UUID attendu).")
        setStateLoading(false)
        return
      }

      setStateLoading(true)
      try {
        const { rows } = await stockService.getStockState({
          article_id: articleFilter === "all" ? undefined : articleFilter,
          depot_id: depotFilter === "all" ? undefined : depotFilter,
          point_of_sale_id: pointOfSale || undefined,
        })
        if (cancelled) return
        setStateRows(rows)
        setStateError(null)
      } catch (err) {
        if (cancelled) return
        setStateRows([])
        setStateError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger l'état de stock."
        )
      } finally {
        if (!cancelled) setStateLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    articleFilter,
    depotFilter,
    appliedPosFilter,
    isSuperadmin,
    stateReloadKey,
  ])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setMovementsLoading(true)
      try {
        const response = await stockService.listMouvements({
          page: movementsPage,
          limit: PAGE_SIZE,
          article_id: articleFilter === "all" ? undefined : articleFilter,
          depot_id: depotFilter === "all" ? undefined : depotFilter,
          type:
            movementType === "all"
              ? undefined
              : (movementType as ApiMouvementStockType),
          ref_type:
            refType === "all" ? undefined : (refType as ApiMouvementRefType),
          date_from: startOfDayIso(dateFrom),
          date_to: endOfDayIso(dateTo),
        })
        if (cancelled) return
        setMovements(response.movements)
        setMovementsTotal(response.meta.total)
        setMovementsError(null)
      } catch (err) {
        if (cancelled) return
        setMovements([])
        setMovementsTotal(0)
        setMovementsError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger le journal des mouvements."
        )
      } finally {
        if (!cancelled) setMovementsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    movementsPage,
    articleFilter,
    depotFilter,
    movementType,
    refType,
    dateFrom,
    dateTo,
    movementsReloadKey,
  ])

  const reloadState = useCallback(() => {
    setStateReloadKey((key) => key + 1)
  }, [])

  const reloadMovements = useCallback(() => {
    setMovementsReloadKey((key) => key + 1)
  }, [])

  const reloadAll = useCallback(() => {
    reloadState()
    reloadMovements()
  }, [reloadState, reloadMovements])

  function resetFilters() {
    setArticleFilter("all")
    setDepotFilter("all")
    setPosFilter("")
    setAppliedPosFilter("")
    setMovementType("all")
    setRefType("all")
    setDateFrom("")
    setDateTo("")
    setMovementsPage(1)
  }

  function openBon(mode: MStockBonMode) {
    setBonMode(mode)
    bonForm.reset({
      ...createEmptyStockBonForm(),
      // Un seul dépôt disponible : le présélectionner pour accélérer la saisie.
      depot_id: depots.length === 1 ? depots[0].depot_id : "",
    })
  }

  function closeBon() {
    if (bonSaving) return
    setBonMode(null)
    bonForm.reset()
  }

  function validateBon(): MStockBonFormErrors {
    // Valide d'abord le dépôt et la référence via le hook commun.
    const errors: MStockBonFormErrors = { ...bonForm.validate() }
    const values = bonForm.values

    const lineErrors: Record<number, MStockBonLineError> = {}
    if (values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne au bon."
    }

    values.lines.forEach((line, index) => {
      const lineError: MStockBonLineError = {}
      if (!line.article_id) {
        lineError.article_id = "L'article est requis."
      }
      if (!isDecimalInput(line.qty)) {
        lineError.qty = "Quantité positive requise (ex. 10 ou 2.5)."
      } else if (Number(normalizeDecimal(line.qty)) <= 0) {
        lineError.qty = "La quantité doit être supérieure à 0."
      }
      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError
    })

    if (Object.keys(lineErrors).length > 0) {
      errors.lineErrors = lineErrors
      errors.lines ??= "Corrigez les lignes signalées en rouge."
    }

    // Publie aussi les erreurs de lignes (non gérées par les règles du hook).
    bonForm.setErrors(errors)

    return errors
  }

  async function handleBonSubmit() {
    if (!bonMode) return

    const nextErrors = validateBon()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = bonForm.values
    const payload: CreateStockBonPayload = {
      depot_id: values.depot_id,
      motif: values.motif.trim() || undefined,
      ref_id: values.ref_id.trim() || undefined,
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty: Number(normalizeDecimal(line.qty)),
        motif: line.motif.trim() || undefined,
      })),
    }

    setBonSaving(true)
    try {
      const { envelope } =
        bonMode === "entree"
          ? await stockService.createBonEntree(payload)
          : await stockService.createBonSortie(payload)
      toast.success(envelope.message)
      setBonMode(null)
      bonForm.reset()
      // Le journal est trié par date décroissante : le nouveau bon apparaît en tête.
      setMovementsPage(1)
      setTab("mouvements")
      reloadAll()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Stock insuffisant", {
          description: err.details || err.message,
        })
      } else if (err instanceof ApiError && err.code === "NOT_FOUND") {
        toast.error("Élément introuvable", {
          description: err.details || err.message,
        })
      } else {
        toast.error(
          bonMode === "entree" ? "Entrée impossible" : "Sortie impossible",
          {
            description:
              err instanceof ApiError
                ? err.details || err.message
                : "Erreur inattendue",
          }
        )
      }
    } finally {
      setBonSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Stocks</h1>
        <p className="text-muted-foreground">
          Suivez l&apos;état théorique par article et par dépôt, consultez le
          journal append-only des mouvements et enregistrez les bons
          d&apos;entrée et de sortie. Toute sortie est contrôlée dans une
          transaction pour empêcher un stock négatif.
        </p>
      </header>

      {/* Création d'un bon d'entrée ou de sortie */}
      <Dialog
        open={bonMode !== null}
        onOpenChange={(open) => {
          if (!open) closeBon()
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {bonMode === "sortie" ? (
                <ArrowUpFromLineIcon className="size-5" />
              ) : (
                <ArrowDownToLineIcon className="size-5" />
              )}
            </div>
            <div className="grid gap-1">
              <DialogTitle>
                {bonMode === "sortie"
                  ? "Nouveau bon de sortie"
                  : "Nouveau bon d'entrée"}
              </DialogTitle>
              <DialogDescription>
                {bonMode === "sortie"
                  ? "Enregistrez une sortie de stock. Si le stock disponible est insuffisant, le bon entier est refusé."
                  : "Enregistrez une réception de stock. Les mouvements sont ajoutés au journal append-only."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MStockBonForm
              mode={bonMode ?? "entree"}
              formId={BON_FORM_ID}
              showActions={false}
              values={bonForm.values}
              errors={bonForm.errors}
              articles={articles}
              depots={depots}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={bonSaving}
              onChange={bonForm.setValues}
              onSubmit={() => void handleBonSubmit()}
              onCancel={closeBon}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={closeBon}
              disabled={bonSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={BON_FORM_ID}
              disabled={bonSaving || optionsLoading}
            >
              {bonSaving
                ? "Enregistrement…"
                : bonMode === "sortie"
                  ? "Enregistrer la sortie"
                  : "Enregistrer l'entrée"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Mouvements & état de stock</CardTitle>
          <CardDescription>
            L&apos;état est la somme signée des mouvements par article × dépôt.
            Le journal conserve chaque entrée, sortie, ajustement et transfert.
          </CardDescription>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <AtomButton
                iconLeft={ArrowDownToLineIcon}
                onClick={() => openBon("entree")}
                disabled={bonSaving}
              >
                Bon d&apos;entrée
              </AtomButton>
              <AtomButton
                iconLeft={ArrowUpFromLineIcon}
                variant="outline"
                onClick={() => openBon("sortie")}
                disabled={bonSaving}
              >
                Bon de sortie
              </AtomButton>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Vues du stock"
              className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "etat"}
                onClick={() => setTab("etat")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  tab === "etat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BoxesIcon className="size-4" />
                État du stock
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "mouvements"}
                onClick={() => setTab("mouvements")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  tab === "mouvements"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HistoryIcon className="size-4" />
                Journal des mouvements
              </button>
            </div>
            <div className="flex items-center gap-2">
              <AtomBadge variant="secondary">
                {tab === "etat"
                  ? `${stateRows.length} ligne${stateRows.length > 1 ? "s" : ""}`
                  : `${movementsTotal} mouvement${movementsTotal > 1 ? "s" : ""}`}
              </AtomBadge>
              <AtomButton
                size="sm"
                variant="ghost"
                iconLeft={RefreshCwIcon}
                onClick={tab === "etat" ? reloadState : reloadMovements}
                disabled={tab === "etat" ? stateLoading : movementsLoading}
              >
                Actualiser
              </AtomButton>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Select
              value={articleFilter}
              onValueChange={(value) => {
                setArticleFilter(value)
                setMovementsPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-56"
                aria-label="Filtrer par article"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les articles</SelectItem>
                {articles.map((article) => (
                  <SelectItem
                    key={article.article_id}
                    value={article.article_id}
                  >
                    {article.article_name} · {article.article_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={depotFilter}
              onValueChange={(value) => {
                setDepotFilter(value)
                setMovementsPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-56"
                aria-label="Filtrer par dépôt"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les dépôts</SelectItem>
                {depots.map((depot) => (
                  <SelectItem key={depot.depot_id} value={depot.depot_id}>
                    {depot.depot_name} · {depot.depot_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tab === "etat" ? (
              isSuperadmin ? (
                <AtomInput
                  value={posFilter}
                  onChange={(event) => setPosFilter(event.target.value)}
                  placeholder="Filtrer par POS (UUID)"
                  aria-label="Filtrer par point de vente"
                  className="w-72"
                />
              ) : null
            ) : (
              <>
                <Select
                  value={movementType}
                  onValueChange={(value) => {
                    setMovementType(value)
                    setMovementsPage(1)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-44"
                    aria-label="Filtrer par type de mouvement"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {MOUVEMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={refType}
                  onValueChange={(value) => {
                    setRefType(value)
                    setMovementsPage(1)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-44"
                    aria-label="Filtrer par référence"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les références</SelectItem>
                    {MOUVEMENT_REF_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <AtomInput
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value)
                    setMovementsPage(1)
                  }}
                  aria-label="Date de début"
                  title="Du"
                  className="w-40"
                />
                <AtomInput
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value)
                    setMovementsPage(1)
                  }}
                  aria-label="Date de fin"
                  title="Au"
                  className="w-40"
                />
              </>
            )}

            <AtomButton
              size="sm"
              variant="ghost"
              iconLeft={RotateCcwIcon}
              onClick={resetFilters}
            >
              Réinitialiser
            </AtomButton>
          </div>

          {tab === "etat" ? (
            <OStockStateTable
              rows={stateRows}
              articles={articles}
              depots={depots}
              loading={stateLoading}
              error={stateError}
              showPointOfSale={isSuperadmin}
              onRetry={reloadState}
            />
          ) : (
            <>
              <OStockMovementsTable
                movements={movements}
                articles={articles}
                depots={depots}
                loading={movementsLoading}
                error={movementsError}
                showPointOfSale={isSuperadmin}
                onRetry={reloadMovements}
              />
              <MPagination
                page={movementsPage}
                limit={PAGE_SIZE}
                total={movementsTotal}
                disabled={movementsLoading}
                onPageChange={setMovementsPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
