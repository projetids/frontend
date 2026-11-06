import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import * as authService from "@/services/auth.service"
import { useBackendMessage } from "@/hooks/use-backend-message"
import { validatePassword } from "@/lib/validation"
import AuthBackgroundShape from "@/assets/svg/auth-background-shape"
import { AtomButton } from "@/components/atoms"
import { MField } from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { notify, notifyError } = useBackendMessage()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const passwordError = !token
      ? "Lien invalide : aucun token de réinitialisation trouvé."
      : validatePassword(password)
    const confirmError =
      password && confirm !== password
        ? "Les mots de passe ne correspondent pas."
        : undefined
    if (passwordError || confirmError || !token) {
      setErrors({ password: passwordError ?? undefined, confirm: confirmError })
      return
    }

    setErrors({})
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      notify({ message: "Mot de passe réinitialisé. Connectez-vous." })
      navigate("/login")
    } catch (err) {
      // token expiré ou déjà consommé : code INVALID_RESET_TOKEN
      notifyError(err, "Lien de réinitialisation invalide")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute">
        <AuthBackgroundShape />
      </div>

      <Card className="z-1 w-full gap-6 py-6 sm:max-w-lg">
        <CardHeader className="gap-6 px-6">
          <div>
            <CardTitle className="mb-2 text-2xl font-semibold">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="text-base">
              Minimum 8 caractères, avec majuscule, minuscule, chiffre et
              caractère spécial.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <MField
              label="Nouveau mot de passe"
              type="password"
              id="newPassword"
              value={password}
              error={errors.password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <MField
              label="Confirmer le mot de passe"
              type="password"
              id="confirmPassword"
              value={confirm}
              error={errors.confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <AtomButton type="submit" disabled={loading} className="w-full">
              {loading ? "Réinitialisation…" : "Réinitialiser"}
            </AtomButton>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-base">
            <Link to="/login" className="text-card-foreground hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
