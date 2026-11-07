import { useCallback, useEffect, useRef, useState } from "react"
import { EyeIcon, Loader2Icon, PencilLineIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_SUPPLIER_FORM,
  MConfirmDialog,
  MPagination,
  MSearchBar,
  MSupplierDetails,
  MSupplierForm,
  type MSupplierFormErrors,
  type MSupplierFormValues,
} from "@/components/molecules"
import { OSuppliersTable } from "@/components/organisms"
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
import { ApiError } from "@/lib/api-client"
import { roleLabel } from "@/lib/roles"
import { validateEmail, validatePhone } from "@/lib/validation"
import * as supplierService from "@/services/supplier.service"
import type { ApiSupplier } from "@/types/api"

// Gestion des fournisseurs (module API /suppliers) : liste paginée et
// recherchable dans un tableau, création et modification dans un panneau
// formulaire, suppression confirmée. Les admins sont limités à leur point de
// vente par l'API ; le superadmin voit tous les fournisseurs.

const PAGE_SIZE = 10
const SUPPLIER_FORM_ID = "supplier-form"

/** Convertit une fiche API en valeurs de formulaire. */
function toFormValues(supplier: ApiSupplier): MSupplierFormValues {
  return {
    supplier_number: supplier.supplier_number,
    suppliers_name: supplier.suppliers_name,
    suppliers_civility: supplier.suppliers_civility,
    suppliers_contact_name: supplier.suppliers_contact_name ?? "",
    suppliers_address: supplier.suppliers_address ?? "",
    suppliers_telephone: supplier.suppliers_telephone ?? "",
    suppliers_email: supplier.suppliers_email ?? "",
  }
}

export function SuppliersPage() {
  const { user } = useAuth()

  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiSupplier | null>(null)
  const [values, setValues] = useState<MSupplierFormValues>({
    ...EMPTY_SUPPLIER_FORM,
    supplier_number: "",
  })
  const [formErrors, setFormErrors] = useState<MSupplierFormErrors>({})
  const [saving, setSaving] = useState(false)
  // Chargement de la fiche complète (GET /suppliers/:id) avant édition.
  const [formLoading, setFormLoading] = useState(false)
  // Identifie la requête de détail en cours : une réponse obsolète est ignorée.
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiSupplier | null>(null)

  const [toDelete, setToDelete] = useState<ApiSupplier | null>(null)
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
        const response = await supplierService.listSuppliers({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
        })
        if (cancelled) return
        setSuppliers(response.suppliers)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setSuppliers([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les fournisseurs."
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
    setValues(EMPTY_SUPPLIER_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  // Le tableau ne renvoie qu'un résumé : on recharge la fiche complète via son
  // `supplier_id` pour préremplir la modal d'édition avec les données à jour.
  async function openEdit(supplier: ApiSupplier) {
    const requestId = ++detailRequestRef.current
    setEditing(supplier)
    setValues(toFormValues(supplier))
    setFormErrors({})
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { supplier: fresh } = await supplierService.getSupplier(
        supplier.supplier_id
      )
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      setValues(toFormValues(fresh))
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la fiche du fournisseur.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(supplier: ApiSupplier) {
    setViewing(supplier)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    setValues(EMPTY_SUPPLIER_FORM)
    setFormErrors({})
  }

  function validateForm(): MSupplierFormErrors {
    const errors: MSupplierFormErrors = {}
    if (!values.suppliers_name.trim())
      errors.suppliers_name = "Le nom est requis."
    if (values.suppliers_telephone.trim()) {
      const phoneError = validatePhone(values.suppliers_telephone)
      if (phoneError) errors.suppliers_telephone = phoneError
    }
    if (values.suppliers_email.trim()) {
      const emailError = validateEmail(values.suppliers_email.trim())
      if (emailError) errors.suppliers_email = emailError
    }
    return errors
  }

  async function handleSubmit() {
    const nextErrors = validateForm()
    setFormErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    // Champs optionnels vidés → `null` pour effacer la valeur existante.
    // NOTE : supplier_number est généré par le backend, on ne l'envoie pas.
    const payload = {
      supplier_number: values.supplier_number,
      suppliers_name: values.suppliers_name.trim(),
      suppliers_civility: values.suppliers_civility,
      suppliers_contact_name: values.suppliers_contact_name.trim() || null,
      suppliers_address: values.suppliers_address.trim() || null,
      suppliers_telephone: values.suppliers_telephone.trim() || null,
      suppliers_email: values.suppliers_email.trim().toLowerCase() || null,
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await supplierService.updateSupplier(editing.supplier_id, payload)
        : await supplierService.createSupplier(payload)
      toast.success(envelope.message)
      closeForm()
      // Tri par défaut sur created_at DESC : un nouveau fournisseur apparaît
      // en tête de la première page.
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setFormErrors({ suppliers_name: "Ce fournisseur existe déjà." })
        toast.error("Enregistrement refusé", {
          description: "Un fournisseur utilise déjà ce nom.",
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
      const { envelope } = await supplierService.deleteSupplier(
        toDelete.supplier_id
      )
      toast.success(envelope.message)
      setToDelete(null)
      // Dernière ligne de la page courante : revenir à la page précédente.
      if (suppliers.length === 1 && page > 1) setPage(page - 1)
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
        title={`Supprimer ${toDelete?.suppliers_name ?? "ce fournisseur"} ?`}
        description="Le fournisseur sera supprimé définitivement. Cette action est irréversible."
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
        <h1 className="text-3xl font-semibold tracking-tight">Fournisseurs</h1>
        <p className="text-muted-foreground">
          Gérez les fournisseurs du supermarché : coordonnées, contact et
          références. Les admins ne voient que les fournisseurs rattachés à leur
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
                {editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour la fiche de ${editing.suppliers_name}.`
                  : "Renseignez les informations du fournisseur à ajouter au catalogue."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement de la fiche…
              </div>
            ) : (
              <MSupplierForm
                formId={SUPPLIER_FORM_ID}
                showActions={false}
                values={values}
                errors={formErrors}
                submitting={saving}
                submitLabel={editing ? "Enregistrer" : "Créer"}
                onChange={(patch) =>
                  setValues((prev) => ({ ...prev, ...patch }))
                }
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
              form={SUPPLIER_FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le fournisseur"}
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
              <EyeIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails du fournisseur</DialogTitle>
              <DialogDescription>
                Fiche complète et coordonnées enregistrées.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MSupplierDetails supplier={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const supplier = viewing
                  setViewing(null)
                  void openEdit(supplier)
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
          <CardTitle>Catalogue fournisseurs</CardTitle>
          <CardDescription>
            Recherchez par numéro, nom, contact, e-mail ou téléphone, puis
            modifiez ou supprimez une fiche depuis le tableau.
          </CardDescription>
          <CardAction>
            <AtomButton
              iconLeft={PlusIcon}
              onClick={openCreate}
              disabled={saving || deleting}
            >
              Nouveau fournisseur
            </AtomButton>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un fournisseur…"
              aria-label="Rechercher un fournisseur"
              className="sm:max-w-xs"
            />
            <AtomBadge variant="secondary">
              {total} fournisseur{total > 1 ? "s" : ""}
            </AtomBadge>
          </div>

          <OSuppliersTable
            suppliers={suppliers}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            onEdit={(supplier) => void openEdit(supplier)}
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
