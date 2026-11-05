import type { ComponentProps } from "react"
import { Input } from "@/components/ui/input"

export type AtomInputProps = ComponentProps<typeof Input>

export function AtomInput(props: AtomInputProps) {
  return <Input {...props} />
}
