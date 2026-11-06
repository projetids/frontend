import type { ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { LogOutIcon, type LucideIcon } from "lucide-react"
import { AtomIcon } from "@/components/atoms"
import { Button } from "@/components/ui/button"
import type { ApiRole } from "@/types/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Coquille applicative pour les pages authentifiées : barre latérale de
// navigation, en-tête avec déclencheur responsive, contenu et pied de page.
// Inspirée du bloc shadcn « dashboard-sidebar-01 », adaptée au design IDS.

export type TAppSidebarItem = {
  label: string
  icon: LucideIcon
  /** Route interne (`/…`) ou ancre (`#…`). */
  href: string
  /** Rôles autorisés à voir l'entrée (tous les rôles si absent). */
  roles?: ApiRole[]
}

export type TAppSidebarGroup = {
  label?: string
  items: TAppSidebarItem[]
}

export type TAppSidebarProps = {
  brand: string
  groups: TAppSidebarGroup[]
  children: ReactNode
  footer?: ReactNode
  user?: { name: string; role: string; href?: string }
  onLogout?: () => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function TAppSidebar({
  brand,
  groups,
  children,
  footer,
  user,
  onLogout,
}: TAppSidebarProps) {
  const { pathname } = useLocation()

  const userSummary = user ? (
    <>
      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-muted-foreground truncate text-xs">{user.role}</p>
      </div>
    </>
  ) : null

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard"
    return href === pathname
  }

  return (
    <div className="flex min-h-dvh w-full">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/dashboard">
                    <AtomIcon name="layers" className="text-primary size-5" />
                    <span className="font-medium">{brand}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {groups.map((group, index) => (
              <SidebarGroup key={group.label ?? `group-${index}`}>
                {group.label ? (
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const content = (
                        <>
                          <Icon />
                          <span>{item.label}</span>
                        </>
                      )

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton asChild isActive={isActive(item.href)}>
                            {item.href.startsWith("/") ? (
                              <Link to={item.href}>{content}</Link>
                            ) : (
                              <a href={item.href}>{content}</a>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {user || onLogout ? (
            <SidebarFooter>
              {user?.href ? (
                <Link
                  to={user.href}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                >
                  {userSummary}
                </Link>
              ) : user ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {userSummary}
                </div>
              ) : null}
              {onLogout ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onLogout}
                >
                  <LogOutIcon className="size-4" />
                  Déconnexion
                </Button>
              ) : null}
            </SidebarFooter>
          ) : null}
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="bg-card sticky top-0 z-50 flex h-13.75 items-center justify-between gap-6 border-b px-4 py-2 sm:px-6">
            <SidebarTrigger className="[&_svg]:size-5!" />
          </header>
          <main className="size-full flex-1 px-4 py-6 sm:px-6">{children}</main>
          {footer ? (
            <footer className="bg-card text-muted-foreground h-10 border-t px-4 text-sm sm:px-6">
              <div className="flex h-full items-center">{footer}</div>
            </footer>
          ) : null}
        </div>
      </SidebarProvider>
    </div>
  )
}
