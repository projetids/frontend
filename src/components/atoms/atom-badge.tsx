import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type AtomBadgeProps = ComponentProps<typeof Badge> & {
  icon?: LucideIcon
}

export function AtomBadge({ icon: Icon, children, ...props }: AtomBadgeProps) {
  return (
    <Badge {...props}>
      {Icon ? <Icon data-icon="inline-start" /> : null}
      {children}
    </Badge>
  )
}
