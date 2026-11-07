import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { cn } from "cn"
import { AtomButton } from "@/components/atoms"
import { useTheme } from "@/components/theme-provider"

// Bouton de bascule clair / sombre. Le thème est persisté par `ThemeProvider`
// (localStorage) et appliqué sur `<html>` via les classes `light` / `dark`.
// Utilisable partout : barre latérale, en-têtes et écrans d'authentification.

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_SCHEME_QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? "dark" : "light"
}

function getServerTheme(): "light" {
  return "light"
}

export type MThemeToggleProps = {
  className?: string
  /** Affiche le libellé à côté de l'icône (sinon bouton icône seule). */
  showLabel?: boolean
}

export function MThemeToggle({
  className,
  showLabel = false,
}: MThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  // Thème réellement appliqué : `system` suit la préférence de l'OS.
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getServerTheme
  )
  const resolvedTheme = theme === "system" ? systemTheme : theme
  const isDark = resolvedTheme === "dark"
  const label = isDark ? "Passer au thème clair" : "Passer au thème sombre"

  return (
    <AtomButton
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      className={cn(className)}
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {showLabel ? (
        <span>{isDark ? "Thème clair" : "Thème sombre"}</span>
      ) : null}
    </AtomButton>
  )
}
