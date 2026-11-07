import { useId } from "react"
import { AtomLabel } from "@/components/atoms"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Champ « select » étiqueté : même structure que MField (label, description,
// erreur) pour rester homogène dans les formulaires.

export type MSelectOption = {
  value: string
  label: string
}

export type MSelectFieldProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: readonly MSelectOption[]
  id?: string
  placeholder?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

export function MSelectField({
  label,
  value,
  onValueChange,
  options,
  id,
  placeholder = "Sélectionner…",
  description,
  error,
  disabled,
  required,
}: MSelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const descriptionId = description || error ? `${selectId}-description` : undefined

  return (
    <div className="grid gap-1.5">
      <AtomLabel htmlFor={selectId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}*
          </span>
        ) : null}
      </AtomLabel>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={selectId}
          className="w-full"
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
