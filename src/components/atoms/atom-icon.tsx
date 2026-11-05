import type { ComponentProps } from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  LayersIcon,
  MenuIcon,
  RocketIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

export const iconRegistry = {
  "arrow-right": ArrowRightIcon,
  check: CheckIcon,
  database: DatabaseIcon,
  layers: LayersIcon,
  menu: MenuIcon,
  rocket: RocketIcon,
  search: SearchIcon,
  shield: ShieldIcon,
  sparkles: SparklesIcon,
  zap: ZapIcon,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof iconRegistry

export type AtomIconProps = ComponentProps<LucideIcon> & { name: IconName }

export function AtomIcon({ name, ...props }: AtomIconProps) {
  const Icon = iconRegistry[name]

  return <Icon aria-hidden {...props} />
}
