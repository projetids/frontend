import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type AtomButtonProps = ComponentProps<typeof Button> & {
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
}

export function AtomButton({
  iconLeft: IconLeft,
  iconRight: IconRight,
  children,
  ...props
}: AtomButtonProps) {
  return (
    <Button {...props}>
      {IconLeft ? <IconLeft data-icon="inline-start" /> : null}
      {children}
      {IconRight ? <IconRight data-icon="inline-end" /> : null}
    </Button>
  )
}
