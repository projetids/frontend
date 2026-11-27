import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MConfirmDialog } from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { normalizeDecimal } from "@/lib/articles"
import * as caisseService from "@/services/caisse.service"
import * as pointOfSaleService from "@/services/point-of-sale.service"
import type { ApiCaisseDailyReport, ApiCaisseSession } from "@/types/api"

// Reporting et fermeture forcée des caisses (ADMIN / SUPERADMIN).
// Complète l'écran de vente : le caissier gère sa session, l'administrateur
// consulte le rapport journalier et clôture les sessions oubliées.

function money(value?: string | number | null): string {
  const parsed = Number(normalizeDecimal(String(value ?? "0")))
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function OCaisseAdminPanel() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"
  const [date, setDate] = useState(today)
  const [posId, setPosId] = useState("")
  const [posOptions, setPosOptions] = useState<{ value: string; label: string }[]>([])
  const [report, setReport] = useState<ApiCaisseDailyReport | null>(null)
  const [sessions, setSessions] = useState<ApiCaisseSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toClose, setToClose] = useState<ApiCaisseSession | null>(null)
  const [closeAmount, setCloseAmount] = useState("")
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!isSuperadmin) return
    let active = true
    pointOfSaleService
      .listPointOfSaleOptions()
      .then(({ options }) => {
        if (active) {
          setPosOptions(
            options.map((pos) => ({
              value: pos.id,
              label: `${pos.name} (${pos.point_of_sale_code})`,
            }))
          )
        }
      })
      .catch(() => {
        if (active) toast.error("Points de vente indisponibles")
      })
    return () => {
      active = false
    }
  }, [isSuperadmin])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = {
        date,
        ...(isSuperadmin && posId ? { point_of_sale_id: posId } : {}),
      }
      const [reportRes, listRes] = await Promise.all([
        caisseService.getCaisseDailyReport(query),
        caisseService.listCaisseSessions({ ...query, limit: 100 }),
      ])
      setReport(reportRes.report)
      setSessions(listRes.sessions)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.details || err.message : "Erreur inattendue"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [date, posId, isSuperadmin])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  async function handleForceClose() {
    if (!toClose) return
    setClosing(true)
    try {
      const amount = closeAmount.trim() ? Number(normalizeDecimal(closeAmount)) : undefined
      const { session } = await caisseService.forceCloseCaisseSession(
        toClose.session_id,
        amount !== undefined ? { montant_compte: amount } : undefined
      )
      toast.success(`Caisse ${session.session_code} fermée`)
      setToClose(null)
      setCloseAmount("")
      await load()
    } catch (err) {
      toast.error("Fermeture impossible", {
        description:
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setClosing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Rapport journalier des caisses</CardTitle>
          <CardDescription>
            Sessions du {date} — consultation et fermeture forcée.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label htmlFor="caisseReportDate" className="text-xs font-medium">
              Date
            </label>
            <input
              id="caisseReportDate"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
            />
          </div>
          {isSuperadmin ? (
            <div className="grid gap-1">
              <label htmlFor="caisseReportPos" className="text-xs font-medium">
                Point de vente
              </label>
              <Select value={posId} onValueChange={setPosId}>
                <SelectTrigger id="caisseReportPos" className="w-56">
                  <SelectValue placeholder="Tous les points de vente" />
                </SelectTrigger>
                <SelectContent>
                  {posOptions.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <AtomButton size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            Actualiser
          </AtomButton>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {report ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Caisse(s) ouverte(s)</p>
              <p className="text-lg font-semibold">{report.sessions_ouvertes}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Ventes</p>
              <p className="text-lg font-semibold">{report.totaux.nb_ventes}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total TTC</p>
              <p className="text-lg font-semibold">{money(report.totaux.total_ttc)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Écart total</p>
              <p className="text-lg font-semibold">{money(report.totaux.ecart_total)}</p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Caissier</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Fond</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Encaissé</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Aucune session de caisse pour cette date.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell className="font-mono text-xs">{session.session_code}</TableCell>
                    <TableCell>{session.cashier_id}</TableCell>
                    <TableCell>
                      <AtomBadge variant={session.status === "OUVERTE" ? "secondary" : "outline"}>
                        {session.status}
                      </AtomBadge>
                    </TableCell>
                    <TableCell className="text-right">{money(session.fond_ouverture)}</TableCell>
                    <TableCell className="text-right">{session.nb_ventes ?? 0}</TableCell>
                    <TableCell className="text-right">{money(session.total_encaisse)}</TableCell>
                    <TableCell className="text-right">{money(session.ecart)}</TableCell>
                    <TableCell className="text-right">
                      {session.status === "OUVERTE" ? (
                        <AtomButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setToClose(session)
                            setCloseAmount("")
                          }}
                        >
                          Fermer
                        </AtomButton>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <MConfirmDialog
        open={toClose !== null}
        onOpenChange={(open) => {
          if (!open) setToClose(null)
        }}
        title="Fermer la caisse ?"
        description={
          toClose
            ? `La session ${toClose.session_code} sera clôturée par l'administrateur.`
            : undefined
        }
        confirmLabel={closing ? "Fermeture…" : "Fermer la caisse"}
        confirmDisabled={closing}
        destructive
        onConfirm={() => void handleForceClose()}
      >
        <div className="grid gap-1.5">
          <label htmlFor="caisseForceAmount" className="text-sm font-medium">
            Montant compté (optionnel, fond inclus)
          </label>
          <input
            id="caisseForceAmount"
            type="number"
            min={0}
            step="0.01"
            value={closeAmount}
            onChange={(event) => setCloseAmount(event.target.value)}
            placeholder="Laisser vide pour utiliser le théorique"
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </MConfirmDialog>
    </Card>
  )
}
