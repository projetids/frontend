import { useId, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { AtomLabel } from "@/components/atoms"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { AtomInputProps } from "@/components/atoms"

// Champ mot de passe avec bascule « afficher / masquer », aligné sur le
// formulaire de connexion. L'état d'affichage reste local à chaque champ.

export type MPasswordFieldProps = Omit<AtomInputProps, "type"> & {
  label: string
  description?: string
  error?: string
}

export function MPasswordField({
  label,
  description,
  error,
  required,
  id,
  disabled,
  ...inputProps
}: MPasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId =
    description || error ? `${inputId}-description` : undefined
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-1.5">
      <AtomLabel htmlFor={inputId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </AtomLabel>
      <InputGroup>
        <InputGroupInput
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          {...inputProps}
        />
        <InputGroupAddon align="inline-end" className="pr-1.5">
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-transparent"
            disabled={disabled}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            onClick={() => setVisible((previous) => !previous)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">{visible ? "Masquer" : "Afficher"}</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {error ? (
        <p id={descriptionId} className="text-xs text-destructive">
          {error}
        </p>
      ) : description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
