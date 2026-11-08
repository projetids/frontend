import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Hash,
  Phone,
  Shield,
  Store,
  User,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import { clientInitials, formatClientDate } from "@/lib/clients"
import type { ApiClient } from "@/types/api"

// Fiche client en lecture seule, affichée dans la modal « Voir détails ».

type DetailRowProps = {
  icon: LucideIcon
  label: string
  value?: string | null
  href?: string
  mono?: boolean
}

function DetailRow({ icon: Icon, label, value, href, mono }: DetailRowProps) {
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
            "truncate text-sm font-medium",
            mono ? "font-mono text-xs break-all" : null
          )}
        >
          {href && value?.trim() ? (
            <a
              className="underline-offset-4 hover:text-primary hover:underline"
              href={href}
            >
              {displayed}
            </a>
          ) : (
            displayed
          )}
        </dd>
      </div>
    </div>
  )
}

export type MClientDetailsProps = {
  client: ApiClient
}

export function MClientDetails({ client }: MClientDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {clientInitials(client.client_name)}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">
            {client.client_name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {client.client_matricule?.trim() ? (
              <AtomBadge variant="outline">
                <Hash className="size-3" />
                {client.client_matricule}
              </AtomBadge>
            ) : null}
            {client.client_grade?.trim() ? (
              <AtomBadge variant="secondary">{client.client_grade}</AtomBadge>
            ) : null}
            <AtomBadge variant="outline">Client</AtomBadge>
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow
          icon={Phone}
          label="Téléphone"
          value={client.client_telephone}
          href={`tel:${client.client_telephone ?? ""}`}
        />
        <DetailRow
          icon={Hash}
          label="Matricule"
          value={client.client_matricule}
        />
        <DetailRow icon={Shield} label="Corps" value={client.client_corps} />
        <DetailRow
          icon={BadgeCheck}
          label="Grade"
          value={client.client_grade}
        />
        <DetailRow
          icon={User}
          label="Identifiant client"
          value={client.client_id}
          mono
        />
        <DetailRow
          icon={Store}
          label="Point de vente"
          value={client.point_of_sale_id}
          mono
        />
      </dl>

      <div className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          Créé le {formatClientDate(client.created_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          Modifié le {formatClientDate(client.updated_at)}
        </span>
      </div>
    </div>
  )
}
