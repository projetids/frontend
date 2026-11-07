import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CalendarDays,
  Hash,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react"
import { AtomBadge } from "@/components/atoms"
import { cn } from "cn"
import { civilityLabel, formatSupplierDate } from "@/lib/suppliers"
import type { ApiSupplier } from "@/types/api"

// Fiche fournisseur en lecture seule, affichée dans la modal « Voir détails ».

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type DetailRowProps = {
  icon: LucideIcon
  label: string
  value?: string | null
  href?: string
  multiline?: boolean
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
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
            multiline ? "whitespace-pre-line" : "truncate"
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

export type MSupplierDetailsProps = {
  supplier: ApiSupplier
}

export function MSupplierDetails({ supplier }: MSupplierDetailsProps) {
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {initials(supplier.suppliers_name)}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base font-semibold">
            {supplier.suppliers_name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">
              <Hash className="size-3" />
              {supplier.supplier_number}
            </AtomBadge>
            <AtomBadge variant="secondary">
              {civilityLabel(supplier.suppliers_civility)}
            </AtomBadge>
          </div>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailRow
          icon={User}
          label="Personne de contact"
          value={supplier.suppliers_contact_name}
        />
        <DetailRow
          icon={Phone}
          label="Téléphone"
          value={supplier.suppliers_telephone}
          href={`tel:${supplier.suppliers_telephone ?? ""}`}
        />
        <DetailRow
          icon={Mail}
          label="Adresse e-mail"
          value={supplier.suppliers_email}
          href={`mailto:${supplier.suppliers_email ?? ""}`}
        />
        <DetailRow
          icon={Building2}
          label="Point de vente"
          value={supplier.point_of_sale_id}
        />
        <div className="sm:col-span-2">
          <DetailRow
            icon={MapPin}
            label="Adresse"
            value={supplier.suppliers_address}
            multiline
          />
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          Créé le {formatSupplierDate(supplier.created_at)}
        </span>
        <span>Modifié le {formatSupplierDate(supplier.updated_at)}</span>
      </div>
    </div>
  )
}
