"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { EyeOffIcon, EyeIcon } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { MConfirmDialog } from "@/components/molecules"
import { useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import {
  emailRule,
  passwordRule,
  phoneRule,
  requiredRule,
  sameAsRule,
} from "@/lib/validation"

type RegisterFormValues = {
  user_name: string
  user_mail: string
  user_phone: string
  user_password: string
  confirm: string
}

const RegisterForm = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // DTO API : user_name, user_mail, user_password, user_phone
  const form = useFormValidation<RegisterFormValues>({
    initialValues: {
      user_name: "",
      user_mail: "",
      user_phone: "",
      user_password: "",
      confirm: "",
    },
    rules: {
      user_name: requiredRule("Le nom est requis."),
      user_mail: [requiredRule("L'adresse e-mail est requise."), emailRule()],
      user_phone: [
        requiredRule("Le numéro de téléphone est requis."),
        phoneRule(),
      ],
      user_password: passwordRule(),
      confirm: sameAsRule<RegisterFormValues>(
        "user_password",
        "Les mots de passe ne correspondent pas."
      ),
    },
  })

  const handleSubmit = form.handleSubmit(
    () => {
      // Formulaire valide : on demande une confirmation explicite avant
      // de créer définitivement le compte.
      setConfirmOpen(true)
    },
    () =>
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
  )

  async function handleConfirm() {
    setLoading(true)
    const values = form.values
    try {
      await register({
        user_name: values.user_name.trim(),
        user_mail: values.user_mail.trim().toLowerCase(),
        user_password: values.user_password,
        user_phone: values.user_phone.trim(),
      })
      toast.success("Compte créé", {
        description:
          "Votre compte est en attente de validation par un administrateur. Vous pourrez vous connecter une fois validé.",
      })
      navigate("/login", { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        // CONFLICT : email ou nom d'utilisateur déjà utilisé
        toast.error("Inscription refusée", {
          description:
            err.code === "CONFLICT"
              ? "Un compte existe déjà avec cet e-mail ou ce nom."
              : err.details || err.message,
        })
      } else {
        toast.error("Inscription refusée", { description: "Erreur inattendue" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <MConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Créer ce compte ?"
        description={`Le compte ${form.values.user_mail.trim().toLowerCase()} sera créé avec le rôle caissier. Vérifiez les informations avant de continuer.`}
        confirmLabel="Créer le compte"
        onConfirm={() => void handleConfirm()}
      />
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="userName" className="leading-5" required>
            Nom complet
          </FieldLabel>
          <Input
            id="userName"
            placeholder="Jean Dupont"
            value={form.values.user_name}
            onChange={form.handleChange("user_name")}
            aria-invalid={Boolean(form.errors.user_name)}
            required
          />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="registerMail" className="leading-5" required>
            Adresse e-mail
          </FieldLabel>
          <Input
            type="email"
            id="registerMail"
            placeholder="jean.dupont@exemple.mg"
            value={form.values.user_mail}
            onChange={form.handleChange("user_mail")}
            aria-invalid={Boolean(form.errors.user_mail)}
            required
          />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="userPhone" className="leading-5" required>
            Téléphone
          </FieldLabel>
          <Input
            id="userPhone"
            placeholder="+2250700000000"
            value={form.values.user_phone}
            onChange={form.handleChange("user_phone")}
            aria-invalid={Boolean(form.errors.user_phone)}
            required
          />
        </Field>
        <Field className="w-full gap-2">
          <FieldLabel htmlFor="registerPassword" className="leading-5" required>
            Mot de passe
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="registerPassword"
              type={isVisible ? "text" : "password"}
              placeholder="••••••••••••••••"
              value={form.values.user_password}
              onChange={form.handleChange("user_password")}
              aria-invalid={Boolean(form.errors.user_password)}
              autoComplete="new-password"
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
        <Field className="w-full gap-2">
          <FieldLabel htmlFor="registerConfirm" className="leading-5" required>
            Confirmer le mot de passe
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="registerConfirm"
              type={isConfirmVisible ? "text" : "password"}
              value={form.values.confirm}
              onChange={form.handleChange("confirm")}
              aria-invalid={Boolean(form.errors.confirm)}
              autoComplete="new-password"
              required
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setIsConfirmVisible((previous) => !previous)}
                className="rounded-l-none text-muted-foreground hover:bg-transparent"
                aria-label={
                  isConfirmVisible
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {isConfirmVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className="sr-only">
                  {isConfirmVisible ? "Masquer" : "Afficher"}
                </span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field className="gap-2">
          {Object.entries(form.errors).map(([key, message]) =>
            message ? (
              <p key={key} className="text-sm text-destructive">
                {message}
              </p>
            ) : null
          )}
        </Field>
        <Field>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer un compte"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default RegisterForm
