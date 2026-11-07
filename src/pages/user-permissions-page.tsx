import { useCallback, useEffect, useMemo, useState } from "react"
import { KeyRoundIcon, PencilLineIcon, PlusIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_PERMISSION_FORM,
  MConfirmDialog,
  MPagination,
  MPermissionDetails,
  MPermissionForm,
  MSearchBar,
  MSelectField,
  MUserPermissionsPanel,
  type MPermissionFormErrors,
  type MPermissionFormValues,
} from "@/components/molecules"
import { OPermissionsTable } from "@/components/organisms"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { diffFlags, normalizeFlags } from "@/lib/permissions"
import { roleLabel } from "@/lib/roles"
import * as authService from "@/services/auth.service"
import * as permissionService from "@/services/permission.service"
import type { ApiPermission, ApiUser } from "@/types/api"

// Gestion des permissions utilisateur (docs/user-permissions.md) :
// - catalogue dynamique `/permissions/catalog` : lecture pour tous les rôles,
//   CRUD réservé au superadmin ;
// - flags POS/caisse par utilisateur : `/users/:id/permissions` pour les admins
//   et superadmins, `/auth/profile/permissions` pour le caissier connecté.
// L'API scope les admins à leur point de vente et ignore les codes inconnus.

const CATALOG_PAGE_SIZE = 10
const PERMISSION_FORM_ID = "permission-form"
const PERMISSION_CODE_PATTERN = /^[A-Z0-9_-]{1,20}$/

/** Convertit une permission API en valeurs de formulaire. */
function toFormValues(permission: ApiPermission): MPermissionFormValues {
  return {
    code: permission.code,
    label_fr: permission.label_fr,
    reserved: permission.reserved,
    default_enabled: permission.default_enabled,
    is_active: permission.is_active,
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.details || err.message : fallback
}

type ErrorBlockProps = {
  message: string
  onRetry: () => void
}

function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
      <p className="text-sm text-destructive">{message}</p>
      <AtomButton size="sm" variant="outline" onClick={onRetry}>
        Réessayer
      </AtomButton>
    </div>
  )
}

export function UserPermissionsPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"
  const canManageUsers = user?.role === "superadmin" || user?.role === "admin"
  const canManageCatalog = isSuperadmin

  // ——— Catalogue ———
  const [catalog, setCatalog] = useState<ApiPermission[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogReloadKey, setCatalogReloadKey] = useState(0)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogPage, setCatalogPage] = useState(1)

  // ——— Permissions d'un utilisateur ———
  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersReloadKey, setUsersReloadKey] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [savedFlags, setSavedFlags] = useState<Record<string, boolean>>({})
  const [loadedUserId, setLoadedUserId] = useState("")
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [permissionsReloadKey, setPermissionsReloadKey] = useState(0)
  const [savingPermissions, setSavingPermissions] = useState(false)

  // ——— Modales du catalogue ———
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiPermission | null>(null)
  const [formValues, setFormValues] = useState<MPermissionFormValues>(
    EMPTY_PERMISSION_FORM
  )
  const [formErrors, setFormErrors] = useState<MPermissionFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<ApiPermission | null>(null)
  const [toDelete, setToDelete] = useState<ApiPermission | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Catalogue chargé une fois puis à chaque action CRUD.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setCatalogLoading(true)
      try {
        const { permissions } = await permissionService.listPermissionCatalog()
        if (cancelled) return
        setCatalog(permissions)
        setCatalogError(null)
      } catch (err) {
        if (cancelled) return
        setCatalog([])
        setCatalogError(
          errorMessage(
            err,
            "Impossible de charger le catalogue des permissions."
          )
        )
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [catalogReloadKey])

  // Liste des utilisateurs ciblables (admins/superadmins uniquement).
  useEffect(() => {
    if (!canManageUsers) return

    let cancelled = false

    async function load() {
      setUsersLoading(true)
      try {
        const { users: list } = await authService.getUsers({
          page: 1,
          limit: 100,
          sort_by: "user_name",
          sort_order: "ASC",
        })
        if (cancelled) return
        setUsers(list)
        setUsersError(null)
      } catch (err) {
        if (cancelled) return
        setUsers([])
        setUsersError(
          errorMessage(err, "Impossible de charger la liste des utilisateurs.")
        )
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [canManageUsers, usersReloadKey])

  // Utilisateur effectivement ciblé : la sélection explicite si elle est
  // toujours valide, sinon l'utilisateur connecté (s'il figure dans la liste)
  // ou le premier utilisateur. Le caissier ne voit que son propre compte.
  const activeUserId = canManageUsers
    ? (() => {
        if (users.length === 0) return ""
        if (
          selectedUserId &&
          users.some((item) => item.user_id === selectedUserId)
        ) {
          return selectedUserId
        }
        const current = user
          ? users.find((item) => item.user_id === user.user_id)
          : undefined
        return current?.user_id ?? users[0].user_id
      })()
    : (user?.user_id ?? "")

  // Flags effectifs de l'utilisateur sélectionné.
  useEffect(() => {
    if (!activeUserId) return

    let cancelled = false

    async function load() {
      try {
        const response = canManageUsers
          ? await permissionService.getUserPermissions(activeUserId)
          : await permissionService.getProfilePermissions()
        if (cancelled) return
        setFlags({ ...response.permissions.flags })
        setSavedFlags({ ...response.permissions.flags })
        setPermissionsError(null)
        setLoadedUserId(activeUserId)
      } catch (err) {
        if (cancelled) return
        setPermissionsError(
          errorMessage(
            err,
            "Impossible de charger les permissions de l'utilisateur."
          )
        )
        setLoadedUserId(activeUserId)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeUserId, canManageUsers, permissionsReloadKey])

  // Les flags affichés correspondent-ils déjà à l'utilisateur ciblé ?
  const permissionsLoading =
    activeUserId !== "" && loadedUserId !== activeUserId

  // Catalogue filtré (recherche sur le code et le libellé) et paginé côté client.
  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase()
    return [...catalog]
      .filter(
        (permission) =>
          !term ||
          permission.code.toLowerCase().includes(term) ||
          permission.label_fr.toLowerCase().includes(term)
      )
      .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }))
  }, [catalog, catalogSearch])

  const catalogPageCount = Math.max(
    1,
    Math.ceil(filteredCatalog.length / CATALOG_PAGE_SIZE)
  )
  // La page courante est bornée au nombre réel de pages (après suppression).
  const currentCatalogPage = Math.min(catalogPage, catalogPageCount)

  const pagedCatalog = useMemo(
    () =>
      filteredCatalog.slice(
        (currentCatalogPage - 1) * CATALOG_PAGE_SIZE,
        currentCatalogPage * CATALOG_PAGE_SIZE
      ),
    [filteredCatalog, currentCatalogPage]
  )

  const normalizedFlags = useMemo(
    () => normalizeFlags(catalog, flags),
    [catalog, flags]
  )

  const changedFlags = useMemo(
    () => diffFlags(catalog, flags, savedFlags),
    [catalog, flags, savedFlags]
  )

  const hasChanges = Object.keys(changedFlags).length > 0

  const selectedUser = canManageUsers
    ? users.find((item) => item.user_id === activeUserId)
    : user

  const userOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.user_id,
        label: `${item.user_name} · ${roleLabel(item.role)}`,
      })),
    [users]
  )

  const reloadCatalog = useCallback(() => {
    setCatalogReloadKey((key) => key + 1)
  }, [])

  function handleCatalogSearch(value: string) {
    setCatalogSearch(value)
    setCatalogPage(1)
  }

  function handleToggle(code: string, enabled: boolean) {
    setFlags((previous) => ({ ...previous, [code]: enabled }))
  }

  function handleEnableAll() {
    setFlags((previous) => {
      const next = { ...previous }
      for (const permission of catalog) {
        if (permission.is_active) next[permission.code] = true
      }
      return next
    })
  }

  function handleDisableAll() {
    setFlags((previous) => {
      const next = { ...previous }
      for (const permission of catalog) {
        if (permission.is_active) next[permission.code] = false
      }
      return next
    })
  }

  function handleResetPermissions() {
    setFlags({ ...savedFlags })
  }

  function retryPermissions() {
    setPermissionsError(null)
    setLoadedUserId("")
    setPermissionsReloadKey((key) => key + 1)
  }

  async function handleSavePermissions() {
    if (!activeUserId || !hasChanges) return

    setSavingPermissions(true)
    try {
      const { envelope, permissions } =
        await permissionService.updateUserPermissions(activeUserId, {
          flags: changedFlags,
        })
      toast.success(envelope.message)
      // L'API renvoie les flags effectifs complets : on resynchronise la base.
      setFlags({ ...permissions.flags })
      setSavedFlags({ ...permissions.flags })
    } catch (err) {
      toast.error("Enregistrement impossible", {
        description: errorMessage(err, "Erreur inattendue"),
      })
    } finally {
      setSavingPermissions(false)
    }
  }

  // ——— CRUD catalogue ———

  function openCreate() {
    setEditing(null)
    setFormValues(EMPTY_PERMISSION_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(permission: ApiPermission) {
    setEditing(permission)
    setFormValues(toFormValues(permission))
    setFormErrors({})
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setFormValues(EMPTY_PERMISSION_FORM)
    setFormErrors({})
  }

  function validateForm(): MPermissionFormErrors {
    const errors: MPermissionFormErrors = {}
    const code = formValues.code.trim().toUpperCase()

    if (!code) {
      errors.code = "Le code de la permission est requis."
    } else if (!PERMISSION_CODE_PATTERN.test(code)) {
      errors.code =
        "Format invalide : lettres majuscules, chiffres, tiret ou underscore (20 max)."
    }

    if (!formValues.label_fr.trim()) {
      errors.label_fr = "Le libellé français est requis."
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

    const code = formValues.code.trim().toUpperCase()
    const label = formValues.label_fr.trim()

    setSaving(true)
    try {
      if (editing) {
        const { envelope } = await permissionService.updatePermission(
          editing.code,
          {
            label_fr: label,
            reserved: formValues.reserved,
            default_enabled: formValues.default_enabled,
            is_active: formValues.is_active,
          }
        )
        toast.success(envelope.message)
        closeForm()
        reloadCatalog()
      } else {
        const { envelope, permission } =
          await permissionService.createPermission({
            code,
            label_fr: label,
            reserved: formValues.reserved,
            default_enabled: formValues.default_enabled,
          })
        toast.success(envelope.message)
        // L'API matérialise le flag par défaut pour tous les utilisateurs :
        // on reflète la valeur localement sans perdre les modifications en cours.
        const createdCode = permission?.code ?? code
        const createdDefault =
          permission?.default_enabled ?? formValues.default_enabled
        setFlags((previous) => ({
          ...previous,
          [createdCode]: createdDefault,
        }))
        setSavedFlags((previous) => ({
          ...previous,
          [createdCode]: createdDefault,
        }))
        closeForm()
        setCatalogSearch("")
        setCatalogPage(1)
        reloadCatalog()
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setFormErrors({ code: "Ce code est déjà utilisé par une permission." })
        toast.error("Enregistrement refusé", {
          description: "Une permission utilise déjà ce code.",
        })
      } else {
        toast.error(
          editing ? "Modification impossible" : "Création impossible",
          { description: errorMessage(err, "Erreur inattendue") }
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return

    const code = toDelete.code
    setDeleting(true)
    try {
      const { envelope } = await permissionService.deletePermission(code)
      toast.success(envelope.message)
      // La suppression retire aussi les flags utilisateurs associés.
      setFlags((previous) => {
        const next = { ...previous }
        delete next[code]
        return next
      })
      setSavedFlags((previous) => {
        const next = { ...previous }
        delete next[code]
        return next
      })
      if (viewing?.code === code) setViewing(null)
      setToDelete(null)
      // Si la page courante devient vide, revenir à la dernière page valide.
      const remaining = filteredCatalog.filter(
        (permission) => permission.code !== code
      ).length
      setCatalogPage((current) =>
        Math.min(current, Math.max(1, Math.ceil(remaining / CATALOG_PAGE_SIZE)))
      )
      reloadCatalog()
    } catch (err) {
      toast.error("Suppression impossible", {
        description: errorMessage(err, "Erreur inattendue"),
      })
    } finally {
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <MConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Supprimer ${toDelete?.code ?? "cette permission"} ?`}
        description="La permission et les flags de tous les utilisateurs associés seront supprimés définitivement. Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => void handleDelete()}
      />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">
            {canManageUsers ? "Administration" : "Compte"}
          </AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Permissions utilisateur
        </h1>
        <p className="text-muted-foreground">
          {canManageUsers
            ? "Activez les flags POS/caisse de chaque utilisateur et gérez le catalogue dynamique des permissions. Les admins sont limités aux utilisateurs de leur point de vente ; le superadmin gère tout le catalogue."
            : "Consultez les permissions POS/caisse de votre compte. Seul un administrateur peut les modifier."}
        </p>
      </header>

      {/* Permissions d'un utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle>
            {canManageUsers
              ? "Permissions d'un utilisateur"
              : "Mes permissions"}
          </CardTitle>
          <CardDescription>
            {canManageUsers
              ? "Sélectionnez un utilisateur puis cochez les permissions autorisées. Seuls les changements sont envoyés à l'API."
              : "Vos permissions sont attribuées par un administrateur. Elles sont affichées en lecture seule."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManageUsers ? (
            usersError ? (
              <ErrorBlock
                message={usersError}
                onRetry={() => setUsersReloadKey((key) => key + 1)}
              />
            ) : usersLoading ? (
              <Skeleton className="h-9 w-full sm:max-w-md" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun utilisateur disponible pour le moment.
              </p>
            ) : (
              <div className="sm:max-w-md">
                <MSelectField
                  label="Utilisateur"
                  id="permissionUser"
                  value={activeUserId}
                  onValueChange={setSelectedUserId}
                  options={userOptions}
                  placeholder="Sélectionner un utilisateur…"
                  description={
                    isSuperadmin
                      ? "Le superadmin peut gérer les flags de tous les utilisateurs."
                      : "Vous ne pouvez gérer que les utilisateurs de votre point de vente."
                  }
                  disabled={savingPermissions}
                />
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Connecté en tant que {user?.user_name ?? "utilisateur"} — les
              permissions ci-dessous reflètent votre compte.
            </p>
          )}

          {activeUserId ? (
            (catalogLoading && catalog.length === 0) || permissionsLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : catalogError ? (
              <ErrorBlock message={catalogError} onRetry={reloadCatalog} />
            ) : permissionsError ? (
              <ErrorBlock
                message={permissionsError}
                onRetry={retryPermissions}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedUser
                      ? `${selectedUser.user_name} · ${roleLabel(selectedUser.role)}`
                      : "Permissions de l'utilisateur sélectionné"}
                  </p>
                  {hasChanges ? (
                    <AtomBadge variant="secondary">
                      {Object.keys(changedFlags).length} modification
                      {Object.keys(changedFlags).length > 1 ? "s" : ""} non
                      enregistrée
                      {Object.keys(changedFlags).length > 1 ? "s" : ""}
                    </AtomBadge>
                  ) : null}
                </div>

                <MUserPermissionsPanel
                  permissions={catalog}
                  flags={normalizedFlags}
                  disabled={!canManageUsers || savingPermissions}
                  onToggle={handleToggle}
                  onEnableAll={handleEnableAll}
                  onDisableAll={handleDisableAll}
                />

                {canManageUsers ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Les flags non modifiés ne sont pas transmis.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <AtomButton
                        size="sm"
                        variant="outline"
                        disabled={!hasChanges || savingPermissions}
                        onClick={handleResetPermissions}
                      >
                        Réinitialiser
                      </AtomButton>
                      <AtomButton
                        size="sm"
                        iconLeft={SaveIcon}
                        disabled={!hasChanges || savingPermissions}
                        onClick={() => void handleSavePermissions()}
                      >
                        {savingPermissions ? "Enregistrement…" : "Enregistrer"}
                      </AtomButton>
                    </div>
                  </div>
                ) : null}
              </>
            )
          ) : null}
        </CardContent>
      </Card>

      {/* Catalogue des permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Catalogue des permissions</CardTitle>
          <CardDescription>
            {canManageCatalog
              ? "Créez, modifiez ou supprimez les permissions disponibles. Chaque permission est appliquée utilisateur par utilisateur."
              : "Le catalogue est géré par le superadmin. Vous pouvez consulter les permissions et leurs valeurs par défaut."}
          </CardDescription>
          {canManageCatalog ? (
            <CardAction>
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openCreate}
                disabled={busy}
              >
                Nouvelle permission
              </AtomButton>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={catalogSearch}
              onChange={(event) => handleCatalogSearch(event.target.value)}
              placeholder="Rechercher un code ou un libellé…"
              aria-label="Rechercher une permission"
              className="sm:max-w-xs"
            />
            <AtomBadge variant="secondary">
              {filteredCatalog.length} permission
              {filteredCatalog.length === 1 ? "" : "s"}
            </AtomBadge>
          </div>

          <OPermissionsTable
            permissions={pagedCatalog}
            loading={catalogLoading}
            error={catalogError}
            disabled={busy}
            canManage={canManageCatalog}
            onEdit={openEdit}
            onDelete={setToDelete}
            onViewDetails={setViewing}
            onRetry={reloadCatalog}
          />

          <MPagination
            page={currentCatalogPage}
            limit={CATALOG_PAGE_SIZE}
            total={filteredCatalog.length}
            disabled={catalogLoading || busy}
            onPageChange={setCatalogPage}
          />
        </CardContent>
      </Card>

      {/* Création / modification d'une permission */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-xl">
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
                {editing ? "Modifier la permission" : "Nouvelle permission"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour les options de ${editing.code}.`
                  : "Ajoutez une permission au catalogue dynamique."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MPermissionForm
              formId={PERMISSION_FORM_ID}
              showActions={false}
              lockCode={editing !== null}
              showActive={editing !== null}
              values={formValues}
              errors={formErrors}
              submitting={saving}
              submitLabel={editing ? "Enregistrer" : "Créer"}
              onChange={(patch) =>
                setFormValues((previous) => ({ ...previous, ...patch }))
              }
              onSubmit={() => void handleSubmit()}
              onCancel={closeForm}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={closeForm} disabled={saving}>
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={PERMISSION_FORM_ID}
              disabled={saving}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer la permission"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consultation d'une permission */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails de la permission</DialogTitle>
              <DialogDescription>
                Code, libellé et options enregistrés dans le catalogue.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MPermissionDetails permission={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing && canManageCatalog ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const permission = viewing
                  setViewing(null)
                  openEdit(permission)
                }}
              >
                Modifier
              </AtomButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
