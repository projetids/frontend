import type { ComponentProps } from "react"
import { Textarea } from "@/components/ui/textarea"

export type AtomTextareaProps = ComponentProps<typeof Textarea>

export function AtomTextarea(props: AtomTextareaProps) {
  return <Textarea {...props} />
}
