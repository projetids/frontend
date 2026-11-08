import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  Hash,
  MapPin,
  Store,
  Warehouse,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import { formatDepotDate } from "@/lib/depots"
import type { ApiDepot } from "@/types/api"

// Fiche dépôt en lecture seule, affichée dans la modal « Voir détails ».

type DetailRowProps = {
  icon: LucideIcon
  label: string
  value?: string | null
  mono?: boolean
  multiline?: boolean
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  multiline,
}: DetailRowProps) {
  const displayed = value?.trim() ? value : "—"

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "text-sm font-medium",
            mono ? "font-mono text-xs break-all" : null,
            multiline ? "whitespace-pre-line" : "truncate"
          )}
        >
          {displayed}
        </dd>
      </div>
    </div>
  )
}

export type MDepotDetailsProps = {
  depot: ApiDepot
}

export function MDepotDetails({ depot }: MDepotDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Warehouse className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">{depot.depot_name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <Hash className="size-3" />
              {depot.depot_code}
            </AtomBadge>
            <AtomBadge variant={depot.is_active ? "secondary" : "outline"}>
              {depot.is_active ? "Actif" : "Inactif"}
            </AtomBadge>
            <AtomBadge variant="outline">Dépôt</AtomBadge>
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow icon={Hash} label="Code" value={depot.depot_code} mono />
        <DetailRow icon={Warehouse} label="Nom" value={depot.depot_name} />
        <DetailRow
          icon={MapPin}
          label="Adresse"
          value={depot.depot_address}
          multiline
        />
        <DetailRow
          icon={Activity}
          label="Statut"
          value={depot.is_active ? "Actif" : "Inactif"}
        />
        <DetailRow
          icon={Store}
          label="Point de vente"
          value={depot.point_of_sale_id}
          mono
        />
        <DetailRow
          icon={CalendarDays}
          label="Créé le"
          value={formatDepotDate(depot.created_at)}
        />
        <DetailRow
          icon={CalendarDays}
          label="Mis à jour le"
          value={formatDepotDate(depot.updated_at)}
        />
      </dl>

      <div className="grid gap-1 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">Description</p>
        <p className="text-sm whitespace-pre-line">
          {depot.depot_description?.trim() || "—"}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Le stock sera suivi par article et par dépôt. Un dépôt inactif reste
        consultable mais n&apos;est plus proposé dans les sélecteurs.
      </p>
    </div>
  )
}
