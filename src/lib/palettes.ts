// Palettes de couleurs disponibles pour le frontend (gérées côté client,
// comme le thème : pas de persistance en base). Une palette redéfinit les
// tokens d'accent (primary, ring, sidebar) ainsi que les fonds (background,
// card, muted, accent, sidebar) en mode clair et sombre, teintés avec la hue.

export type Palette = {
  id: string
  name: string
  hue: number
  primaryLight: string
  primaryDark: string
}

const hues: { name: string; hue: number }[] = [
  { name: "Défaut", hue: 0 },
  { name: "Rouge", hue: 0 },
  { name: "Corail", hue: 20 },
  { name: "Orange", hue: 40 },
  { name: "Ambre", hue: 55 },
  { name: "Jaune", hue: 75 },
  { name: "Citron", hue: 90 },
  { name: "Lime", hue: 105 },
  { name: "Vert", hue: 130 },
  { name: "Émeraude", hue: 150 },
  { name: "Teal", hue: 170 },
  { name: "Turquoise", hue: 185 },
  { name: "Cyan", hue: 200 },
  { name: "Ciel", hue: 215 },
  { name: "Bleu", hue: 240 },
  { name: "Indigo", hue: 260 },
  { name: "Violet", hue: 280 },
  { name: "Pourpre", hue: 295 },
  { name: "Rose", hue: 330 },
  { name: "Fuchsia", hue: 345 },
  { name: "Magenta", hue: 310 },
]

export const PALETTES: Palette[] = hues.map((h, i) => {
  if (h.name === "Défaut") {
    return {
      id: "default",
      name: "Défaut",
      hue: 0,
      primaryLight: "oklch(0.205 0 0)",
      primaryDark: "oklch(0.922 0 0)",
    }
  }
  const id = h.name.toLowerCase().replace(/\s+/g, "-")
  return {
    id: `${id}-${i}`,
    name: h.name,
    hue: h.hue,
    primaryLight: `oklch(0.5 0.2 ${h.hue})`,
    primaryDark: `oklch(0.72 0.18 ${h.hue})`,
  }
})

const seen = new Set<string>()
export const PALETTE_LIST: Palette[] = PALETTES.filter((p) => {
  if (seen.has(p.id)) return false
  seen.add(p.id)
  return true
})