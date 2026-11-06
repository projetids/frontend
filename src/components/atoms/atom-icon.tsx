import type { ComponentProps } from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  LayersIcon,
  MenuIcon,
  PackageIcon,
  ReceiptTextIcon,
  RocketIcon,
  SearchIcon,
  ShieldIcon,
  ShoppingCartIcon,
  SparklesIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

export const iconRegistry = {
  "arrow-right": ArrowRightIcon,
  cart: ShoppingCartIcon,
  check: CheckIcon,
  database: DatabaseIcon,
  layers: LayersIcon,
  menu: MenuIcon,
  package: PackageIcon,
  receipt: ReceiptTextIcon,
  rocket: RocketIcon,
  search: SearchIcon,
  shield: ShieldIcon,
  sparkles: SparklesIcon,
  users: UsersIcon,
  zap: ZapIcon,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof iconRegistry

export type AtomIconProps = ComponentProps<LucideIcon> & { name: IconName }

export function AtomIcon({ name, ...props }: AtomIconProps) {
  const Icon = iconRegistry[name]

  return <Icon aria-hidden {...props} />
}
