import { useEffect, useState } from "react"
import {
  ClipboardCheckIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  MInventaireForm,
  MPagination,
  createEmptyInventaireForm,
  type MInventaireFormErrors,
  type MInventaireFormValues,
  type MInventaireLineError,
} from "@/components/molecules"
import { OInventairesTable } from "@/components/organisms"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/auth-context"
import { hasFormErrors, useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { isDecimalInput, normalizeDecimal } from "@/lib/articles"
import {
  INVENTAIRE_STATUS_OPTIONS,
  formatInventaireDateTime,
  formatInventaireGap,
  formatInventaireQuantity,
  inventaireArticleLabel,
  inventaireDepotLabel,
  inventaireStatusBadgeVariant,
  inventaireStatusLabel,
} from "@/lib/inventaires"
import { roleLabel } from "@/lib/roles"
import { requiredRule } from "@/lib/validation"
import * as articleService from "@/services/article.service"
import * as depotService from "@/services/depot.service"
import * as inventaireService from "@/services/inventaire.service"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiInventaire,
  ApiInventaireStatus,
  CreateInventairePayload,
} from "@/types/api"
import { cn } from "cn"

// Module Inventaires (API /inventaires) : session de comptage physique sur un
// dépôt. La création valide immédiatement l'inventaire : chaque écart entre la
// quantité comptée et le théorique génère un mouvement d'ajustement de stock
// (AJUSTEMENT_POS / AJUSTEMENT_NEG) dans la même transaction. Les admins sont
// scopés à leur point de vente ; le superadmin voit tout.

const PAGE_SIZE = 10
const INVENTAIRE_FORM_ID = "inventaire-form"

type InventaireStatusFilter = ApiInventaireStatus | "all"

/** Tonalité d'un écart d'inventaire (badge et couleur de la valeur). */
function gapTone(ecart: number): "positive" | "zero" | "negative" {
  if (ecart > 0) return "positive"
  if (ecart < 0) return "negative"
  return "zero"
}

export function InventairesPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  // Référentiels : articles publiés et dépôts actifs de l'utilisateur.
  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [depots, setDepots] = useState<ApiDepotOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  // Liste paginée.
  const [inventaires, setInventaires] = useState<ApiInventaire[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [depotFilter, setDepotFilter] = useState("all")
  const [statusFilter, setStatusFilter] =
    useState<InventaireStatusFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Création d'un inventaire.
  const [formOpen, setFormOpen] = useState(false)
  const form = useFormValidation<MInventaireFormValues>({
    initialValues: createEmptyInventaireForm,
    rules: {
      depot_id: requiredRule("Le dépôt est requis."),
    },
  })
  const [saving, setSaving] = useState(false)

  // Détail d'un inventaire.
  const [viewing, setViewing] = useState<ApiInventaire | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await inventaireService.listInventaires({
          page,
          limit: PAGE_SIZE,
          depot_id: depotFilter === "all" ? undefined : depotFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        })
        if (cancelled) return
        setInventaires(response.inventaires)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setInventaires([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les inventaires."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, depotFilter, statusFilter, reloadKey])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function resetFilters() {
    setDepotFilter("all")
    setStatusFilter("all")
    setPage(1)
    reload()
  }

  function handleFormChange(patch: Partial<MInventaireFormValues>) {
    form.setValues(patch)
    if (!patch.lines) return

    // Les erreurs de lignes sont indexées : on les efface dès que la liste
    // change pour éviter qu'elles ne se décalent après ajout/suppression d'une
    // ligne ou ne restent affichées sur une ligne déjà corrigée.
    form.setErrors((previous) => {
      const typed = previous as MInventaireFormErrors
      if (!typed.lineErrors) return previous
      const next: MInventaireFormErrors = { ...typed }
      delete next.lineErrors
      return next
    })
  }

  function openCreate() {
    form.reset({
      ...createEmptyInventaireForm(),
      // Un seul dépôt disponible : le présélectionner pour accélérer la saisie.
      depot_id: depots.length === 1 ? depots[0].depot_id : "",
    })
    setFormOpen(true)
  }

  function closeCreate() {
    if (saving) return
    setFormOpen(false)
    form.reset()
  }

  function validateInventaire(): MInventaireFormErrors {
    const errors: MInventaireFormErrors = { ...form.validate() }
    const values = form.values
    const lineErrors: Record<number, MInventaireLineError> = {}
    const seenArticles = new Set<string>()

    if (values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne à l'inventaire."
    }

    values.lines.forEach((line, index) => {
      const lineError: MInventaireLineError = {}
      if (!line.article_id) {
        lineError.article_id = "L'article est requis."
      } else if (seenArticles.has(line.article_id)) {
        lineError.article_id = "Cet article est déjà présent dans l'inventaire."
      } else {
        seenArticles.add(line.article_id)
      }

      if (!isDecimalInput(line.qty_comptee)) {
        lineError.qty_comptee =
          "Quantité comptée requise (ex. 0, 10 ou 2.5)."
      }

      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError
    })

    if (Object.keys(lineErrors).length > 0) {
      errors.lineErrors = lineErrors
      errors.lines ??= "Corrigez les lignes signalées en rouge."
    }

    // Publie aussi les erreurs de lignes (non gérées par les règles du hook).
    form.setErrors(errors)

    return errors
  }

  async function handleSubmit() {
    const nextErrors = validateInventaire()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = form.values
    const payload: CreateInventairePayload = {
      depot_id: values.depot_id,
      commentaire: values.commentaire.trim() || undefined,
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty_comptee: Number(normalizeDecimal(line.qty_comptee)),
      })),
    }

    setSaving(true)
    try {
      const { envelope } = await inventaireService.createInventaire(payload)
      toast.success(envelope.message)
      setFormOpen(false)
      form.reset()
      // Tri par défaut sur created_at DESC : le nouvel inventaire apparaît en tête.
      setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Inventaire refusé", {
          description: err.details || err.message,
        })
      } else if (err instanceof ApiError && err.code === "NOT_FOUND") {
        toast.error("Élément introuvable", {
          description: err.details || err.message,
        })
      } else {
        toast.error("Création impossible", {
          description:
            err instanceof ApiError
              ? err.details || err.message
              : "Erreur inattendue",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(inventaire: ApiInventaire) {
    setViewing(inventaire)
    setDetailLoading(true)
    try {
      const { inventaire: fresh } = await inventaireService.getInventaire(
        inventaire.inventaire_id
      )
      setViewing(fresh)
    } catch (err) {
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer le détail de l'inventaire.",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventaires</h1>
        <p className="text-muted-foreground">
          Réalisez le comptage physique des articles d&apos;un dépôt. La
          validation calcule l&apos;écart avec le stock théorique et enregistre
          automatiquement les ajustements dans le journal des mouvements.
        </p>
      </header>

      {/* Création / validation d'un inventaire */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate()
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvel inventaire</DialogTitle>
              <DialogDescription>
                Comptez les articles du dépôt choisi. L&apos;inventaire est
                validé immédiatement et les écarts deviennent des ajustements de
                stock.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MInventaireForm
              formId={INVENTAIRE_FORM_ID}
              showActions={false}
              values={form.values}
              errors={form.errors}
              articles={articles}
              depots={depots}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={saving}
              onChange={handleFormChange}
              onSubmit={() => void handleSubmit()}
              onCancel={closeCreate}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={closeCreate}
              disabled={saving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={INVENTAIRE_FORM_ID}
              disabled={saving || optionsLoading}
            >
              {saving ? "Validation…" : "Valider l'inventaire"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open && !detailLoading) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de l&apos;inventaire</DialogTitle>
              <DialogDescription>
                {viewing?.inventaire_code ?? "Session de comptage"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Code</span>
                    <p className="font-mono font-semibold">
                      {viewing.inventaire_code}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <div>
                      <AtomBadge
                        variant={inventaireStatusBadgeVariant(viewing.status)}
                      >
                        {inventaireStatusLabel(viewing.status)}
                      </AtomBadge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Dépôt</span>
                    <p className="font-medium">
                      {inventaireDepotLabel(depots, viewing.depot_id)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Commentaire
                    </span>
                    <p>{viewing.commentaire?.trim() || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Créé par
                    </span>
                    <span className="font-mono text-xs">
                      {viewing.created_by || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Créé le
                    </span>
                    <span className="font-mono text-xs">
                      {formatInventaireDateTime(viewing.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Validé le
                    </span>
                    <span className="font-mono text-xs">
                      {formatInventaireDateTime(viewing.validated_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Validé par
                    </span>
                    <span className="font-mono text-xs">
                      {viewing.validated_by || "—"}
                    </span>
                  </div>
                  {isSuperadmin ? (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-muted-foreground">
                        Point de vente
                      </span>
                      <p className="font-mono text-xs break-all">
                        {viewing.point_of_sale_id}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Lignes de comptage
                    </span>
                    <AtomBadge variant="secondary">
                      {viewing.lignes?.length ?? 0} ligne
                      {(viewing.lignes?.length ?? 0) > 1 ? "s" : ""}
                    </AtomBadge>
                  </div>
                  {viewing.lignes?.length ? (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Article</TableHead>
                            <TableHead className="w-28 text-right">
                              Théorique
                            </TableHead>
                            <TableHead className="w-28 text-right">
                              Comptée
                            </TableHead>
                            <TableHead className="w-28 text-right">
                              Écart
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewing.lignes.map((ligne) => {
                            const ecart = Number(ligne.ecart)
                            const tone = gapTone(ecart)
                            return (
                              <TableRow key={ligne.ligne_id}>
                                <TableCell className="max-w-64">
                                  <span
                                    className="block truncate font-medium"
                                    title={inventaireArticleLabel(
                                      articles,
                                      ligne.article_id
                                    )}
                                  >
                                    {inventaireArticleLabel(
                                      articles,
                                      ligne.article_id
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatInventaireQuantity(
                                    ligne.qty_theorique
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatInventaireQuantity(ligne.qty_comptee)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <AtomBadge
                                    variant={
                                      tone === "positive"
                                        ? "secondary"
                                        : tone === "negative"
                                          ? "destructive"
                                          : "outline"
                                    }
                                  >
                                    <span
                                      className={cn(
                                        "tabular-nums",
                                        tone === "negative"
                                          ? "text-destructive"
                                          : null
                                      )}
                                    >
                                      {formatInventaireGap(ligne.ecart)}
                                    </span>
                                  </AtomBadge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aucune ligne de comptage.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setViewing(null)}
              disabled={detailLoading}
            >
              Fermer
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Historique des inventaires</CardTitle>
          <CardDescription>
            Chaque inventaire validé fige le stock théorique du dépôt au moment
            du comptage et conserve les écarts constatés.
          </CardDescription>
          <CardAction>
            <AtomButton
              iconLeft={PlusIcon}
              onClick={openCreate}
              disabled={saving || optionsLoading}
            >
              Nouvel inventaire
            </AtomButton>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={depotFilter}
              onValueChange={(value) => {
                setDepotFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-60"
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

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as InventaireStatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-44"
                aria-label="Filtrer par statut"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {INVENTAIRE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AtomBadge variant="secondary">
              {total} inventaire{total > 1 ? "s" : ""}
            </AtomBadge>

            <div className="ml-auto flex items-center gap-2">
              <AtomButton
                size="sm"
                variant="ghost"
                iconLeft={RotateCcwIcon}
                onClick={resetFilters}
                disabled={loading}
              >
                Réinitialiser
              </AtomButton>
              <AtomButton
                size="sm"
                variant="ghost"
                iconLeft={RefreshCwIcon}
                onClick={reload}
                disabled={loading}
              >
                Actualiser
              </AtomButton>
            </div>
          </div>

          <OInventairesTable
            inventaires={inventaires}
            depots={depots}
            loading={loading}
            error={error}
            disabled={saving}
            showPointOfSale={isSuperadmin}
            onViewDetails={(inventaire) => void openDetail(inventaire)}
            onRetry={reload}
          />

          <MPagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
