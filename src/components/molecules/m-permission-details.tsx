import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  KeyRound,
  ShieldCheck,
  Tag,
  ToggleLeft,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { formatPermissionDate } from "@/lib/permissions"
import type { ApiPermission } from "@/types/api"

// Fiche permission en lecture seule, affichée dans la modal « Voir détails ».

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

export type MPermissionDetailsProps = {
  permission: ApiPermission
}

export function MPermissionDetails({ permission }: MPermissionDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">
            {permission.label_fr}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <KeyRound className="size-3" />
              {permission.code}
            </AtomBadge>
            <AtomBadge
              variant={permission.is_active ? "secondary" : "destructive"}
            >
              {permission.is_active ? "Active" : "Inactive"}
            </AtomBadge>
            {permission.reserved ? (
              <AtomBadge variant="outline">Réservée</AtomBadge>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow icon={KeyRound} label="Code" value={permission.code} />
        <DetailRow icon={Tag} label="Libellé" value={permission.label_fr} />
        <DetailRow
          icon={ShieldCheck}
          label="Réservée"
          value={permission.reserved ? "Oui" : "Non"}
        />
        <DetailRow
          icon={ToggleLeft}
          label="Activée par défaut"
          value={permission.default_enabled ? "Oui" : "Non"}
        />
        <DetailRow
          icon={Activity}
          label="État"
          value={permission.is_active ? "Active" : "Inactive"}
        />
        <DetailRow
          icon={CalendarDays}
          label="Créée le"
          value={formatPermissionDate(permission.created_at)}
        />
        <DetailRow
          icon={CalendarDays}
          label="Modifiée le"
          value={formatPermissionDate(permission.updated_at)}
        />
      </dl>

      <p className="border-t pt-4 text-xs text-muted-foreground">
        Les flags de cette permission sont gérés utilisateur par utilisateur.
        Supprimer une permission du catalogue supprime également ses flags.
      </p>
    </div>
  )
}
