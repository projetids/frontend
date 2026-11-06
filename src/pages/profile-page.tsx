import { useState } from "react"
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
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { roleLabel } from "@/lib/roles"
import { validateEmail, validatePassword, validatePhone } from "@/lib/validation"
import * as authService from "@/services/auth.service"

// Page profil accessible à tous les rôles (superadmin, admin, caissier) :
// lecture et mise à jour des informations personnelles, changement du mot de
// passe confirmé par une modal. Le rôle n'est pas modifiable ici (API admin).

type ProfileErrors = Partial<{ name: string; mail: string; phone: string }>
type PasswordErrors = Partial<{ password: string; confirm: string }>

function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
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
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" })
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
            err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
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
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <MConfirmDialog
        open={confirmPassword}
        onOpenChange={setConfirmPassword}
        title="Changer le mot de passe ?"
        description="Votre mot de passe actuel sera remplacé immédiatement. Utilisez le nouveau lors de votre prochaine connexion."
        confirmLabel="Changer le mot de passe"
        onConfirm={() => void handlePasswordConfirm()}
      />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Compte</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Consultez et mettez à jour les informations de votre compte IDS.
          Chaque rôle dispose de son propre profil.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>
            Votre nom, votre adresse e-mail et votre numéro de téléphone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={handleProfileSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MField
                label="Nom complet"
                id="profileName"
                value={profileForm.name}
                error={profileErrors.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
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
                  setProfileForm((prev) => ({ ...prev, mail: event.target.value }))
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
                  setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                autoComplete="tel"
                disabled={savingProfile}
              />
            </div>

            <dl className="text-muted-foreground flex flex-wrap gap-x-8 gap-y-2 text-xs">
              <div className="flex gap-1">
                <dt>Rôle :</dt>
                <dd className="text-foreground font-medium">
                  {user ? roleLabel(user.role) : "—"}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt>Compte créé le :</dt>
                <dd className="text-foreground font-medium">
                  {formatDate(user?.created_at)}
                </dd>
              </div>
            </dl>

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
                {savingPassword ? "Mise à jour…" : "Changer le mot de passe"}
              </AtomButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
