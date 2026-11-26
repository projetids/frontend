import { PaletteIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { usePalette } from "@/components/palette-provider"
import { roleLabel } from "@/lib/roles"

// Page dédiée à la gestion des palettes de couleurs du frontend.
// Les palettes sont gérées côté client (localStorage), comme le thème : aucune
// persistance en base. L'admin/superadmin choisit la palette appliquée à son
// point de vente ; les utilisateurs liés en héritent sur le même navigateur.

export function PalettesPage() {
  const { user } = useAuth()
  const { paletteId, palettes, setPalette } = usePalette()

  function handleSelect(id: string) {
    const palette = palettes.find((p) => p.id === id)
    setPalette(id)
    toast.success("Palette appliquée", {
      description: palette ? palette.name : undefined,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Administration</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Palettes de couleurs
        </h1>
        <p className="text-muted-foreground">
          Personnalisez l&apos;identité visuelle de l&apos;application. La palette
          choisie est appliquée à votre point de vente et héritée par les
          utilisateurs qui y sont rattachés, sur ce navigateur.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-5 text-primary" />
            Palettes disponibles
          </CardTitle>
          <CardDescription>
            Cliquez sur une palette pour l&apos;appliquer immédiatement. La
            sélection est mémorisée localement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {palettes.map((palette) => {
              const active = palette.id === paletteId
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handleSelect(palette.id)}
                  className={`group flex flex-col items-stretch gap-2 rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary ring-2 ring-primary shadow-sm"
                      : "border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-8 shrink-0 rounded-full border shadow-inner"
                      style={{ backgroundColor: palette.primaryLight }}
                    />
                    <span
                      className="size-8 shrink-0 rounded-full border shadow-inner"
                      style={{ backgroundColor: palette.primaryDark }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {palette.name}
                    </span>
                    {active ? (
                      <AtomBadge variant="secondary" className="shrink-0">
                        Active
                      </AtomBadge>
                    ) : null}
                  </div>
                  <div className="flex h-6 items-center gap-1 overflow-hidden rounded-md border bg-muted/30 px-1.5">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: palette.primaryLight }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Aperçu
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
          <CardDescription>
            Rendu des principaux éléments avec la palette active.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <AtomButton>Primaire</AtomButton>
            <AtomButton variant="outline">Secondaire</AtomButton>
            <AtomButton variant="ghost">Fantôme</AtomButton>
            <AtomBadge>Badge</AtomBadge>
            <AtomBadge variant="secondary">Secondaire</AtomBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">Carte exemple</p>
              <p className="text-xs text-muted-foreground">
                Texte secondaire pour vérifier le contraste.
              </p>
              <div className="mt-3 h-2 w-2/3 rounded-full bg-primary" />
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Zone atténuée</p>
              <p className="text-xs text-muted-foreground">
                Fond muted avec accent primaire.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}