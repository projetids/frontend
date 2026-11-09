"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { EyeOffIcon, EyeIcon } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { emailRule, requiredRule } from "@/lib/validation"

type LoginFormValues = { email: string; password: string }

const LoginForm = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useFormValidation<LoginFormValues>({
    initialValues: { email: "", password: "" },
    rules: {
      email: [requiredRule("L'adresse e-mail est requise."), emailRule()],
      password: requiredRule("Le mot de passe est requis."),
    },
  })

  const handleSubmit = form.handleSubmit(
    async (values) => {
      setLoading(true)
      try {
        await login({
          user_mail: values.email.trim(),
          user_password: values.password,
        })
        toast.success("Connexion réussie")
        navigate("/", { replace: true })
      } catch (err) {
        if (err instanceof ApiError) {
          // Throttle : 5 tentatives de login / 15 min / email ; les comptes
          // créés restent `pending` jusqu'à validation (ACCOUNT_PENDING /
          // ACCOUNT_REJECTED).
          const description =
            err.code === "TOO_MANY_ATTEMPTS"
              ? "Trop de tentatives. Patientez 15 minutes avant de réessayer."
              : err.code === "ACCOUNT_PENDING"
                ? "Votre compte est en attente de validation par un administrateur."
                : err.code === "ACCOUNT_REJECTED"
                  ? "Votre compte a été rejeté ou désactivé. Contactez un administrateur."
                  : err.details || err.message
          toast.error("Échec de la connexion", { description })
        } else {
          toast.error("Échec de la connexion", {
            description: "Erreur inattendue",
          })
        }
      } finally {
        setLoading(false)
      }
    },
    () =>
      toast.error("Formulaire incomplet", {
        description: "Saisissez un e-mail valide et votre mot de passe.",
      })
  )

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="userMail" className="leading-5" required>
            Adresse e-mail
          </FieldLabel>
          <Input
            type="email"
            id="userMail"
            placeholder="Entrez votre adresse e-mail"
            value={form.values.email}
            onChange={form.handleChange("email")}
            autoComplete="email"
            required
          />
        </Field>
        <Field className="w-full gap-2">
          <FieldLabel htmlFor="userPassword" className="leading-5" required>
            Mot de passe
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="userPassword"
              type={isVisible ? "text" : "password"}
              placeholder="••••••••••••••••"
              value={form.values.password}
              onChange={form.handleChange("password")}
              autoComplete="current-password"
              required
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setIsVisible((prevState) => !prevState)}
                className="rounded-l-none text-muted-foreground hover:bg-transparent"
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className="sr-only">
                  {isVisible ? "Masquer" : "Afficher"}
                </span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <div className="flex items-center justify-between gap-y-2">
          <Link
            to="/forgot-password"
            className="text-base text-nowrap hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Field>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
