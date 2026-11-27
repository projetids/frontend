import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChartNoAxesCombinedIcon,
  PackageIcon,
  RefreshCwIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AtomBadge, AtomButton, AtomInput } from "@/components/atoms"
import { MSelectField } from "@/components/molecules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import {
  formatArticleDate,
  formatArticlePrice,
  formatArticleQuantity,
} from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import { modePaiementLabel } from "@/lib/ventes"
import { listPointOfSaleOptions } from "@/services/point-of-sale.service"
import {
  getDashboardStats,
  getStockStats,
  getUtilisateursStats,
  getVentesStats,
} from "@/services/stats.service"
import type {
  ApiRole,
  ApiStatsDashboard,
  ApiStatsStock,
  ApiStatsUtilisateurs,
  ApiStatsVentes,
  StatsQuery,
} from "@/types/api"

type StatsFilters = {
  date_from: string
  date_to: string
  point_of_sale_id: string
}

const EMPTY_FILTERS: StatsFilters = {
  date_from: "",
  date_to: "",
  point_of_sale_id: "all",
}

const ALL_POS = "all"

function toIsoDate(value: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined
  const time = endOfDay ? "T23:59:59.999" : "T00:00:00.000"
  const parsed = new Date(`${value}${time}`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

function buildQuery(filters: StatsFilters): StatsQuery {
  return {
    date_from: toIsoDate(filters.date_from, false),
    date_to: toIsoDate(filters.date_to, true),
    point_of_sale_id:
      filters.point_of_sale_id === ALL_POS
        ? undefined
        : filters.point_of_sale_id,
  }
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RoleRow({ role, count }: { role: ApiRole; count: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-2 py-1.5 text-left capitalize">{roleLabel(role)}</td>
      <td className="px-2 py-1.5 text-right font-medium">{count}</td>
    </tr>
  )
}

export function StatsPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"
  const [filters, setFilters] = useState<StatsFilters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<StatsQuery>({})
  const [dashboard, setDashboard] = useState<ApiStatsDashboard | null>(null)
  const [ventes, setVentes] = useState<ApiStatsVentes | null>(null)
  const [stock, setStock] = useState<ApiStatsStock | null>(null)
  const [utilisateurs, setUtilisateurs] = useState<ApiStatsUtilisateurs | null>(
    null
  )
  const [posOptions, setPosOptions] = useState<
    { value: string; label: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSuperadmin) return
    let active = true
    listPointOfSaleOptions()
      .then(({ options }) => {
        if (!active) return
        setPosOptions(
          options.map((pos) => ({
            value: pos.id,
            label: `${pos.name} (${pos.point_of_sale_code})`,
          }))
        )
      })
      .catch(() => {
        if (active) toast.error("Impossible de charger les points de vente")
      })
    return () => {
      active = false
    }
  }, [isSuperadmin])

  const load = useCallback(async (query: StatsQuery) => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardRes, ventesRes, stockRes, usersRes] = await Promise.all([
        getDashboardStats(query),
        getVentesStats(query),
        getStockStats(query),
        getUtilisateursStats(query),
      ])
      setDashboard(dashboardRes.stats)
      setVentes(ventesRes.stats)
      setStock(stockRes.stats)
      setUtilisateurs(usersRes.stats)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inattendue"
      setError(message)
      toast.error("Statistiques indisponibles", { description: message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Diffère le chargement pour éviter un setState synchrone dans l'effet.
    queueMicrotask(() => void load(applied))
  }, [applied, load])

  function handleApply() {
    if (filters.date_from && filters.date_to && filters.date_to < filters.date_from) {
      setError("La date de fin doit être postérieure à la date de début.")
      return
    }
    setApplied(buildQuery(filters))
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS)
    setApplied({})
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <AtomBadge variant="outline" className="w-fit">
            Analyse
          </AtomBadge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Indicateurs de ventes, de stock et d'utilisateurs.
          </p>
        </div>
        <AtomButton
          variant="outline"
          iconLeft={RefreshCwIcon}
          disabled={loading}
          onClick={() => void load(applied)}
        >
          Actualiser
        </AtomButton>
      </section>

      <Card size="sm">
        <CardContent className="grid gap-4 pt-(--card-spacing) sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="stats-date-from">
              Du
            </label>
            <AtomInput
              id="stats-date-from"
              type="date"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  date_from: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="stats-date-to">
              Au
            </label>
            <AtomInput
              id="stats-date-to"
              type="date"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  date_to: event.target.value,
                }))
              }
            />
          </div>
          {isSuperadmin ? (
            <MSelectField
              label="Point de vente"
              value={filters.point_of_sale_id}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  point_of_sale_id: value,
                }))
              }
              options={[
                { value: ALL_POS, label: "Tous les points de vente" },
                ...posOptions,
              ]}
            />
          ) : null}
          <div className="flex items-end gap-2">
            <AtomButton disabled={loading} onClick={handleApply}>
              Appliquer
            </AtomButton>
            <AtomButton
              variant="ghost"
              disabled={loading}
              onClick={handleReset}
            >
              Réinitialiser
            </AtomButton>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {dashboard ? (
        <p className="text-muted-foreground text-sm">
          Période&nbsp;: {formatArticleDate(dashboard.period.date_from ?? undefined)} —{" "}
          {formatArticleDate(dashboard.period.date_to ?? undefined)}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CA TTC"
          value={formatArticlePrice(
            dashboard?.ventes.total_ttc ?? ventes?.total_ttc
          )}
          hint={`${formatArticleQuantity(
            dashboard?.ventes.nb_ventes ?? ventes?.nb_ventes
          )} vente(s)`}
          icon={WalletIcon}
        />
        <StatCard
          label="CA HT"
          value={formatArticlePrice(
            dashboard?.ventes.total_ht ?? ventes?.total_ht
          )}
          hint="Hors taxes"
          icon={ChartNoAxesCombinedIcon}
        />
        <StatCard
          label="Articles en stock"
          value={formatArticleQuantity(
            stock?.nb_articles ?? dashboard?.stock.nb_articles
          )}
          hint={`Valeur achat : ${formatArticlePrice(
            stock?.valeur_stock_achat ?? dashboard?.stock.valeur_stock_achat
          )}`}
          icon={PackageIcon}
        />
        <StatCard
          label="Utilisateurs"
          value={formatArticleQuantity(
            utilisateurs?.total ?? dashboard?.utilisateurs.total
          )}
          hint={`${formatArticleQuantity(
            stock?.stock_bas ?? dashboard?.stock.stock_bas
          )} article(s) en stock bas`}
          icon={UsersIcon}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventes par mode de paiement</CardTitle>
            <CardDescription>
              Répartition du CA HT sur la période sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ventes?.par_moyen_paiement.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-1.5 text-left font-medium">Mode</th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      Nombre
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      CA HT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ventes.par_moyen_paiement.map((row) => (
                    <tr key={row.mode_paiement} className="border-b last:border-0">
                      <td className="px-2 py-1.5 text-left">
                        {modePaiementLabel(row.mode_paiement)}
                      </td>
                      <td className="px-2 py-1.5 text-right">{row.count}</td>
                      <td className="px-2 py-1.5 text-right">
                        {formatArticlePrice(row.total_ht)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Aucune vente sur cette période.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs par rôle</CardTitle>
            <CardDescription>
              {utilisateurs?.point_of_sale_id
                ? `Point de vente ${utilisateurs.point_of_sale_id}`
                : "Tous les points de vente"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">Rôle</th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    Effectif
                  </th>
                </tr>
              </thead>
              <tbody>
                {(utilisateurs?.par_role ?? dashboard?.utilisateurs.par_role ?? []).map(
                  (row) => (
                    <RoleRow key={row.role} role={row.role} count={row.count} />
                  )
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Valorisation du stock</CardTitle>
            <CardDescription>
              Valeurs d'achat et de vente HT des articles.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-muted-foreground text-xs">Valeur achat</p>
              <p className="text-lg font-semibold">
                {formatArticlePrice(stock?.valeur_stock_achat)}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-muted-foreground text-xs">Valeur vente HT</p>
              <p className="text-lg font-semibold">
                {formatArticlePrice(stock?.valeur_stock_vente)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventes récentes</CardTitle>
            <CardDescription>Dernières ventes au comptant.</CardDescription>
          </CardHeader>
          <CardContent>
            {ventes?.ventes_recentes.length ? (
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-1.5 text-left font-medium">Code</th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Montant TTC
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventes.ventes_recentes.map((row) => (
                      <tr key={row.vente_id} className="border-b last:border-0">
                        <td className="px-2 py-1.5 text-left font-medium">
                          {row.vente_code}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatArticlePrice(row.montant_ttc)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatArticleDate(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Aucune vente récente.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
