import type { LucideIcon } from "lucide-react"
import { FolderTree, Hash, Tag } from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import type { ApiArticleFamily } from "@/types/api"

// Fiche famille d'articles en lecture seule, affichée dans la modal
// « Voir détails ».

type DetailRowProps = {
  icon: LucideIcon
  label: string
  value?: string | null
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  const displayed = value?.trim() ? value : "—"

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium">{displayed}</dd>
      </div>
    </div>
  )
}

export type MArticleFamilyDetailsProps = {
  family: ApiArticleFamily
}

export function MArticleFamilyDetails({ family }: MArticleFamilyDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FolderTree className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">{family.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <Hash className="size-3" />
              {family.id}
            </AtomBadge>
            <AtomBadge variant="secondary">Famille d'articles</AtomBadge>
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow icon={Hash} label="Identifiant" value={String(family.id)} />
        <DetailRow icon={Tag} label="Nom" value={family.name} />
      </dl>

      <p className="border-t pt-4 text-xs text-muted-foreground">
        Cette famille est une référence du catalogue : elle peut être associée à
        plusieurs articles.
      </p>
    </div>
  )
}
