import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Fingerprint,
  Power,
  ShieldCheck,
  Store,
  UserRoundPlus,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import { roleLabel, statusBadgeVariant, statusLabel } from "@/lib/roles"
import type { ApiUser } from "@/types/api"

// Détails du compte connecté, en lecture seule : toutes les métadonnées
// renvoyées par `GET /auth/profile` (identifiant, statut, point de vente,
// traçabilité). Affiché dans la carte « Détails du compte » de la page profil.

function formatDateTime(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type DetailRowProps = {
  icon: LucideIcon
  label: string
  /** Valeur brute ; ignorée si `children` est fourni. */
  value?: string | null
  /** Affiche la valeur en police monospace (identifiants UUID). */
  mono?: boolean
  children?: ReactNode
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  children,
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
            mono ? "font-mono text-xs break-all" : "truncate"
          )}
        >
          {children ?? displayed}
        </dd>
      </div>
    </div>
  )
}

export type MProfileDetailsProps = {
  user: ApiUser
}

export function MProfileDetails({ user }: MProfileDetailsProps) {
  const hasActiveFlag = typeof user.user_is_active === "boolean"

  return (
    <dl className="grid gap-4">
      <DetailRow
        icon={Fingerprint}
        label="Identifiant"
        value={user.user_id}
        mono
      />
      <DetailRow icon={ShieldCheck} label="Rôle" value={roleLabel(user.role)} />
      <DetailRow icon={BadgeCheck} label="Statut du compte">
        {user.user_status ? (
          <AtomBadge variant={statusBadgeVariant(user.user_status)}>
            {statusLabel(user.user_status)}
          </AtomBadge>
        ) : (
          "—"
        )}
      </DetailRow>
      <DetailRow icon={Power} label="Compte actif">
        {hasActiveFlag ? (
          <AtomBadge variant={user.user_is_active ? "secondary" : "outline"}>
            {user.user_is_active ? "Oui" : "Non"}
          </AtomBadge>
        ) : (
          "—"
        )}
      </DetailRow>
      <DetailRow
        icon={Store}
        label="Point de vente"
        value={
          user.point_of_sale
            ? `${user.point_of_sale.name} (${user.point_of_sale.point_of_sale_code})`
            : user.point_of_sale_id
        }
      />
      <DetailRow
        icon={CalendarClock}
        label="Mot de passe modifié le"
        value={formatDateTime(user.password_changed_at ?? undefined)}
      />
      <DetailRow icon={BadgeCheck} label="Changement de mot de passe requis">
        {typeof user.must_change_password === "boolean" ? (
          <AtomBadge variant={user.must_change_password ? "destructive" : "secondary"}>
            {user.must_change_password ? "Oui" : "Non"}
          </AtomBadge>
        ) : (
          "—"
        )}
      </DetailRow>
      <DetailRow
        icon={UserRoundPlus}
        label="Créé par"
        value={user.created_by}
        mono
      />
      <DetailRow
        icon={CalendarDays}
        label="Créé le"
        value={formatDateTime(user.created_at)}
      />
      <DetailRow
        icon={CalendarClock}
        label="Mis à jour le"
        value={formatDateTime(user.updated_at)}
      />
    </dl>
  )
}
