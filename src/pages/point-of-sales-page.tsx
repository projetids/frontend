import { useCallback, useEffect, useRef, useState } from "react"
import {
  DownloadIcon,
  Loader2Icon,
  PencilLineIcon,
  PlusIcon,
  StoreIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_POINT_OF_SALE_FORM,
  MConfirmDialog,
  MPointOfSaleDetails,
  MPointOfSaleForm,
  MPagination,
  MSearchBar,
  type MPointOfSaleFormValues,
} from "@/components/molecules"
import { OExcelImportDialog, OPointOfSalesTable } from "@/components/organisms"
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
import { useAuth } from "@/context/auth-context"
import { hasFormErrors, useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { roleLabel } from "@/lib/roles"
import { requiredRule } from "@/lib/validation"
import * as pointOfSaleService from "@/services/point-of-sale.service"
import type { ApiPointOfSale, CreatePointOfSalePayload } from "@/types/api"

// Gestion des points de vente (module API /point-of-sales) : liste paginée et
// recherchable, création et modification dans une modal, suppression confirmée.
// Import/export Excel. Les admins sont limités à leur propre point de vente ;
// le superadmin voit tout et peut créer/importer.

const PAGE_SIZE = 10
const FORM_ID = "point-of-sale-form"

const RULES = {
  point_of_sale_name: requiredRule("Le nom est requis."),
}

export function PointOfSalesPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [pointsOfSale, setPointsOfSale] = useState<ApiPointOfSale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiPointOfSale | null>(null)
  const form = useFormValidation<MPointOfSaleFormValues>({
    initialValues: EMPTY_POINT_OF_SALE_FORM,
    rules: RULES,
  })
  const [saving, setSaving] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiPointOfSale | null>(null)

  const [toDelete, setToDelete] = useState<ApiPointOfSale | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Import Excel
  const [importOpen, setImportOpen] = useState(false)

  // Recherche différée
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await pointOfSaleService.listPointOfSales({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
        })
        if (cancelled) return
        setPointsOfSale(response.pointsOfSale)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setPointsOfSale([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les points de vente."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, appliedSearch, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  function openCreate() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setEditing(null)
    form.reset(EMPTY_POINT_OF_SALE_FORM)
    setFormOpen(true)
  }

  async function openEdit(pos: ApiPointOfSale) {
    const requestId = ++detailRequestRef.current
    setEditing(pos)
    form.reset({
      point_of_sale_code: pos.point_of_sale_code,
      point_of_sale_name: pos.name,
      address: pos.address ?? "",
      description: pos.description ?? "",
    })
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { pointOfSale: fresh } = await pointOfSaleService.getPointOfSale(pos.id)
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      form.reset({
        point_of_sale_code: fresh.point_of_sale_code,
        point_of_sale_name: fresh.name,
        address: fresh.address ?? "",
        description: fresh.description ?? "",
      })
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la fiche du point de vente.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(pos: ApiPointOfSale) {
    setViewing(pos)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    form.reset(EMPTY_POINT_OF_SALE_FORM)
  }

  async function handleSubmit() {
    const nextErrors = form.validate()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = form.values
    const payload: CreatePointOfSalePayload = {
      point_of_sale_name: values.point_of_sale_name.trim(),
      point_of_sale_code: values.point_of_sale_code.trim() || undefined,
      address: values.address.trim() || null,
      description: values.description.trim() || null,
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await pointOfSaleService.updatePointOfSale(editing.id, payload)
        : await pointOfSaleService.createPointOfSale(payload)
      toast.success(envelope.message)
      closeForm()
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Enregistrement refusé", {
          description:
            "Le code du point de vente est déjà utilisé. Choisissez un autre code.",
        })
      } else {
        toast.error(
          editing ? "Modification impossible" : "Création impossible",
          {
            description:
              err instanceof ApiError
                ? err.details || err.message
                : "Erreur inattendue",
          }
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const { envelope } = await pointOfSaleService.deletePointOfSale(toDelete.id)
      toast.success(envelope.message)
      setToDelete(null)
      if (pointsOfSale.length === 1 && page > 1) setPage(page - 1)
      else reload()
    } catch (err) {
      toast.error("Suppression impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleExport() {
    try {
      const blob = await pointOfSaleService.exportPointOfSales()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "points-de-vente.xlsx"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error("Export impossible", {
        description:
          err instanceof Error ? err.message : "Erreur inattendue",
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <MConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Supprimer ${toDelete?.name ?? "ce point de vente"} ?`}
        description="Le point de vente sera supprimé définitivement. S'il est référencé par des utilisateurs, dépôts, articles, clients ou fournisseurs, la suppression est refusée."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => void handleDelete()}
      />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Points de vente
        </h1>
        <p className="text-muted-foreground">
          Gérez les lieux commerciaux/caisses : nom, code, adresse et
          description. Le code est généré automatiquement par le backend. Un point
          de vente peut rattacher plusieurs dépôts, articles, clients et
          fournisseurs.
        </p>
      </header>

      {/* Import Excel */}
      <OExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importer des points de vente (Excel)"
        description="Fichier .xls/.xlsx, ligne 1 = en-têtes. Colonnes : point_of_sale_name (requis), point_of_sale_code, address, description."
        entityLabel="point(s) de vente"
        onImport={pointOfSaleService.importPointOfSales}
        onImported={reload}
      />

      {/* Création / modification */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {editing ? (
                <PencilLineIcon className="size-5" />
              ) : (
                <PlusIcon className="size-5" />
              )}
            </div>
            <div className="grid gap-1">
              <DialogTitle>
                {editing ? "Modifier le point de vente" : "Nouveau point de vente"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour les informations de ${editing.name}.`
                  : "Renseignez le lieu commercial à ajouter au référentiel."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du point de vente…
              </div>
            ) : (
              <MPointOfSaleForm
                formId={FORM_ID}
                showActions={false}
                values={form.values}
                errors={form.errors}
                submitting={saving}
                submitLabel={editing ? "Enregistrer" : "Créer"}
                onChange={form.setValues}
                onSubmit={() => void handleSubmit()}
                onCancel={closeForm}
              />
            )}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={closeForm} disabled={saving}>
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le point de vente"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consultation */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StoreIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails du point de vente</DialogTitle>
              <DialogDescription>
                Fiche complète : identification, localisation et traçabilité.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MPointOfSaleDetails pointOfSale={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const pos = viewing
                  setViewing(null)
                  void openEdit(pos)
                }}
              >
                Modifier
              </AtomButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue des points de vente</CardTitle>
          <CardDescription>
            Recherchez par code, nom, adresse ou description, puis modifiez ou
            supprimez un point de vente.
          </CardDescription>
          <CardAction>
            <div className="flex gap-2">
              {isSuperadmin ? (
                <AtomButton
                  iconLeft={UploadIcon}
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                  disabled={saving || deleting}
                >
                  Importer Excel
                </AtomButton>
              ) : null}
              <AtomButton
                iconLeft={DownloadIcon}
                variant="outline"
                onClick={() => void handleExport()}
                disabled={saving || deleting}
              >
                Exporter Excel
              </AtomButton>
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openCreate}
                disabled={saving || deleting}
              >
                Nouveau point de vente
              </AtomButton>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un point de vente…"
              aria-label="Rechercher un point de vente"
              className="sm:max-w-xs"
            />
            <AtomBadge variant="secondary">
              {total} point{total > 1 ? "s" : ""} de vente
            </AtomBadge>
          </div>

          <OPointOfSalesTable
            pointsOfSale={pointsOfSale}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            onEdit={(pos) => void openEdit(pos)}
            onDelete={setToDelete}
            onViewDetails={openViewDetails}
            onRetry={reload}
          />

          <MPagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            disabled={loading || deleting}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}