import type { ComponentProps } from "react"
import { Label } from "@/components/ui/label"

export type AtomLabelProps = ComponentProps<typeof Label>

export function AtomLabel(props: AtomLabelProps) {
  return <Label {...props} />
}
