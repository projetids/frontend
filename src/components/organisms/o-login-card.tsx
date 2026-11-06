import { useState } from "react"
import { toast } from "sonner"
import { AtomButton, AtomInput, AtomLabel } from "@/components/atoms"
import { Card, CardContent } from "@/components/ui/card"
import { login } from "@/services/user.service"

export function OLoginCard() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.includes("@") || password.length < 6) {
      toast.error("Formulaire incomplet", {
        description: "Saisissez un e-mail et un mot de passe valides.",
      })
      return
    }
    setLoading(true)
    try {
      const result = await login({ email, password })
      toast.success("Connexion réussie", { description: result.user.email })
    } catch (err) {
      toast.error("Échec de la connexion", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-balance text-muted-foreground">
              Login to your Acme Inc account
            </p>
          </div>
          <div className="grid gap-2">
            <AtomLabel htmlFor="email">Email</AtomLabel>
            <AtomInput
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <AtomLabel htmlFor="password">Password</AtomLabel>
              <a
                href="#"
                className="ml-auto text-sm underline-offset-2 hover:underline"
              >
                Forgot your password?
              </a>
            </div>
            <AtomInput
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <AtomButton type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Login"}
          </AtomButton>
        </form>
        <div className="relative hidden bg-muted md:block">
          <img
            src="/placeholder.svg"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </CardContent>
    </Card>
  )
}