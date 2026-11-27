import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  MConfirmDialog,
  MField,
  MPasswordField,
  MProfileDetails,
} from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { usePalette } from "@/components/palette-provider"
import { useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { roleLabel, statusBadgeVariant, statusLabel } from "@/lib/roles"
import {
  emailRule,
  passwordRule,
  phoneRule,
  requiredRule,
  sameAsRule,
} from "@/lib/validation"
import * as authService from "@/services/auth.service"

// Page profil accessible à tous les rôles (superadmin, admin, caissier) :
// lecture et mise à jour des informations personnelles, changement du mot de
// passe confirmé par une modal, et rappel de toutes les métadonnées du compte
// renvoyées par `GET /auth/profile`. Le rôle n'est pas modifiable ici.

type ProfileFormValues = { name: string; mail: string; phone: string }
type PasswordFormValues = {
  current: string
  password: string
  confirm: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const isCashier = user?.role === "cashier"
  const isAdminOrSuper = user?.role === "admin" || user?.role === "superadmin"
  const { paletteId, palettes, setPalette } = usePalette()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { user: fresh } = await authService.getProfile()
        if (cancelled) return
        updateUser(fresh)
      } catch {
        if (cancelled) return
        // Silencieux : on conserve l'utilisateur mémorisé.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [updateUser])

  const profileForm = useFormValidation<ProfileFormValues>({
    initialValues: {
      name: user?.user_name ?? "",
      mail: user?.user_mail ?? "",
      phone: user?.user_phone ?? "",
    },
    rules: {
      name: requiredRule("Le nom est requis."),
      mail: [requiredRule("L'adresse e-mail est requise."), emailRule()],
      phone: phoneRule(),
    },
  })
  const resetProfileForm = profileForm.reset
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user) {
      resetProfileForm({
        name: user.user_name,
        mail: user.user_mail,
        phone: user.user_phone ?? "",
      })
    }
  }, [user, resetProfileForm])
  const passwordForm = useFormValidation<PasswordFormValues>({
    initialValues: { current: "", password: "", confirm: "" },
    rules: {
      current: requiredRule("Le mot de passe actuel est requis."),
      password: passwordRule(),
      confirm: sameAsRule<PasswordFormValues>(
        "password",
        "Les mots de passe ne correspondent pas."
      ),
    },
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState(false)

  const handleProfileSubmit = profileForm.handleSubmit(
    async (values) => {
      setSavingProfile(true)
      try {
        const phone = values.phone.trim()
        const { user: updated } = await authService.updateProfile({
          user_name: values.name.trim(),
          user_mail: values.mail.trim().toLowerCase(),
          ...(phone ? { user_phone: phone } : {}),
        })
        updateUser(updated)
        profileForm.reset({
          name: updated.user_name,
          mail: updated.user_mail,
          phone: updated.user_phone ?? "",
        })
        toast.success("Profil mis à jour")
      } catch (err) {
        if (err instanceof ApiError && err.code === "CONFLICT") {
          profileForm.setErrors({
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
    },
    () =>
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
  )

  const handlePasswordSubmit = passwordForm.handleSubmit(() => {
    // Action sensible : confirmation explicite avant l'appel à l'API.
    setConfirmPassword(true)
  })

  async function handlePasswordConfirm() {
    setSavingPassword(true)
    try {
      await authService.changePassword(
        passwordForm.values.current,
        passwordForm.values.password
      )
      try {
        const { user: fresh } = await authService.getProfile()
        updateUser(fresh)
      } catch {
        // Le mot de passe a changé : on lève quand même le blocage local.
        updateUser(
          user
            ? {
                ...user,
                must_change_password: false,
                password_changed_at: new Date().toISOString(),
              }
            : null
        )
      }
      passwordForm.reset()
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <MConfirmDialog
        open={confirmPassword}
        onOpenChange={setConfirmPassword}
        title="Changer le mot de passe ?"
        description="Votre mot de passe actuel sera remplacé immédiatement. Utilisez le nouveau lors de votre prochaine connexion."
        confirmLabel="Changer le mot de passe"
        onConfirm={() => void handlePasswordConfirm()}
      />

      {user?.must_change_password ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Votre mot de passe est temporaire. Changez-le ci-dessous avant
          d&apos;accéder aux autres fonctionnalités.
        </div>
      ) : null}

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
                {isCashier
                  ? "Vos informations personnelles (lecture seule). Seul le mot de passe peut être modifié."
                  : "Votre nom, votre adresse e-mail et votre numéro de téléphone."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MField
                    label="Nom complet"
                    id="profileName"
                    value={profileForm.values.name}
                    error={profileForm.errors.name}
                    onChange={profileForm.handleChange("name")}
                    autoComplete="name"
                    disabled={savingProfile || isCashier}
                    required
                  />
                  <MField
                    label="Adresse e-mail"
                    type="email"
                    id="profileMail"
                    value={profileForm.values.mail}
                    error={profileForm.errors.mail}
                    onChange={profileForm.handleChange("mail")}
                    autoComplete="email"
                    disabled={savingProfile || isCashier}
                    required
                  />
                  <MField
                    label="Téléphone"
                    id="profilePhone"
                    value={profileForm.values.phone}
                    error={profileForm.errors.phone}
                    description="Optionnel — utilisé pour vous contacter."
                    onChange={profileForm.handleChange("phone")}
                    autoComplete="tel"
                    disabled={savingProfile || isCashier}
                  />
                </div>

                {!isCashier ? (
                  <div>
                    <AtomButton type="submit" disabled={savingProfile}>
                      {savingProfile
                        ? "Enregistrement…"
                        : "Enregistrer les modifications"}
                    </AtomButton>
                  </div>
                ) : null}
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
                  <div className="sm:col-span-2">
                    <MPasswordField
                      label="Mot de passe actuel"
                      id="profileCurrentPassword"
                      value={passwordForm.values.current}
                      error={passwordForm.errors.current}
                      onChange={passwordForm.handleChange("current")}
                      autoComplete="current-password"
                      disabled={savingPassword}
                      required
                    />
                  </div>
                  <MPasswordField
                    label="Nouveau mot de passe"
                    id="profilePassword"
                    value={passwordForm.values.password}
                    error={passwordForm.errors.password}
                    onChange={passwordForm.handleChange("password")}
                    autoComplete="new-password"
                    disabled={savingPassword}
                    required
                  />
                  <MPasswordField
                    label="Confirmer le mot de passe"
                    id="profilePasswordConfirm"
                    value={passwordForm.values.confirm}
                    error={passwordForm.errors.confirm}
                    onChange={passwordForm.handleChange("confirm")}
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

          {isAdminOrSuper ? (
            <Card>
              <CardHeader>
                <CardTitle>Palette de couleurs</CardTitle>
                <CardDescription>
                  Choisissez l'identité visuelle appliquée à votre point de
                  vente. Les utilisateurs liés en héritent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {palettes.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setPalette(palette.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                        paletteId === palette.id
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span
                        className="size-6 rounded-full border"
                        style={{ backgroundColor: palette.primaryLight }}
                      />
                      <span className="truncate">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
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
