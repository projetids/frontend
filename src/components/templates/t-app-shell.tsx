import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"

export type TAppShellProps = {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export function TAppShell({ children, header, footer }: TAppShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {header ? (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur">
          {header}
          <Separator />
        </header>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>

      {footer ? (
        <footer className="px-6 py-4 text-sm text-muted-foreground">
          <div className="mx-auto w-full max-w-6xl">{footer}</div>
        </footer>
      ) : null}
    </div>
  )
}
