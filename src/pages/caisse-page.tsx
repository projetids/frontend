import { useCallback, useEffect, useMemo, useState } from "react"
import { PrinterIcon, ShoppingCartIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomButton } from "@/components/atoms"
import { MConfirmDialog } from "@/components/molecules"
import { OCaisseAdminPanel } from "@/components/organisms"
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
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { normalizeDecimal } from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import * as articleService from "@/services/article.service"
import * as caisseService from "@/services/caisse.service"
import * as clientService from "@/services/client.service"
import * as depotService from "@/services/depot.service"
import * as permissionService from "@/services/permission.service"
import * as venteService from "@/services/vente.service"
import type {
  ApiArticleOption,
  ApiCaisseSession,
  ApiModePaiement,
} from "@/types/api"

// Écran de vente au comptant. Le caissier doit avoir une session de caisse du
// jour ouverte (docs/caisse.md) ; les ventes ADMIN/SUPERADMIN ne sont pas
// rattachées à une caisse. Les données de vente proviennent exclusivement des
// routes `/select`, seules autorisées pour le rôle CASHIER.

type CartLine = { article: ApiArticleOption; qty: number }

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

  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [clients, setClients] = useState<{ client_id: string; client_name: string }[]>([])
  const [depots, setDepots] = useState<{ depot_id: string; depot_name: string }[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

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

  // Le catalogue de vente n'est chargé que lorsqu'une caisse utilisable est
  // ouverte (ou pour un admin qui vend sans caisse).
  useEffect(() => {
    if (sessionLoading || !canSell) return
    let cancelled = false
    async function load() {
      setCatalogLoading(true)
      setCatalogError(null)
      try {
        const [arts, cls, dps] = await Promise.all([
          articleService.listArticleOptions(),
          clientService.listClientOptions(),
          depotService.listDepotOptions(),
        ])
        if (cancelled) return
        setArticles(arts.options)
        setClients(cls.options.map((c) => ({ client_id: c.client_id, client_name: c.client_name })))
        setDepots(dps.options.map((d) => ({ depot_id: d.depot_id, depot_name: d.depot_name })))
        setSelectedDepot((prev) => (prev ? prev : dps.options[0]?.depot_id ?? ""))
      } catch (err) {
        if (cancelled) return
        setCatalogError(
          err instanceof ApiError
            ? err.details || err.message
            : "Chargement du catalogue impossible."
        )
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [canSell, sessionLoading])

  const addToCart = useCallback((article: ApiArticleOption) => {
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
    setSubmitting(true)
    try {
      const payload = {
        client_id: selectedClient || undefined,
        depot_id: selectedDepot,
        point_of_sale_id: posId || undefined,
        ...(isCashier && session ? { caisse_session_id: session.session_id } : {}),
        mode_paiement: mode,
        montant_ttc: totalTtc,
        montant_encaisse: montantEncaisse ? Number(normalizeDecimal(montantEncaisse)) : totalTtc,
        lines: cart.map((l) => ({
          article_id: l.article.article_id,
          qty: l.qty,
          unit_price_ht: Number(money(l.article.article_sale_price_ht)),
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
        `Total HT: ${money(totalHt)}`,
        `Total TTC: ${money(totalTtc)}`,
        `Encaissé: ${money(payload.montant_encaisse)}`,
        `Mode: ${mode}`,
        ``,
        `Merci de votre visite !`,
      ].join("\n")
      setLastTicket(ticket)
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
          <CardHeader>
            <CardTitle>Produits</CardTitle>
            <CardDescription>Cliquez pour ajouter au panier.</CardDescription>
          </CardHeader>
          <CardContent>
            {catalogLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {articles.map((a) => (
                  <button
                    key={a.article_id}
                    type="button"
                    onClick={() => addToCart(a)}
                    disabled={!canSell || (a.article_available_qty !== undefined && Number(a.article_available_qty) <= 0)}
                    className="rounded-md border p-3 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <p className="font-medium truncate">{a.article_name}</p>
                    <p className="text-xs text-muted-foreground">{a.article_code}</p>
                    <p className="mt-1 font-semibold">{money(a.article_sale_price_ttc)} Ar</p>
                    {a.article_available_qty !== undefined ? (
                      <p className="text-xs text-muted-foreground">
                        Dispo. : {a.article_available_qty}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
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
