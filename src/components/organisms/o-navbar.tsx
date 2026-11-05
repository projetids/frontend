import { AtomButton, AtomIcon } from "@/components/atoms"

export type ONavbarLink = { label: string; href: string }

export type ONavbarProps = {
  brand: string
  links?: ONavbarLink[]
  action?: { label: string; onClick?: () => void }
}

export function ONavbar({ brand, links = [], action }: ONavbarProps) {
  return (
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
      <a href="/" className="flex items-center gap-2 font-medium">
        <AtomIcon name="layers" className="size-5 text-primary" />
        {brand}
      </a>

      <nav className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {action ? (
        <div className="ml-auto">
          <AtomButton size="sm" variant="outline" onClick={action.onClick}>
            {action.label}
          </AtomButton>
        </div>
      ) : null}
    </div>
  )
}
