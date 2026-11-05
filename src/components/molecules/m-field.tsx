import { useId } from "react"
import { AtomInput, AtomLabel } from "@/components/atoms"
import type { AtomInputProps } from "@/components/atoms"

export type MFieldProps = AtomInputProps & {
  label: string
  description?: string
  error?: string
}

export function MField({
  label,
  description,
  error,
  id,
  ...inputProps
}: MFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description || error ? `${inputId}-description` : undefined

  return (
    <div className="grid gap-1.5">
      <AtomLabel htmlFor={inputId}>{label}</AtomLabel>
      <AtomInput
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        {...inputProps}
      />
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
