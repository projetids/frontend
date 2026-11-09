import { useCallback, useEffect, useRef, useState } from "react"
import {
  Loader2Icon,
  PencilLineIcon,
  PlusIcon,
  WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_DEPOT_FORM,
  MConfirmDialog,
  MDepotDetails,
  MDepotForm,
  MPagination,
  MSearchBar,
  type MDepotFormValues,
} from "@/components/molecules"
import { ODepotsTable } from "@/components/organisms"
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
import {
  DEPOT_STATUS_OPTIONS,
  depotStatusToQuery,
  type DepotStatusFilter,
} from "@/lib/depots"
import { roleLabel } from "@/lib/roles"
import { requiredRule, uuidRule } from "@/lib/validation"
import * as depotService from "@/services/depot.service"
import type { ApiDepot, CreateDepotPayload } from "@/types/api"

// Gestion des dépôts (module API /depots) : liste paginée et recherchable,
// création et modification dans une modal, suppression confirmée. Les admins
// sont limités à leur point de vente ; le superadmin voit tous les dépôts et
// doit choisir le point de vente de rattachement à la création.

const PAGE_SIZE = 10
const DEPOT_FORM_ID = "depot-form"

/** Convertit un dépôt API en valeurs de formulaire. */
function toFormValues(depot: ApiDepot): MDepotFormValues {
  return {
    depot_code: depot.depot_code,
    depot_name: depot.depot_name,
    depot_address: depot.depot_address ?? "",
    depot_description: depot.depot_description ?? "",
    is_active: depot.is_active,
    point_of_sale_id: depot.point_of_sale_id,
  }
}

export function DepotsPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [depots, setDepots] = useState<ApiDepot[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [status, setStatus] = useState<DepotStatusFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiDepot | null>(null)
  const form = useFormValidation<MDepotFormValues>({
    initialValues: EMPTY_DEPOT_FORM,
    rules: {
      depot_name: requiredRule("Le nom est requis."),
      ...(isSuperadmin
        ? {
            point_of_sale_id: [
              requiredRule("Le point de vente est requis."),
              uuidRule(),
            ],
          }
        : {}),
    },
  })
  const [saving, setSaving] = useState(false)
  // Chargement de la fiche complète (GET /depots/:id) avant édition.
  const [formLoading, setFormLoading] = useState(false)
  // Identifie la requête de détail en cours : une réponse obsolète est ignorée.
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiDepot | null>(null)

  const [toDelete, setToDelete] = useState<ApiDepot | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Recherche différée : évite un appel API à chaque frappe.
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
        const response = await depotService.listDepots({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
          is_active: depotStatusToQuery(status),
        })
        if (cancelled) return
        setDepots(response.depots)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setDepots([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les dépôts."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, appliedSearch, status, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  function openCreate() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setEditing(null)
    form.reset({
      ...EMPTY_DEPOT_FORM,
      point_of_sale_id: user?.point_of_sale_id ?? "",
    })
    setFormOpen(true)
  }

  // Le tableau ne renvoie qu'un résumé : on recharge la fiche complète via son
  // `depot_id` pour préremplir la modal d'édition avec les données à jour.
  async function openEdit(depot: ApiDepot) {
    const requestId = ++detailRequestRef.current
    setEditing(depot)
    form.reset(toFormValues(depot))
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { depot: fresh } = await depotService.getDepot(depot.depot_id)
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      form.reset(toFormValues(fresh))
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la fiche du dépôt.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(depot: ApiDepot) {
    setViewing(depot)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    form.reset(EMPTY_DEPOT_FORM)
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

    // Champs optionnels vidés → `null` pour effacer la valeur existante.
    // `depot_code` est généré par le backend : il n'est jamais envoyé.
    // Un ADMIN ne peut pas choisir le PO : l'API force le sien.
    const payload: CreateDepotPayload = {
      depot_name: values.depot_name.trim(),
      depot_address: values.depot_address.trim() || null,
      depot_description: values.depot_description.trim() || null,
      is_active: values.is_active,
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await depotService.updateDepot(editing.depot_id, payload)
        : await depotService.createDepot(payload)
      toast.success(envelope.message)
      closeForm()
      // Tri par défaut sur created_at DESC : un nouveau dépôt apparaît en tête.
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Enregistrement refusé", {
          description:
            "Le code du dépôt n'a pas pu être généré. Réessayez dans un instant.",
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
      const { envelope } = await depotService.deleteDepot(toDelete.depot_id)
      toast.success(envelope.message)
      setToDelete(null)
      // Dernière ligne de la page courante : revenir à la page précédente.
      if (depots.length === 1 && page > 1) setPage(page - 1)
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <MConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Supprimer ${toDelete?.depot_name ?? "ce dépôt"} ?`}
        description="Le dépôt sera supprimé définitivement. Si un historique de stock y est rattaché, préférez le désactiver."
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
        <h1 className="text-3xl font-semibold tracking-tight">Dépôts</h1>
        <p className="text-muted-foreground">
          Gérez les lieux de stockage rattachés aux points de vente : réserves,
          entrepôts et zones de réception. Le code est généré automatiquement
          par le backend.
        </p>
      </header>

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
                {editing ? "Modifier le dépôt" : "Nouveau dépôt"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour les informations de ${editing.depot_name}.`
                  : "Renseignez le lieu de stockage à rattacher à un point de vente."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du dépôt…
              </div>
            ) : (
              <MDepotForm
                formId={DEPOT_FORM_ID}
                showActions={false}
                values={form.values}
                errors={form.errors}
                submitting={saving}
                submitLabel={editing ? "Enregistrer" : "Créer"}
                showPointOfSale={isSuperadmin}
                pointOfSaleRequired={isSuperadmin}
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
              form={DEPOT_FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le dépôt"}
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
              <WarehouseIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails du dépôt</DialogTitle>
              <DialogDescription>
                Fiche complète et rattachement au point de vente.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MDepotDetails depot={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const depot = viewing
                  setViewing(null)
                  void openEdit(depot)
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
          <CardTitle>Catalogue des dépôts</CardTitle>
          <CardDescription>
            Recherchez par code, nom ou adresse, filtrez par statut, puis
            modifiez ou supprimez un dépôt depuis le tableau.
          </CardDescription>
          <CardAction>
            <AtomButton
              iconLeft={PlusIcon}
              onClick={openCreate}
              disabled={saving || deleting}
            >
              Nouveau dépôt
            </AtomButton>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un dépôt…"
              aria-label="Rechercher un dépôt"
              className="sm:max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as DepotStatusFilter)
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
                {DEPOT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AtomBadge variant="secondary">
              {total} dépôt{total > 1 ? "s" : ""}
            </AtomBadge>
          </div>

          <ODepotsTable
            depots={depots}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            showPointOfSale={isSuperadmin}
            onEdit={(depot) => void openEdit(depot)}
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
