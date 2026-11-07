import { useState } from "react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MConfirmDialog, MField, MProfileDetails } from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { roleLabel, statusBadgeVariant, statusLabel } from "@/lib/roles"
import {
  validateEmail,
  validatePassword,
  validatePhone,
} from "@/lib/validation"
import * as authService from "@/services/auth.service"

// Page profil accessible à tous les rôles (superadmin, admin, caissier) :
// lecture et mise à jour des informations personnelles, changement du mot de
// passe confirmé par une modal, et rappel de toutes les métadonnées du compte
// renvoyées par `GET /auth/profile`. Le rôle n'est pas modifiable ici.

type ProfileErrors = Partial<{ name: string; mail: string; phone: string }>
type PasswordErrors = Partial<{ password: string; confirm: string }>

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [profileForm, setProfileForm] = useState({
    name: user?.user_name ?? "",
    mail: user?.user_mail ?? "",
    phone: user?.user_phone ?? "",
  })
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirm: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [savingPassword, setSavingPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState(false)

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault()

    const nextErrors: ProfileErrors = {
      name: profileForm.name.trim() ? undefined : "Le nom est requis.",
      mail: validateEmail(profileForm.mail) ?? undefined,
      phone: validatePhone(profileForm.phone, false) ?? undefined,
    }
    setProfileErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    setSavingProfile(true)
    try {
      const phone = profileForm.phone.trim()
      const { user: updated } = await authService.updateProfile({
        user_name: profileForm.name.trim(),
        user_mail: profileForm.mail.trim().toLowerCase(),
        ...(phone ? { user_phone: phone } : {}),
      })
      updateUser(updated)
      setProfileForm({
        name: updated.user_name,
        mail: updated.user_mail,
        phone: updated.user_phone ?? "",
      })
      toast.success("Profil mis à jour")
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setProfileErrors({
          mail: "Un compte utilise déjà cette adresse e-mail.",
        })
        toast.error("Mise à jour refusée", {
          description: "Cette adresse e-mail est déjà utilisée.",
        })
      } else {
        toast.error("Mise à jour impossible", {
          description:
            err instanceof ApiError
              ? err.details || err.message
              : "Erreur inattendue",
        })
      }
    } finally {
      setSavingProfile(false)
    }
  }

  function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()

    const nextErrors: PasswordErrors = {
      password: validatePassword(passwordForm.password) ?? undefined,
      confirm:
        passwordForm.confirm !== passwordForm.password
          ? "Les mots de passe ne correspondent pas."
          : undefined,
    }
    setPasswordErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    // Action sensible : confirmation explicite avant l'appel à l'API.
    setConfirmPassword(true)
  }

  async function handlePasswordConfirm() {
    setSavingPassword(true)
    try {
      const { user: updated } = await authService.updateProfile({
        user_password: passwordForm.password,
      })
      updateUser(updated)
      setPasswordForm({ password: "", confirm: "" })
      setPasswordErrors({})
      toast.success("Mot de passe mis à jour")
    } catch (err) {
      toast.error("Changement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const displayName = user?.user_name ?? "Mon profil"

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <MConfirmDialog
        open={confirmPassword}
        onOpenChange={setConfirmPassword}
        title="Changer le mot de passe ?"
        description="Votre mot de passe actuel sera remplacé immédiatement. Utilisez le nouveau lors de votre prochaine connexion."
        confirmLabel="Changer le mot de passe"
        onConfirm={() => void handlePasswordConfirm()}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
            {initials(displayName)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              Mon profil
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {user
                ? `${user.user_name} · ${user.user_mail}`
                : "Consultez et mettez à jour les informations de votre compte IDS."}
            </p>
          </div>
        </div>
        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
            {user.user_status ? (
              <AtomBadge variant={statusBadgeVariant(user.user_status)}>
                {statusLabel(user.user_status)}
              </AtomBadge>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Votre nom, votre adresse e-mail et votre numéro de téléphone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MField
                    label="Nom complet"
                    id="profileName"
                    value={profileForm.name}
                    error={profileErrors.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    autoComplete="name"
                    disabled={savingProfile}
                    required
                  />
                  <MField
                    label="Adresse e-mail"
                    type="email"
                    id="profileMail"
                    value={profileForm.mail}
                    error={profileErrors.mail}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        mail: event.target.value,
                      }))
                    }
                    autoComplete="email"
                    disabled={savingProfile}
                    required
                  />
                  <MField
                    label="Téléphone"
                    id="profilePhone"
                    value={profileForm.phone}
                    error={profileErrors.phone}
                    description="Optionnel — utilisé pour vous contacter."
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    autoComplete="tel"
                    disabled={savingProfile}
                  />
                </div>

                <div>
                  <AtomButton type="submit" disabled={savingProfile}>
                    {savingProfile
                      ? "Enregistrement…"
                      : "Enregistrer les modifications"}
                  </AtomButton>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
              <CardDescription>
                Choisissez un mot de passe d&apos;au moins 8 caractères, avec
                majuscule, minuscule, chiffre et caractère spécial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MField
                    label="Nouveau mot de passe"
                    type="password"
                    id="profilePassword"
                    value={passwordForm.password}
                    error={passwordErrors.password}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    disabled={savingPassword}
                    required
                  />
                  <MField
                    label="Confirmer le mot de passe"
                    type="password"
                    id="profilePasswordConfirm"
                    value={passwordForm.confirm}
                    error={passwordErrors.confirm}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirm: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    disabled={savingPassword}
                    required
                  />
                </div>

                <div>
                  <AtomButton
                    type="submit"
                    variant="outline"
                    disabled={savingPassword}
                  >
                    {savingPassword
                      ? "Mise à jour…"
                      : "Changer le mot de passe"}
                  </AtomButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6 lg:col-span-2">
          <CardHeader>
            <CardTitle>Détails du compte</CardTitle>
            <CardDescription>
              Métadonnées renvoyées par le serveur — non modifiables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <MProfileDetails user={user} />
            ) : (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
