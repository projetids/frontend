import { useState } from "react"
import { useNavigate } from "react-router-dom"
import * as authService from "@/services/auth.service"
import { useBackendMessage } from "@/hooks/use-backend-message"
import { EMAIL_REGEX } from "@/lib/validation"
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

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { notify, notifyError } = useBackendMessage()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!EMAIL_REGEX.test(email)) {
      setError("Adresse e-mail invalide.")
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      const { message } = await authService.forgotPassword(email)
      // Réponse identique que le compte existe ou non (anti-énumération) :
      // afficher un message neutre, sans jamais confirmer l'existence d'un compte.
      notify(
        { message: "Si un compte existe, un e-mail vient d'être envoyé." },
        message,
      )
      navigate("/login")
    } catch (err) {
      notifyError(err, "Impossible d'envoyer l'e-mail")
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
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-base">
              Saisissez votre adresse e-mail : un lien de réinitialisation vous
              sera envoyé (valable 15 minutes).
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <MField
              label="Adresse e-mail"
              type="email"
              id="userMail"
              placeholder="vous@exemple.mg"
              value={email}
              error={error}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AtomButton type="submit" disabled={loading} className="w-full">
              {loading ? "Envoi…" : "Envoyer le lien"}
            </AtomButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
