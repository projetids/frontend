import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { PALETTE_LIST, type Palette } from "@/lib/palettes"

type PaletteContextValue = {
  paletteId: string
  palettes: Palette[]
  setPalette: (id: string) => void
}

const PaletteContext = createContext<PaletteContextValue | undefined>(undefined)

function getKey(userId?: string | null, posId?: string | null) {
  return `ids:palette:${posId || userId || "global"}`
}

function findPalette(id: string): Palette {
  return PALETTE_LIST.find((p) => p.id === id) ?? PALETTE_LIST[0]
}

function applyPalette(palette: Palette) {
  const hue = palette.hue
  const c = hue === 0 ? 0 : 0.012
  const cStrong = hue === 0 ? 0 : 0.02
  const cAccent = hue === 0 ? 0 : 0.025
  let style = document.getElementById("ids-palette-override") as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = "ids-palette-override"
    document.head.appendChild(style)
  }
  style.textContent = `
    :root {
      --primary: ${palette.primaryLight};
      --primary-foreground: oklch(0.985 0 0);
      --ring: ${palette.primaryLight};
      --sidebar-primary: ${palette.primaryLight};
      --sidebar-primary-foreground: oklch(0.985 0 0);
      --sidebar-ring: ${palette.primaryLight};
      --background: oklch(0.995 ${c} ${hue});
      --foreground: oklch(0.145 ${c} ${hue});
      --card: oklch(1 ${c} ${hue});
      --card-foreground: oklch(0.145 ${c} ${hue});
      --popover: oklch(1 ${c} ${hue});
      --popover-foreground: oklch(0.145 ${c} ${hue});
      --secondary: oklch(0.96 ${cStrong} ${hue});
      --secondary-foreground: oklch(0.205 ${c} ${hue});
      --muted: oklch(0.965 ${cStrong} ${hue});
      --muted-foreground: oklch(0.5 ${cStrong} ${hue});
      --accent: oklch(0.95 ${cAccent} ${hue});
      --accent-foreground: oklch(0.205 ${c} ${hue});
      --border: oklch(0.91 ${cStrong} ${hue});
      --input: oklch(0.91 ${cStrong} ${hue});
      --sidebar: oklch(0.98 ${c} ${hue});
      --sidebar-foreground: oklch(0.145 ${c} ${hue});
      --sidebar-accent: oklch(0.93 ${cAccent} ${hue});
      --sidebar-accent-foreground: oklch(0.205 ${c} ${hue});
      --sidebar-border: oklch(0.91 ${cStrong} ${hue});
    }
    .dark {
      --primary: ${palette.primaryDark};
      --primary-foreground: oklch(0.205 0 0);
      --ring: ${palette.primaryDark};
      --sidebar-primary: ${palette.primaryDark};
      --sidebar-primary-foreground: oklch(0.985 0 0);
      --sidebar-ring: ${palette.primaryDark};
      --background: oklch(0.13 ${c} ${hue});
      --foreground: oklch(0.985 ${c} ${hue});
      --card: oklch(0.18 ${cStrong} ${hue});
      --card-foreground: oklch(0.985 ${c} ${hue});
      --popover: oklch(0.18 ${cStrong} ${hue});
      --popover-foreground: oklch(0.985 ${c} ${hue});
      --secondary: oklch(0.22 ${cStrong} ${hue});
      --secondary-foreground: oklch(0.985 ${c} ${hue});
      --muted: oklch(0.22 ${cStrong} ${hue});
      --muted-foreground: oklch(0.7 ${cStrong} ${hue});
      --accent: oklch(0.25 ${cAccent} ${hue});
      --accent-foreground: oklch(0.985 ${c} ${hue});
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --sidebar: oklch(0.16 ${cStrong} ${hue});
      --sidebar-foreground: oklch(0.985 ${c} ${hue});
      --sidebar-accent: oklch(0.25 ${cAccent} ${hue});
      --sidebar-accent-foreground: oklch(0.985 ${c} ${hue});
      --sidebar-border: oklch(1 0 0 / 10%);
    }
  `
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [paletteId, setPaletteId] = useState<string>(() => {
    const key = getKey(user?.user_id, user?.point_of_sale_id)
    return localStorage.getItem(key) || "default"
  })

  useEffect(() => {
    applyPalette(findPalette(paletteId))
  }, [paletteId])

  useEffect(() => {
    if (!user) return
    const key = getKey(user.user_id, user.point_of_sale_id)
    const stored = localStorage.getItem(key) || "default"
    setPaletteId(stored)
  }, [user])

  // Synchronise la palette entre onglets partageant le meme POS
  // (l'admin change la palette, les caissiers lies la suivent).
  useEffect(() => {
    if (!user) return
    const key = getKey(user.user_id, user.point_of_sale_id)
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue) {
        setPaletteId(e.newValue)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [user])

  const setPalette = (id: string) => {
    setPaletteId(id)
    const key = getKey(user?.user_id, user?.point_of_sale_id)
    localStorage.setItem(key, id)
  }

  return (
    <PaletteContext.Provider value={{ paletteId, palettes: PALETTE_LIST, setPalette }}>
      {children}
    </PaletteContext.Provider>
  )
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider")
  return ctx
}