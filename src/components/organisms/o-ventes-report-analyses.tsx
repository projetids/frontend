import { AtomButton } from "@/components/atoms"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatVenteMoney,
  modePaiementLabel,
} from "@/lib/ventes"
import type {
  ApiVentesReportParCaissier,
  ApiVentesReportPeriodes,
} from "@/types/api"

// Nouveaux rapports d'analyse (2026-11-28) : série temporelle et CA par
// caissier. Les montants sont des décimales renvoyées en chaînes par l'API.

type ReportProps = {
  loading: boolean
  error: string | null
  onRetry: () => void
}

function ReportError({ error, onRetry }: Pick<ReportProps, "error" | "onRetry">) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
      <p className="text-sm text-destructive">{error}</p>
      <AtomButton size="sm" variant="outline" onClick={onRetry}>
        Réessayer
      </AtomButton>
    </div>
  )
}

function reportSkeleton(columns: number) {
  return Array.from({ length: 5 }).map((_, index) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell colSpan={columns}>
        <Skeleton className="h-8 w-full" />
      </TableCell>
    </TableRow>
  ))
}

function parModeLabel(
  parMode?: Record<string, { nb_ventes: number; total_ttc: string }>
): string {
  if (!parMode || Object.keys(parMode).length === 0) return "—"
  return Object.entries(parMode)
    .map(
      ([mode, value]) =>
        `${modePaiementLabel(mode)} : ${formatVenteMoney(value.total_ttc)}`
    )
    .join(" · ")
}

export type OVentesReportPeriodesProps = ReportProps & {
  report: ApiVentesReportPeriodes | null
}

export function OVentesReportPeriodes({
  report,
  loading,
  error,
  onRetry,
}: OVentesReportPeriodesProps) {
  if (error) return <ReportError error={error} onRetry={onRetry} />

  const columns = 7
  return (
    <div className="grid gap-4">
      {report ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Documents", String(report.totaux.nb_ventes)],
            ["Total HT", formatVenteMoney(report.totaux.total_ht)],
            ["TVA", formatVenteMoney(report.totaux.total_tva)],
            ["Total TTC", formatVenteMoney(report.totaux.total_ttc)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead className="w-28">Documents</TableHead>
              <TableHead className="w-36 text-right">Total HT</TableHead>
              <TableHead className="w-32 text-right">TVA</TableHead>
              <TableHead className="w-36 text-right">Total TTC</TableHead>
              <TableHead className="w-36 text-right">Panier moyen</TableHead>
              <TableHead>Par mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              reportSkeleton(columns)
            ) : !report || report.periodes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Aucune période ne correspond à ces critères.
                </TableCell>
              </TableRow>
            ) : (
              report.periodes.map((periode) => (
                <TableRow key={`${periode.periode}-${periode.label}`}>
                  <TableCell>
                    <span className="block font-medium">{periode.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {periode.periode}
                      {periode.periode_fin ? ` → ${periode.periode_fin}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{periode.nb_ventes}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVenteMoney(periode.total_ht)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVenteMoney(periode.total_tva)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVenteMoney(periode.total_ttc)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVenteMoney(periode.panier_moyen_ttc)}
                  </TableCell>
                  <TableCell className="max-w-64 text-xs text-muted-foreground">
                    {parModeLabel(periode.par_mode)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export type OVentesReportCaissiersProps = ReportProps & {
  report: ApiVentesReportParCaissier | null
}

export function OVentesReportCaissiers({
  report,
  loading,
  error,
  onRetry,
}: OVentesReportCaissiersProps) {
  if (error) return <ReportError error={error} onRetry={onRetry} />

  const columns = 8
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Caissier</TableHead>
            <TableHead className="w-24">Rôle</TableHead>
            <TableHead className="w-24">Ventes</TableHead>
            <TableHead className="w-36 text-right">CA TTC</TableHead>
            <TableHead className="w-40 text-right">Encaissé net</TableHead>
            <TableHead className="w-36 text-right">Panier moyen</TableHead>
            <TableHead className="w-36">Annulations</TableHead>
            <TableHead>Caisses / par mode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            reportSkeleton(columns)
          ) : !report || report.caissiers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucune vente au comptant sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            report.caissiers.map((caissier) => (
              <TableRow key={caissier.user_id}>
                <TableCell className="font-medium">{caissier.user_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {caissier.role}
                </TableCell>
                <TableCell className="tabular-nums">{caissier.nb_ventes}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(caissier.total_ttc)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(caissier.total_encaisse_net)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVenteMoney(caissier.panier_moyen_ttc)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {caissier.annulations
                    ? `${caissier.annulations.nb} · ${formatVenteMoney(caissier.annulations.total_ttc)}`
                    : "—"}
                </TableCell>
                <TableCell className="max-w-72 text-xs text-muted-foreground">
                  <span className="block">
                    {caissier.caisses
                      ? `${caissier.caisses.nb_sessions} session(s), ${caissier.caisses.sessions_ouvertes} ouverte(s), écart ${formatVenteMoney(caissier.caisses.ecart_total)}`
                      : "—"}
                  </span>
                  <span className="block">{parModeLabel(caissier.par_mode)}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
