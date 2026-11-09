import { useEffect, useState } from "react"
import {
  ArrowLeftRightIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  MTransfertForm,
  MPagination,
  createEmptyTransfertForm,
  type MTransfertFormErrors,
  type MTransfertFormValues,
  type MTransfertLineError,
} from "@/components/molecules"
import { OTransfertsTable } from "@/components/organisms"
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
import { roleLabel } from "@/lib/roles"
import {
  formatStockDateTime,
  formatStockQuantity,
  stockArticleLabel,
  stockDepotLabel,
} from "@/lib/stocks"
import { requiredRule } from "@/lib/validation"
import * as articleService from "@/services/article.service"
import * as depotService from "@/services/depot.service"
import * as transfertService from "@/services/transfert.service"
import type {
  ApiArticleOption,
  ApiDepotOption,
  ApiTransfert,
  CreateTransfertPayload,
} from "@/types/api"

// Module Transferts (API /transferts) : déplacement d'articles d'un dépôt source
// vers un dépôt cible. La sortie et l'entrée sont enregistrées dans la même
// transaction ; un stock insuffisant annule tout le transfert. Un transfert
// inter-POS est réservé au superadmin ; les admins sont scopés à leur point de
// vente.

const PAGE_SIZE = 10
const TRANSFERT_FORM_ID = "transfert-form"

export function TransfertsPage() {
  const { user } = useAuth()

  // Référentiels : articles publiés et dépôts actifs de l'utilisateur.
  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [depots, setDepots] = useState<ApiDepotOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  // Liste paginée.
  const [transferts, setTransferts] = useState<ApiTransfert[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Création d'un transfert.
  const [formOpen, setFormOpen] = useState(false)
  const form = useFormValidation<MTransfertFormValues>({
    initialValues: createEmptyTransfertForm,
    rules: {
      depot_source_id: requiredRule("Le dépôt source est requis."),
      depot_cible_id: requiredRule("Le dépôt cible est requis."),
    },
  })
  const [saving, setSaving] = useState(false)

  // Détail d'un transfert.
  const [viewing, setViewing] = useState<ApiTransfert | null>(null)
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
        const response = await transfertService.listTransferts({
          page,
          limit: PAGE_SIZE,
        })
        if (cancelled) return
        setTransferts(response.transferts)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setTransferts([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les transferts."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, reloadKey])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function openCreate() {
    form.reset({
      ...createEmptyTransfertForm(),
      // Un seul dépôt disponible : le présélectionner comme source.
      depot_source_id: depots.length === 1 ? depots[0].depot_id : "",
    })
    setFormOpen(true)
  }

  function closeCreate() {
    if (saving) return
    setFormOpen(false)
    form.reset()
  }

  function validateTransfert(): MTransfertFormErrors {
    const errors: MTransfertFormErrors = { ...form.validate() }
    const values = form.values

    if (
      values.depot_source_id &&
      values.depot_cible_id &&
      values.depot_source_id === values.depot_cible_id
    ) {
      errors.depot_cible_id =
        "Le dépôt cible doit être différent du dépôt source."
    }

    const lineErrors: Record<number, MTransfertLineError> = {}
    const seenArticles = new Set<string>()

    if (values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne au transfert."
    }

    values.lines.forEach((line, index) => {
      const lineError: MTransfertLineError = {}
      if (!line.article_id) {
        lineError.article_id = "L'article est requis."
      } else if (seenArticles.has(line.article_id)) {
        lineError.article_id = "Cet article est déjà présent dans le transfert."
      } else {
        seenArticles.add(line.article_id)
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
    form.setErrors(errors)

    return errors
  }

  async function handleSubmit() {
    const nextErrors = validateTransfert()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = form.values
    const payload: CreateTransfertPayload = {
      depot_source_id: values.depot_source_id,
      depot_cible_id: values.depot_cible_id,
      commentaire: values.commentaire.trim() || undefined,
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty: Number(normalizeDecimal(line.qty)),
      })),
    }

    setSaving(true)
    try {
      const { envelope } = await transfertService.createTransfert(payload)
      toast.success(envelope.message)
      setFormOpen(false)
      form.reset()
      // Tri par défaut sur created_at DESC : le nouveau transfert apparaît en tête.
      setPage(1)
      reload()
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

  async function openDetail(transfert: ApiTransfert) {
    setViewing(transfert)
    setDetailLoading(true)
    try {
      const { transfert: fresh } = await transfertService.getTransfert(
        transfert.transfert_id
      )
      setViewing(fresh)
    } catch (err) {
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer le détail du transfert.",
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
        <h1 className="text-3xl font-semibold tracking-tight">Transferts</h1>
        <p className="text-muted-foreground">
          Déplacez des articles d&apos;un dépôt source vers un dépôt cible. La
          sortie et l&apos;entrée sont enregistrées dans une seule transaction :
          un stock insuffisant annule tout le transfert.
        </p>
      </header>

      {/* Création d'un transfert */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate()
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRightIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouveau transfert</DialogTitle>
              <DialogDescription>
                Choisissez les dépôts source et cible, puis les articles à
                déplacer. Le transfert est validé immédiatement.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MTransfertForm
              formId={TRANSFERT_FORM_ID}
              showActions={false}
              values={form.values}
              errors={form.errors}
              articles={articles}
              depots={depots}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={saving}
              onChange={form.setValues}
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
              form={TRANSFERT_FORM_ID}
              disabled={saving || optionsLoading}
            >
              {saving ? "Enregistrement…" : "Valider le transfert"}
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
              <ArrowLeftRightIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail du transfert</DialogTitle>
              <DialogDescription>
                {viewing?.transfert_code ?? "Transfert de stock"}
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
                      {viewing.transfert_code}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Type</span>
                    <div>
                      <AtomBadge
                        variant={viewing.is_inter_pos ? "secondary" : "outline"}
                      >
                        {viewing.is_inter_pos ? "Inter-POS" : "Intra-POS"}
                      </AtomBadge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Dépôt source
                    </span>
                    <p className="font-medium">
                      {stockDepotLabel(depots, viewing.depot_source_id)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Dépôt cible
                    </span>
                    <p className="font-medium">
                      {stockDepotLabel(depots, viewing.depot_cible_id)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <div>
                      <AtomBadge
                        variant={
                          viewing.status === "VALIDE"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {viewing.status === "VALIDE" ? "Validé" : "Annulé"}
                      </AtomBadge>
                    </div>
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
                      {formatStockDateTime(viewing.created_at)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Articles transférés
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
                            <TableHead className="w-32 text-right">
                              Quantité
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewing.lignes.map((ligne) => (
                            <TableRow key={ligne.ligne_id}>
                              <TableCell className="max-w-64">
                                <span
                                  className="block truncate font-medium"
                                  title={stockArticleLabel(
                                    articles,
                                    ligne.article_id
                                  )}
                                >
                                  {stockArticleLabel(
                                    articles,
                                    ligne.article_id
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatStockQuantity(ligne.qty)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aucune ligne de transfert.
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
          <CardTitle>Historique des transferts</CardTitle>
          <CardDescription>
            Chaque transfert conserve le détail des deux mouvements de stock
            (sortie du dépôt source puis entrée dans le dépôt cible).
          </CardDescription>
          <CardAction>
            <AtomButton
              iconLeft={PlusIcon}
              onClick={openCreate}
              disabled={saving || optionsLoading}
            >
              Nouveau transfert
            </AtomButton>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <AtomBadge variant="secondary">
              {total} transfert{total > 1 ? "s" : ""}
            </AtomBadge>
            <AtomButton
              size="sm"
              variant="ghost"
              iconLeft={RefreshCwIcon}
              onClick={reload}
              disabled={loading}
              className="ml-auto"
            >
              Actualiser
            </AtomButton>
          </div>

          <OTransfertsTable
            transferts={transferts}
            depots={depots}
            loading={loading}
            error={error}
            disabled={saving}
            onViewDetails={(transfert) => void openDetail(transfert)}
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
