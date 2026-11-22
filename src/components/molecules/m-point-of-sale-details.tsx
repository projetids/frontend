import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Hash,
  MapPin,
  Store,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import { formatPointOfSaleDate } from "@/lib/point-of-sales"
import type { ApiPointOfSale } from "@/types/api"

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
  const displayed = value?.trim() ? value : "-"

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

export type MPointOfSaleDetailsProps = {
  pointOfSale: ApiPointOfSale
}

export function MPointOfSaleDetails({ pointOfSale }: MPointOfSaleDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Store className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">{pointOfSale.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <Hash className="size-3" />
              {pointOfSale.point_of_sale_code}
            </AtomBadge>
            <AtomBadge variant="outline">Point de vente</AtomBadge>
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow
          icon={Hash}
          label="Code"
          value={pointOfSale.point_of_sale_code}
          mono
        />
        <DetailRow icon={Store} label="Nom" value={pointOfSale.name} />
        <DetailRow
          icon={MapPin}
          label="Adresse"
          value={pointOfSale.address}
          multiline
        />
        <DetailRow
          icon={CalendarDays}
          label="Créé le"
          value={formatPointOfSaleDate(pointOfSale.created_at)}
        />
      </dl>

      <div className="grid gap-1 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">Description</p>
        <p className="text-sm whitespace-pre-line">
          {pointOfSale.description?.trim() || "-"}
        </p>
      </div>
    </div>
  )
}