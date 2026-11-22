import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2Icon, PencilLineIcon, PlusIcon, UploadIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_CLIENT_FORM,
  MClientDetails,
  MClientForm,
  MConfirmDialog,
  MPagination,
  MSearchBar,
  type MClientFormValues,
} from "@/components/molecules"
import { OExcelImportDialog, OClientsTable } from "@/components/organisms"
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
import { roleLabel } from "@/lib/roles"
import { phoneRule, requiredRule, uuidRule } from "@/lib/validation"
import * as clientService from "@/services/client.service"
import * as importService from "@/services/import.service"
import * as pointOfSaleService from "@/services/point-of-sale.service"
import type { ApiClient, ApiPointOfSale, CreateClientPayload } from "@/types/api"

// Gestion des clients (module API /clients) : liste paginée et recherchable,
// création et modification dans une modal, suppression confirmée. Les admins
// sont limités à leur point de vente ; le superadmin voit tous les clients et
// doit choisir le point de vente de rattachement à la création.

const PAGE_SIZE = 10
const CLIENT_FORM_ID = "client-form"

/** Convertit un client API en valeurs de formulaire. */
function toFormValues(client: ApiClient): MClientFormValues {
  return {
    client_name: client.client_name,
    client_telephone: client.client_telephone ?? "",
    client_matricule: client.client_matricule ?? "",
    client_corps: client.client_corps ?? "",
    client_grade: client.client_grade ?? "",
    point_of_sale_id: client.point_of_sale_id,
  }
}

export function ClientsPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [clients, setClients] = useState<ApiClient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  const [importOpen, setImportOpen] = useState(false)
  const [importPosId, setImportPosId] = useState("")
  const [posOptions, setPosOptions] = useState<ApiPointOfSale[]>([])
  const [posOptionsLoading, setPosOptionsLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiClient | null>(null)
  const form = useFormValidation<MClientFormValues>({
    initialValues: EMPTY_CLIENT_FORM,
    rules: {
      client_name: requiredRule("Le nom est requis."),
      client_telephone: phoneRule(),
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
  // Chargement de la fiche complète (GET /clients/:id) avant édition.
  const [formLoading, setFormLoading] = useState(false)
  // Identifie la requête de détail en cours : une réponse obsolète est ignorée.
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiClient | null>(null)

  const [toDelete, setToDelete] = useState<ApiClient | null>(null)
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
        const response = await clientService.listClients({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
        })
        if (cancelled) return
        setClients(response.clients)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setClients([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les clients."
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

  function openImport() {
    setImportOpen(true)
    if (!isSuperadmin || posOptions.length > 0) return
    setPosOptionsLoading(true)
    pointOfSaleService
      .listPointOfSaleOptions()
      .then(({ options }) => setPosOptions(options))
      .catch((err) => {
        toast.error("Points de vente indisponibles", {
          description:
            err instanceof ApiError
              ? err.details || err.message
              : "Erreur inattendue",
        })
      })
      .finally(() => setPosOptionsLoading(false))
  }

  function openCreate() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setEditing(null)
    form.reset({
      ...EMPTY_CLIENT_FORM,
      point_of_sale_id: user?.point_of_sale_id ?? "",
    })
    setFormOpen(true)
  }

  // Le tableau ne renvoie qu'un résumé : on recharge la fiche complète via son
  // `client_id` pour préremplir la modal d'édition avec les données à jour.
  async function openEdit(client: ApiClient) {
    const requestId = ++detailRequestRef.current
    setEditing(client)
    form.reset(toFormValues(client))
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { client: fresh } = await clientService.getClient(client.client_id)
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      form.reset(toFormValues(fresh))
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la fiche du client.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(client: ApiClient) {
    setViewing(client)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    form.reset(EMPTY_CLIENT_FORM)
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
    // Un ADMIN ne peut pas choisir le PO : l'API force le sien.
    const payload: CreateClientPayload = {
      client_name: values.client_name.trim(),
      client_telephone: values.client_telephone.trim() || null,
      client_matricule: values.client_matricule.trim() || null,
      client_corps: values.client_corps.trim() || null,
      client_grade: values.client_grade.trim() || null,
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await clientService.updateClient(editing.client_id, payload)
        : await clientService.createClient(payload)
      toast.success(envelope.message)
      closeForm()
      // Tri par défaut sur created_at DESC : un nouveau client apparaît en tête.
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      toast.error(editing ? "Modification impossible" : "Création impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const { envelope } = await clientService.deleteClient(toDelete.client_id)
      toast.success(envelope.message)
      setToDelete(null)
      // Dernière ligne de la page courante : revenir à la page précédente.
      if (clients.length === 1 && page > 1) setPage(page - 1)
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
        title={`Supprimer ${toDelete?.client_name ?? "ce client"} ?`}
        description="Le client sera supprimé définitivement. Cette action est irréversible."
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
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Gérez le fichier clients du point de vente : coordonnées, matricule,
          corps et grade. Les admins ne voient que les clients rattachés à leur
          point de vente.
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
                {editing ? "Modifier le client" : "Nouveau client"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour la fiche de ${editing.client_name}.`
                  : "Renseignez les informations du client à ajouter au fichier."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du client…
              </div>
            ) : (
              <MClientForm
                formId={CLIENT_FORM_ID}
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
              form={CLIENT_FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le client"}
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
              <UsersIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails du client</DialogTitle>
              <DialogDescription>
                Fiche complète et informations professionnelles.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MClientDetails client={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const client = viewing
                  setViewing(null)
                  void openEdit(client)
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
          <CardTitle>Fichier clients</CardTitle>
          <CardDescription>
            Recherchez par nom, téléphone, matricule, corps ou grade, puis
            modifiez ou supprimez une fiche depuis le tableau.
          </CardDescription>
          <CardAction>
            <div className="flex gap-2">
              <AtomButton
                iconLeft={UploadIcon}
                variant="outline"
                onClick={openImport}
                disabled={saving || deleting}
              >
                Importer Excel
              </AtomButton>
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openCreate}
                disabled={saving || deleting}
              >
                Nouveau client
              </AtomButton>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client…"
              aria-label="Rechercher un client"
              className="sm:max-w-xs"
            />
            <AtomBadge variant="secondary">
              {total} client{total > 1 ? "s" : ""}
            </AtomBadge>
          </div>

          <OClientsTable
            clients={clients}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            showPointOfSale={isSuperadmin}
            onEdit={(client) => void openEdit(client)}
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

      {/* Import Excel */}
      <OExcelImportDialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) setImportPosId("")
        }}
        title="Importer des clients (Excel)"
        description="Fichier .xls/.xlsx, ligne 1 = en-têtes. Colonnes : client_name (requis), client_telephone, client_matricule, client_corps, client_grade."
        entityLabel="client(s)"
        onImport={(file) =>
          importService.importEntity(
            "clients",
            file,
            isSuperadmin ? importPosId : undefined
          )
        }
        onImported={reload}
        canSubmit={!isSuperadmin || importPosId !== ""}
        extraFields={
          isSuperadmin ? (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Point de vente</label>
              <Select
                value={importPosId}
                onValueChange={setImportPosId}
                disabled={posOptionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      posOptionsLoading
                        ? "Chargement…"
                        : "Sélectionnez un point de vente"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {posOptions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name} ({pos.point_of_sale_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />
    </div>
  )
}
