import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MConfirmDialog, MField } from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { roleLabel, statusLabel } from "@/lib/roles"
import { validateEmail, validatePassword, validatePhone } from "@/lib/validation"
import * as authService from "@/services/auth.service"
import type { ApiUser } from "@/types/api"

// Page de gestion des comptes (docs/auth.md §4.13 – 4.19) :
// - superadmin : crée un admin, valide ou réactive les comptes admin ;
// - admin : valide ou réactive les caissiers de son point de vente.
// Un compte créé reste `pending` : sans validation, la connexion est refusée
// par l'API avec le code ACCOUNT_PENDING.

type AccountAction = "validate" | "reactivate"

type Confirmation = {
  action: AccountAction
  account: ApiUser
}

type CreateAdminErrors = Partial<{
  name: string
  mail: string
  phone: string
  password: string
  pointOfSale: string
}>

const EMPTY_ADMIN_FORM = {
  name: "",
  mail: "",
  phone: "",
  password: "",
  pointOfSale: "",
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

type AccountRowProps = {
  account: ApiUser
  action: AccountAction
  label: string
  disabled: boolean
  onAction: () => void
}

function AccountRow({
  account,
  action,
  label,
  disabled,
  onAction,
}: AccountRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{account.user_name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {account.user_mail}
          {account.user_phone ? ` · ${account.user_phone}` : ""}
        </p>
        <p className="text-muted-foreground text-xs">
          Créé le {formatDate(account.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AtomBadge
          variant={account.user_status === "rejected" ? "destructive" : "secondary"}
        >
          {statusLabel(account.user_status)}
        </AtomBadge>
        <AtomButton
          size="sm"
          variant={action === "validate" ? "default" : "outline"}
          disabled={disabled}
          onClick={onAction}
        >
          {label}
        </AtomButton>
      </div>
    </li>
  )
}

export function ValidationPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"
  const targetRole = isSuperadmin ? "admin" : "cashier"
  const targetPlural = isSuperadmin ? "admins" : "caissiers"

  const [pendingAccounts, setPendingAccounts] = useState<ApiUser[]>([])
  const [rejectedAccounts, setRejectedAccounts] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM)
  const [adminErrors, setAdminErrors] = useState<CreateAdminErrors>({})
  const [creating, setCreating] = useState(false)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [pending, all] = await Promise.all([
          isSuperadmin
            ? authService.getPendingAdmins()
            : authService.getPendingCaisiers(),
          authService.getUsers({
            limit: 100,
            sort_by: "created_at",
            sort_order: "DESC",
          }),
        ])
        if (cancelled) return
        setPendingAccounts(pending.users)
        // L'API ne liste que les comptes en attente : les comptes rejetés
        // proviennent de GET /auth/users, filtrés sur le rôle géré ici.
        setRejectedAccounts(
          all.users.filter(
            (account) =>
              account.role === targetRole &&
              account.user_status === "rejected",
          ),
        )
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les demandes de validation.",
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isSuperadmin, targetRole, reloadKey])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }, [])

  async function handleConfirm() {
    if (!confirmation) return
    const { action, account } = confirmation
    setSubmitting(true)
    try {
      const response =
        action === "validate"
          ? isSuperadmin
            ? await authService.validateAdmin(account.user_id)
            : await authService.validateCaisier(account.user_id)
          : isSuperadmin
            ? await authService.reactivateAdmin(account.user_id)
            : await authService.reactivateCaisier(account.user_id)
      toast.success(response.envelope.message)
      setConfirmation(null)
      reload()
    } catch (err) {
      toast.error("Action impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateAdmin(event: React.FormEvent) {
    event.preventDefault()

    const nextErrors: CreateAdminErrors = {
      name: adminForm.name.trim() ? undefined : "Le nom est requis.",
      mail: validateEmail(adminForm.mail) ?? undefined,
      phone: validatePhone(adminForm.phone, false) ?? undefined,
      password: validatePassword(adminForm.password) ?? undefined,
      pointOfSale: adminForm.pointOfSale.trim()
        ? undefined
        : "Le point de vente est requis.",
    }
    setAdminErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    setCreating(true)
    try {
      const pointOfSale = adminForm.pointOfSale.trim()
      const phone = adminForm.phone.trim()
      const { envelope } = await authService.createAdmin({
        user_name: adminForm.name.trim(),
        user_mail: adminForm.mail.trim().toLowerCase(),
        user_password: adminForm.password,
        ...(phone ? { user_phone: phone } : {}),
        // Un UUID cible un point de vente existant ; sinon l'API le crée.
        ...(UUID_REGEX.test(pointOfSale)
          ? { point_of_sale_id: pointOfSale }
          : { point_of_sale_nom: pointOfSale }),
      })
      toast.success(envelope.message)
      setAdminForm(EMPTY_ADMIN_FORM)
      setAdminErrors({})
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setAdminErrors({
          mail: "Un compte utilise déjà ce nom ou cette adresse e-mail.",
        })
        toast.error("Création refusée", {
          description: "Ce nom ou cette adresse e-mail est déjà utilisé.",
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
      setCreating(false)
    }
  }

  const actionLabel = (action: AccountAction): string =>
    action === "validate" ? "Valider" : "Réactiver"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <MConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
        title={
          confirmation
            ? `${actionLabel(confirmation.action)} ${confirmation.account.user_name} ?`
            : ""
        }
        description={
          confirmation?.action === "validate"
            ? "Le compte sera activé et pourra se connecter immédiatement."
            : "Le compte rejeté sera réactivé et pourra se connecter à nouveau."
        }
        confirmLabel={confirmation ? actionLabel(confirmation.action) : "Confirmer"}
        onConfirm={() => void handleConfirm()}
      />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Administration</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Validation des comptes
        </h1>
        <p className="text-muted-foreground">
          Les {targetPlural} restent inactifs tant qu&apos;un compte{" "}
          {isSuperadmin ? "superadmin" : "admin"} ne les a pas validés.
        </p>
      </header>

      {isSuperadmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Créer un compte admin</CardTitle>
            <CardDescription>
              Le compte est créé en attente : validez-le ensuite pour
              l&apos;activer. Le point de vente est repris s&apos;il existe, sinon
              créé à partir de son nom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <MField
                  label="Nom complet"
                  id="adminName"
                  value={adminForm.name}
                  error={adminErrors.name}
                  onChange={(event) =>
                    setAdminForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  autoComplete="off"
                  disabled={creating}
                  required
                />
                <MField
                  label="Adresse e-mail"
                  type="email"
                  id="adminMail"
                  value={adminForm.mail}
                  error={adminErrors.mail}
                  onChange={(event) =>
                    setAdminForm((prev) => ({ ...prev, mail: event.target.value }))
                  }
                  autoComplete="off"
                  disabled={creating}
                  required
                />
                <MField
                  label="Téléphone"
                  id="adminPhone"
                  value={adminForm.phone}
                  error={adminErrors.phone}
                  description="Optionnel — utilisé pour vous contacter."
                  onChange={(event) =>
                    setAdminForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  autoComplete="off"
                  disabled={creating}
                />
                <MField
                  label="Mot de passe"
                  type="password"
                  id="adminPassword"
                  value={adminForm.password}
                  error={adminErrors.password}
                  description="8 caractères min., avec casse variée, chiffre et caractère spécial."
                  onChange={(event) =>
                    setAdminForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  disabled={creating}
                  required
                />
              </div>
              <MField
                label="Point de vente"
                id="adminPointOfSale"
                value={adminForm.pointOfSale}
                error={adminErrors.pointOfSale}
                description="Nom du point de vente à créer, ou identifiant UUID d'un point de vente existant."
                onChange={(event) =>
                  setAdminForm((prev) => ({
                    ...prev,
                    pointOfSale: event.target.value,
                  }))
                }
                autoComplete="off"
                disabled={creating}
                required
              />
              <div>
                <AtomButton type="submit" disabled={creating}>
                  {creating ? "Création…" : "Créer l'admin"}
                </AtomButton>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Demandes en attente</CardTitle>
          <CardDescription>
            Validez les comptes {targetPlural} qui demandent l&apos;accès à la
            plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-destructive text-sm">{error}</p>
              <AtomButton size="sm" variant="outline" onClick={reload}>
                Réessayer
              </AtomButton>
            </div>
          ) : pendingAccounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune demande en attente.
            </p>
          ) : (
            <ul className="grid gap-2">
              {pendingAccounts.map((account) => (
                <AccountRow
                  key={account.user_id}
                  account={account}
                  action="validate"
                  label="Valider"
                  disabled={submitting}
                  onAction={() =>
                    setConfirmation({ action: "validate", account })
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!loading && !error && rejectedAccounts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Comptes rejetés</CardTitle>
            <CardDescription>
              Réactivez un compte {targetPlural} rejeté ou désactivé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {rejectedAccounts.map((account) => (
                <AccountRow
                  key={account.user_id}
                  account={account}
                  action="reactivate"
                  label="Réactiver"
                  disabled={submitting}
                  onAction={() =>
                    setConfirmation({ action: "reactivate", account })
                  }
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
