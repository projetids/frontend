import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FileTextIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  ShoppingCartIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MConfirmDialog, MPagination } from "@/components/molecules"
import { OCaisseAdminPanel } from "@/components/organisms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  ARTICLE_STATUS_OPTIONS,
  articleFamilyLabel,
  articleStatusToQuery,
  articleUnitLabel,
  formatArticlePrice,
  formatArticleQuantity,
  normalizeDecimal,
  type ArticleStatusFilter,
} from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import * as articleFamilyService from "@/services/article-family.service"
import * as articleService from "@/services/article.service"
import * as caisseService from "@/services/caisse.service"
import * as clientService from "@/services/client.service"
import * as depotService from "@/services/depot.service"
import * as permissionService from "@/services/permission.service"
import * as venteService from "@/services/vente.service"
import type {
  ApiArticle,
  ApiArticleFamily,
  ApiCaisseSession,
  ApiModePaiement,
  ArticleSortField,
  ArticlesQuery,
} from "@/types/api"

// Écran de vente au comptant. Le caissier doit avoir une session de caisse du
// jour ouverte (docs/caisse.md) ; les ventes ADMIN/SUPERADMIN ne sont pas
// rattachées à une caisse. Le catalogue est paginé côté serveur via GET
// /articles (page, limit, search, filtres et tri).

type CartLine = { article: ApiArticle; qty: number }

const MODES: ApiModePaiement[] = [
  "ESPECES",
  "MOBILE_MONEY",
  "CARTE",
  "VIREMENT",
  "CHEQUE",
  "AUTRE",
]

function money(value?: string | number | null): string {
  const parsed = Number(normalizeDecimal(String(value ?? "0")))
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"
}

function parseAmount(value: string): number | null {
  const parsed = Number(normalizeDecimal(value))
  return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function CaissePage() {
  const { user } = useAuth()
  const isCashier = user?.role === "cashier"
  const posId = user?.point_of_sale_id ?? ""

  // Session courante (CASHIER uniquement) et permissions de vente A40/A31.
  const [session, setSession] = useState<ApiCaisseSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isCashier)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null)

  const [articles, setArticles] = useState<ApiArticle[]>([])
  const [families, setFamilies] = useState<ApiArticleFamily[]>([])
  const [clients, setClients] = useState<{ client_id: string; client_name: string }[]>([])
  const [depots, setDepots] = useState<{ depot_id: string; depot_name: string }[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Paramètres envoyés à GET /articles. Publiés par défaut (comportement de
  // l'ancien /articles/select), tri par nom pour retrouver un article vite.
  const [articleQuery, setArticleQuery] = useState<ArticlesQuery>({
    page: 1,
    limit: 20,
    is_publish: true,
    sort_by: "article_name",
    sort_order: "ASC",
  })
  const [searchInput, setSearchInput] = useState("")
  const [articleStatus, setArticleStatus] = useState<ArticleStatusFilter>("published")
  const [articleMeta, setArticleMeta] = useState({ page: 1, limit: 20, total: 0 })
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [fondOuverture, setFondOuverture] = useState("")
  const [notesOuverture, setNotesOuverture] = useState("")
  const [montantCompte, setMontantCompte] = useState("")
  const [notesFermeture, setNotesFermeture] = useState("")

  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedDepot, setSelectedDepot] = useState("")
  const [mode, setMode] = useState<ApiModePaiement>("ESPECES")
  const [montantEncaisse, setMontantEncaisse] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [lastTicket, setLastTicket] = useState<string | null>(null)
  const [lastVente, setLastVente] = useState<{
    vente_id: string
    vente_code: string
    facture_id?: string | null
  } | null>(null)
  const [facturationLoading, setFacturationLoading] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false)
  const [confirmOpenRegister, setConfirmOpenRegister] = useState(false)

  const missingPermissions = useMemo(() => {
    if (!flags || user?.role === "superadmin") return []
    return ["A40", "A31"].filter((code) => flags[code] !== true)
  }, [flags, user?.role])

  const canSell =
    !isCashier ||
    (session !== null &&
      session.status === "OUVERTE" &&
      !session.is_previous_day &&
      missingPermissions.length === 0)

  const reloadSession = useCallback(async () => {
    if (!isCashier) return null
    const { session: current } = await caisseService.getCurrentCaisseSession()
    setSession(current)
    return current
  }, [isCashier])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSessionLoading(true)
      setSessionError(null)
      try {
        if (isCashier) {
          await reloadSession()
          const { permissions } = await permissionService.getProfilePermissions()
          if (!cancelled) setFlags(permissions.flags ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          // En cas d'échec (session ou permissions), on bloque la vente plutôt
          // que de laisser un caissier vendre sans contrôle.
          if (isCashier) setFlags({})
          setSessionError(
            err instanceof ApiError
              ? err.details || err.message
              : "Chargement de la caisse impossible."
          )
        }
      } finally {
        if (!cancelled) setSessionLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isCashier, reloadSession])

  // Listes de référence (clients, dépôts, familles) chargées une seule fois
  // dès que la vente est autorisée.
  useEffect(() => {
    if (sessionLoading || !canSell) return
    let cancelled = false
    async function load() {
      try {
        const [cls, dps] = await Promise.all([
          clientService.listClientOptions(),
          depotService.listDepotOptions(),
        ])
        if (cancelled) return
        setClients(cls.options.map((c) => ({ client_id: c.client_id, client_name: c.client_name })))
        setDepots(dps.options.map((d) => ({ depot_id: d.depot_id, depot_name: d.depot_name })))
        setSelectedDepot((prev) => (prev ? prev : dps.options[0]?.depot_id ?? ""))
      } catch (err) {
        if (cancelled) return
        setCatalogError(
          err instanceof ApiError
            ? err.details || err.message
            : "Chargement des référentiels impossible."
        )
      }

      try {
        const { families: loaded } = await articleFamilyService.listArticleFamilies({
          limit: 100,
        })
        if (!cancelled) setFamilies(loaded)
      } catch {
        // Le filtre famille est masqué si le rôle ne peut pas lire les familles.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [canSell, sessionLoading])

  // Catalogue paginé : toute modification de `articleQuery` recharge la page
  // correspondante (recherche, filtres, tri ou changement de page).
  useEffect(() => {
    if (sessionLoading || !canSell) return
    let cancelled = false
    // Diffère le setState initial pour éviter un rendu en cascade dans l'effet.
    queueMicrotask(() => {
      if (cancelled) return
      setCatalogLoading(true)
      setCatalogError(null)
      articleService
        .listArticles(articleQuery)
        .then(({ articles: loaded, meta }) => {
          if (cancelled) return
          setArticles(loaded)
          setArticleMeta({ page: meta.page, limit: meta.limit, total: meta.total })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setCatalogError(
            err instanceof ApiError
              ? err.details || err.message
              : "Chargement des articles impossible."
          )
        })
        .finally(() => {
          if (!cancelled) setCatalogLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [articleQuery, canSell, sessionLoading])

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    },
    []
  )

  /** Recherche serveur différée pour éviter une requête par frappe. */
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setArticleQuery((previous) => ({
        ...previous,
        search: value.trim() || undefined,
        page: 1,
      }))
    }, 300)
  }

  function handleStatusChange(value: ArticleStatusFilter) {
    setArticleStatus(value)
    setArticleQuery((previous) => ({
      ...previous,
      is_publish: articleStatusToQuery(value),
      page: 1,
    }))
  }

  function handleFamilyChange(value: string) {
    setArticleQuery((previous) => ({
      ...previous,
      article_families_id: value === "all" ? undefined : Number(value),
      page: 1,
    }))
  }

  function handleSortChange(value: ArticleSortField) {
    setArticleQuery((previous) => ({
      ...previous,
      sort_by: value,
      sort_order: value === "created_at" ? "DESC" : "ASC",
      page: 1,
    }))
  }

  function handleSortOrderChange(value: "ASC" | "DESC") {
    setArticleQuery((previous) => ({ ...previous, sort_order: value, page: 1 }))
  }

  function handleLimitChange(value: number) {
    setArticleQuery((previous) => ({ ...previous, limit: value, page: 1 }))
  }

  const addToCart = useCallback((article: ApiArticle) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.article.article_id === article.article_id)
      const available = article.article_available_qty
        ? Number(normalizeDecimal(article.article_available_qty))
        : null
      if (existing) {
        if (available !== null && existing.qty >= available) return prev
        return prev.map((l) =>
          l.article.article_id === article.article_id ? { ...l, qty: l.qty + 1 } : l
        )
      }
      if (available !== null && available <= 0) return prev
      return [...prev, { article, qty: 1 }]
    })
  }, [])

  const updateQty = useCallback((article_id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.article.article_id === article_id ? { ...l, qty } : l))
        .filter((l) => l.qty > 0)
    )
  }, [])

  const removeFromCart = useCallback((article_id: string) => {
    setCart((prev) => prev.filter((l) => l.article.article_id !== article_id))
  }, [])

  const totalTtc = useMemo(
    () => cart.reduce((sum, l) => sum + Number(money(l.article.article_sale_price_ttc)) * l.qty, 0),
    [cart]
  )
  const totalHt = useMemo(
    () => cart.reduce((sum, l) => sum + Number(money(l.article.article_sale_price_ht)) * l.qty, 0),
    [cart]
  )

  async function handleOpenRegister() {
    const fond = parseAmount(fondOuverture)
    if (fond === null) {
      toast.error("Fond de caisse invalide", {
        description: "Saisissez un montant positif ou nul.",
      })
      return
    }
    setSessionLoading(true)
    try {
      const { session: opened } = await caisseService.openCaisseSession({
        fond_ouverture: fond,
        ...(notesOuverture.trim() ? { notes: notesOuverture.trim() } : {}),
      })
      setSession(opened)
      setFondOuverture("")
      setNotesOuverture("")
      setConfirmOpenRegister(false)
      toast.success(`Caisse ${opened.session_code} ouverte`)
    } catch (err) {
      toast.error("Ouverture impossible", {
        description:
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setSessionLoading(false)
    }
  }

  async function handleCloseRegister() {
    const montant = parseAmount(montantCompte)
    if (montant === null) {
      toast.error("Montant compté invalide", {
        description: "Saisissez le montant compté (fond de caisse inclus).",
      })
      return
    }
    setSessionLoading(true)
    try {
      const { session: closed } = await caisseService.closeCaisseSession({
        montant_compte: montant,
        ...(notesFermeture.trim() ? { notes: notesFermeture.trim() } : {}),
      })
      setSession(null)
      setCart([])
      setMontantCompte("")
      setNotesFermeture("")
      setConfirmCloseOpen(false)
      toast.success(`Caisse ${closed.session_code} fermée`, {
        description:
          closed.ecart !== undefined && closed.ecart !== null
            ? `Écart : ${money(closed.ecart)}`
            : undefined,
      })
    } catch (err) {
      toast.error("Fermeture impossible", {
        description:
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setSessionLoading(false)
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Panier vide")
      return
    }
    if (!selectedDepot) {
      toast.error("Sélectionnez un dépôt")
      return
    }
    // L'API exige un encaissement >= TTC calculé (le TTC du corps est ignoré).
    const encaisse = montantEncaisse
      ? Number(normalizeDecimal(montantEncaisse))
      : totalTtc
    if (!Number.isFinite(encaisse) || encaisse < totalTtc) {
      toast.error("Montant encaissé insuffisant", {
        description: `Le montant doit être au moins égal au TTC (${money(totalTtc)}).`,
      })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        client_id: selectedClient || undefined,
        depot_id: selectedDepot,
        point_of_sale_id: posId || undefined,
        ...(isCashier && session ? { caisse_session_id: session.session_id } : {}),
        mode_paiement: mode,
        montant_encaisse: encaisse,
        lines: cart.map((l) => ({
          article_id: l.article.article_id,
          qty: l.qty,
          unit_price_ttc: Number(money(l.article.article_sale_price_ttc)),
        })),
      }
      const { vente } = await venteService.createVenteComptant(payload)
      toast.success(`Vente ${vente.vente_code ?? ""} enregistrée`)
      const ticket = [
        `TICKET DE CAISSE`,
        `Vente: ${vente.vente_code ?? vente.vente_id}`,
        `Date: ${new Date().toLocaleString()}`,
        `Caissier: ${user?.user_name ?? ""}`,
        session ? `Caisse: ${session.session_code}` : "",
        ``,
        ...cart.map((l) => `${l.article.article_name} x${l.qty}  ${money(Number(money(l.article.article_sale_price_ttc)) * l.qty)}`),
        ``,
        `Total HT: ${money(vente.montant_total_ht ?? totalHt)}`,
        `TVA: ${money(vente.montant_tva)}`,
        `Total TTC: ${money(vente.montant_ttc ?? totalTtc)}`,
        `Encaissé: ${money(vente.montant_encaisse ?? encaisse)}`,
        `Monnaie rendue: ${money(vente.monnaie_rendue)}`,
        `Mode: ${mode}`,
        ``,
        `Merci de votre visite !`,
      ].join("\n")
      setLastTicket(ticket)
      setLastVente({
        vente_id: vente.vente_id,
        vente_code: vente.vente_code,
        facture_id: vente.facture_id,
      })
      const w = window.open("", "_blank", "width=400,height=600")
      if (w) {
        w.document.write(
          `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${ticket.replace(/</g, "&lt;")}</pre>`
        )
        w.document.close()
        w.focus()
        w.print()
      }
      setCart([])
      setMontantEncaisse("")
      // La vente a décrémenté le stock : recharge la page courante du catalogue.
      // On renouvelle l'objet de requête (mêmes filtres) plutôt que d'ajouter
      // une dépendance à l'effet, ce qui garde la liste de dépendances stable.
      setArticleQuery((previous) => ({ ...previous }))
      if (isCashier) await reloadSession()
    } catch (err) {
      toast.error("Vente impossible", {
        description:
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function printTicket() {
    if (!lastTicket) return
    const w = window.open("", "_blank", "width=400,height=600")
    if (w) {
      w.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${lastTicket.replace(/</g, "&lt;")}</pre>`)
      w.document.close()
      w.focus()
      w.print()
    }
  }

  /** Le caissier peut facturer sa propre vente (docs/ventes.md). */
  async function handleFacturer() {
    if (!lastVente || lastVente.facture_id) return
    setFacturationLoading(true)
    try {
      const { facture } = await venteService.createFactureVente({
        vente_id: lastVente.vente_id,
      })
      setLastVente((previous) =>
        previous ? { ...previous, facture_id: facture.facture_id } : null
      )
      toast.success(`Facture ${facture.facture_code} créée`)
      await venteService.downloadFactureVentePdf(facture)
    } catch (err) {
      toast.error("Facturation impossible", {
        description:
          err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setFacturationLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl py-16 text-center text-sm text-muted-foreground">
        Chargement de la caisse…
      </div>
    )
  }

  // Caisse fermée ou absente : écran d'ouverture (CASHIER uniquement).
  if (isCashier && (!session || session.status === "FERMEE")) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Ouverture de caisse</CardTitle>
            <CardDescription>
              {user ? `${user.user_name} · ${roleLabel(user.role)}` : "Caissier"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Aucune caisse ouverte pour aujourd&apos;hui. Saisissez le fond de
              caisse pour commencer les ventes.
            </p>
            <div className="grid gap-1.5">
              <label htmlFor="caisseFond" className="text-sm font-medium">
                Fond de caisse (Ariary)
              </label>
              <input
                id="caisseFond"
                type="number"
                min={0}
                step="0.01"
                value={fondOuverture}
                onChange={(event) => setFondOuverture(event.target.value)}
                placeholder="50000.00"
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="caisseNotes" className="text-sm font-medium">
                Notes (optionnel)
              </label>
              <textarea
                id="caisseNotes"
                rows={2}
                value={notesOuverture}
                onChange={(event) => setNotesOuverture(event.target.value)}
                placeholder="Ex. Début de service"
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            {sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
            <AtomButton
              onClick={() => setConfirmOpenRegister(true)}
              iconLeft={ShoppingCartIcon}
              disabled={parseAmount(fondOuverture) === null}
            >
              Ouvrir la caisse
            </AtomButton>
          </CardContent>
        </Card>

        <MConfirmDialog
          open={confirmOpenRegister}
          onOpenChange={setConfirmOpenRegister}
          title="Ouvrir la caisse ?"
          description={`Le fond de ${money(parseAmount(fondOuverture) ?? 0)} sera enregistré pour la journée.`}
          confirmLabel="Ouvrir la caisse"
          confirmDisabled={parseAmount(fondOuverture) === null}
          onConfirm={() => void handleOpenRegister()}
        />
      </div>
    )
  }

  // Caisse restée ouverte un jour précédent : fermeture obligatoire.
  if (isCashier && session?.is_previous_day) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-16">
        <Card className="w-full border-destructive/50">
          <CardHeader>
            <CardTitle>Caisse du {session.business_date} encore ouverte</CardTitle>
            <CardDescription>
              Session {session.session_code} — fermez-la avant d&apos;ouvrir la
              caisse du jour. Les ventes sont bloquées.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="caissePreviousAmount" className="text-sm font-medium">
                Montant compté (fond inclus)
              </label>
              <input
                id="caissePreviousAmount"
                type="number"
                min={0}
                step="0.01"
                value={montantCompte}
                onChange={(event) => setMontantCompte(event.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="caissePreviousNotes" className="text-sm font-medium">
                Notes (optionnel)
              </label>
              <textarea
                id="caissePreviousNotes"
                rows={2}
                value={notesFermeture}
                onChange={(event) => setNotesFermeture(event.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <AtomButton
              variant="destructive"
              disabled={parseAmount(montantCompte) === null}
              onClick={() => setConfirmCloseOpen(true)}
            >
              Fermer la caisse du {session.business_date}
            </AtomButton>
          </CardContent>
        </Card>

        <MConfirmDialog
          open={confirmCloseOpen}
          onOpenChange={setConfirmCloseOpen}
          title="Fermer la caisse précédente ?"
          description="La session sera clôturée avec le montant compté saisi."
          confirmLabel="Fermer la caisse"
          destructive
          confirmDisabled={parseAmount(montantCompte) === null}
          onConfirm={() => void handleCloseRegister()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {!isCashier ? <OCaisseAdminPanel /> : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Caisse</h1>
          <p className="text-sm text-muted-foreground">
            {user?.user_name} ·{" "}
            {session
              ? `Session ${session.session_code} · ${session.business_date}`
              : "Vente sans caisse (administrateur)"}
          </p>
        </div>
        <div className="flex gap-2">
          {lastTicket ? (
            <AtomButton variant="outline" iconLeft={PrinterIcon} onClick={printTicket}>
              Réimprimer
            </AtomButton>
          ) : null}
          {lastVente && !lastVente.facture_id ? (
            <AtomButton
              variant="outline"
              iconLeft={FileTextIcon}
              onClick={() => void handleFacturer()}
              disabled={facturationLoading}
            >
              {facturationLoading ? "Facturation…" : "Facturer la vente"}
            </AtomButton>
          ) : null}
          {isCashier && session ? (
            <AtomButton variant="outline" onClick={() => setConfirmCloseOpen(true)}>
              Fermer la caisse
            </AtomButton>
          ) : null}
        </div>
      </header>

      {session ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fond d&apos;ouverture</CardDescription>
              <CardTitle className="text-lg">{money(session.fond_ouverture)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ventes</CardDescription>
              <CardTitle className="text-lg">{session.nb_ventes ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total TTC</CardDescription>
              <CardTitle className="text-lg">{money(session.total_ttc)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Encaissé</CardDescription>
              <CardTitle className="text-lg">{money(session.total_encaisse)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {session?.totaux_par_mode && Object.keys(session.totaux_par_mode).length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(session.totaux_par_mode).map(([key, total]) => (
            <span
              key={key}
              className="rounded-md border bg-muted/40 px-2 py-1 text-muted-foreground"
            >
              {key} · {total.nb_ventes} vente(s) · {money(total.total_encaisse)}
            </span>
          ))}
        </div>
      ) : null}

      {missingPermissions.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Permissions manquantes ({missingPermissions.join(", ")}) : demandez à
          l&apos;administrateur de les activer sur votre compte pour vendre.
        </div>
      ) : null}
      {sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
      {catalogError ? <p className="text-sm text-destructive">{catalogError}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3">
            <div>
              <CardTitle>Produits</CardTitle>
              <CardDescription>
                Recherche et pagination serveur — cliquez sur « Ajouter » pour
                alimenter le panier.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-52 flex-1">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Code, nom, code-barres, référence…"
                  className="pl-8"
                  aria-label="Rechercher un article"
                />
              </div>
              {families.length > 0 ? (
                <Select
                  value={
                    articleQuery.article_families_id === undefined
                      ? "all"
                      : String(articleQuery.article_families_id)
                  }
                  onValueChange={handleFamilyChange}
                >
                  <SelectTrigger className="w-40" aria-label="Famille">
                    <SelectValue placeholder="Toutes les familles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les familles</SelectItem>
                    {families.map((family) => (
                      <SelectItem
                        key={family.article_families_id}
                        value={String(family.article_families_id)}
                      >
                        {family.article_families_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={articleStatus} onValueChange={(v) => handleStatusChange(v as ArticleStatusFilter)}>
                <SelectTrigger className="w-40" aria-label="Statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={articleQuery.sort_by ?? "created_at"}
                onValueChange={(v) => handleSortChange(v as ArticleSortField)}
              >
                <SelectTrigger className="w-40" aria-label="Tri">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article_name">Tri : nom</SelectItem>
                  <SelectItem value="article_code">Tri : code</SelectItem>
                  <SelectItem value="created_at">Tri : plus récents</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={articleQuery.sort_order ?? "ASC"}
                onValueChange={(v) => handleSortOrderChange(v as "ASC" | "DESC")}
              >
                <SelectTrigger className="w-24" aria-label="Ordre de tri">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">ASC</SelectItem>
                  <SelectItem value="DESC">DESC</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={articleQuery.limit === 10 ? "10" : articleQuery.limit === 50 ? "50" : "20"}
                onValueChange={(v) => handleLimitChange(Number(v))}
              >
                <SelectTrigger className="w-24" aria-label="Nombre par page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Code / barcode</TableHead>
                    <TableHead>Famille</TableHead>
                    <TableHead className="text-right">Prix vente TTC</TableHead>
                    <TableHead className="text-right">Stock dispo.</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : articles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Aucun article ne correspond à ces critères.
                      </TableCell>
                    </TableRow>
                  ) : (
                    articles.map((article) => {
                      const available = Number(article.article_available_qty)
                      const inStock = Number.isFinite(available) && available > 0
                      const disabled = !canSell || !inStock
                      return (
                        <TableRow key={article.article_id}>
                          <TableCell className="max-w-56">
                            <span className="block truncate font-medium">{article.article_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {articleUnitLabel(article.article_unit)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <AtomBadge variant="outline" className="font-mono">
                              {article.article_code}
                            </AtomBadge>
                            {article.article_barcode?.trim() ? (
                              <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                                {article.article_barcode}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-40">
                            <span className="block truncate text-sm">
                              {articleFamilyLabel(families, article.article_families_id)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatArticlePrice(article.article_sale_price_ttc)}
                          </TableCell>
                          <TableCell className="text-right">
                            <AtomBadge variant={inStock ? "secondary" : "outline"}>
                              {formatArticleQuantity(article.article_available_qty)}
                            </AtomBadge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AtomButton
                              size="sm"
                              iconLeft={PlusIcon}
                              disabled={disabled}
                              onClick={() => addToCart(article)}
                            >
                              Ajouter
                            </AtomButton>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <MPagination
              page={articleMeta.page}
              limit={articleMeta.limit}
              total={articleMeta.total}
              disabled={catalogLoading}
              onPageChange={(page) =>
                setArticleQuery((previous) => ({ ...previous, page }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panier</CardTitle>
            <CardDescription>{cart.length} article(s)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {cart.map((l) => (
                <div key={l.article.article_id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{l.article.article_name}</span>
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => updateQty(l.article.article_id, Number(e.target.value))}
                    className="w-14 rounded border px-1 text-center"
                  />
                  <span className="w-20 text-right">
                    {money(Number(money(l.article.article_sale_price_ttc)) * l.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(l.article.article_id)}
                    className="text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Panier vide.</p>
              ) : null}
            </div>

            <div className="border-t pt-3 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>Total HT</span>
                <span>{money(totalHt)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total TTC</span>
                <span>{money(totalTtc)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Client (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.client_id} value={c.client_id}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium">Dépôt</label>
              <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                <SelectTrigger>
                  <SelectValue placeholder="Dépôt" />
                </SelectTrigger>
                <SelectContent>
                  {depots.map((d) => (
                    <SelectItem key={d.depot_id} value={d.depot_id}>
                      {d.depot_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium">Mode de paiement</label>
              <Select value={mode} onValueChange={(v) => setMode(v as ApiModePaiement)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium">Montant encaissé</label>
              <input
                type="number"
                step="0.01"
                value={montantEncaisse}
                onChange={(e) => setMontantEncaisse(e.target.value)}
                placeholder={money(totalTtc)}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>

            <AtomButton
              onClick={() => setConfirmCheckoutOpen(true)}
              disabled={!canSell || submitting || cart.length === 0}
              className="w-full"
            >
              {submitting ? "Enregistrement…" : "Valider et imprimer"}
            </AtomButton>
          </CardContent>
        </Card>
      </div>

      {isCashier && session ? (
        <MConfirmDialog
          open={confirmCloseOpen}
          onOpenChange={setConfirmCloseOpen}
          title="Fermer la caisse ?"
          description={`Session ${session.session_code} · théorique espèces ${money(session.montant_theorique_especes)}. Saisissez le montant compté (fond inclus).`}
          confirmLabel="Fermer la caisse"
          destructive
          confirmDisabled={parseAmount(montantCompte) === null}
          onConfirm={() => void handleCloseRegister()}
        >
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="caisseCloseAmount" className="text-sm font-medium">
                Montant compté (Ariary, fond inclus)
              </label>
              <input
                id="caisseCloseAmount"
                type="number"
                min={0}
                step="0.01"
                value={montantCompte}
                onChange={(event) => setMontantCompte(event.target.value)}
                placeholder={money(session.montant_theorique_especes ?? session.total_encaisse)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="caisseCloseNotes" className="text-sm font-medium">
                Notes (optionnel)
              </label>
              <textarea
                id="caisseCloseNotes"
                rows={2}
                value={notesFermeture}
                onChange={(event) => setNotesFermeture(event.target.value)}
                placeholder="Ex. Fin de journée"
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </MConfirmDialog>
      ) : null}

      <MConfirmDialog
        open={confirmCheckoutOpen}
        onOpenChange={setConfirmCheckoutOpen}
        title="Valider la vente ?"
        description={`Le panier (${cart.length} article(s)) sera encaissé pour un total de ${money(totalTtc)}. Un ticket sera imprimé.`}
        confirmLabel="Valider et imprimer"
        onConfirm={() => {
          setConfirmCheckoutOpen(false)
          void handleCheckout()
        }}
      />
    </div>
  )
}
