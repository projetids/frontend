import { useCallback, useEffect, useMemo, useState } from "react"
import { PrinterIcon, ShoppingCartIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomButton } from "@/components/atoms"
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
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { roleLabel } from "@/lib/roles"
import * as articleService from "@/services/article.service"
import * as clientService from "@/services/client.service"
import * as depotService from "@/services/depot.service"
import * as venteService from "@/services/vente.service"
import type { ApiArticle, ApiModePaiement } from "@/types/api"

type CartLine = { article: ApiArticle; qty: number }

const MODES: ApiModePaiement[] = [
  "ESPECES",
  "MOBILE_MONEY",
  "CARTE",
  "VIREMENT",
  "CHEQUE",
  "AUTRE",
]

function money(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

export function CaissePage() {
  const { user } = useAuth()
  const posId = user?.point_of_sale_id ?? ""

  const [registerOpen, setRegisterOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("ids.caisse.open") === "1"
    } catch {
      return false
    }
  })

  const [articles, setArticles] = useState<ApiArticle[]>([])
  const [articlePage, setArticlePage] = useState(1)
  const [articleTotal, setArticleTotal] = useState(0)
  const ARTICLE_PAGE_SIZE = 10
  const [clients, setClients] = useState<{ client_id: string; client_name: string }[]>([])
  const [depots, setDepots] = useState<{ depot_id: string; depot_name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedDepot, setSelectedDepot] = useState<string>("")
  const [mode, setMode] = useState<ApiModePaiement>("ESPECES")
  const [montantEncaisse, setMontantEncaisse] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [lastTicket, setLastTicket] = useState<string | null>(null)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false)
  const [confirmOpenRegister, setConfirmOpenRegister] = useState(false)

  const openRegister = useCallback(() => {
    try {
      sessionStorage.setItem("ids.caisse.open", "1")
    } catch {
      // ignore
    }
    setRegisterOpen(true)
  }, [])

  const closeRegister = useCallback(() => {
    try {
      sessionStorage.removeItem("ids.caisse.open")
    } catch {
      // ignore
    }
    setRegisterOpen(false)
    setCart([])
  }, [])

  useEffect(() => {
    if (!registerOpen) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [cls, dps] = await Promise.all([
          clientService.listClientOptions(),
          depotService.listDepotOptions(),
        ])
        if (cancelled) return
        setClients(cls.options.map((c) => ({ client_id: c.client_id, client_name: c.client_name })))
        setDepots(dps.options.map((d) => ({ depot_id: d.depot_id, depot_name: d.depot_name })))
        if (dps.options.length > 0) {
          setSelectedDepot((prev) => (prev ? prev : dps.options[0].depot_id))
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.details || err.message : "Chargement impossible.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [registerOpen])

  useEffect(() => {
    if (!registerOpen) return
    let cancelled = false
    async function loadArticles() {
      setLoading(true)
      try {
        const res = await articleService.listArticles({
          page: articlePage,
          limit: ARTICLE_PAGE_SIZE,
          is_publish: true,
        })
        if (cancelled) return
        setArticles(res.articles)
        setArticleTotal(res.meta.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.details || err.message : "Chargement impossible.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadArticles()
    return () => {
      cancelled = true
    }
  }, [registerOpen, articlePage])

  const addToCart = useCallback((article: ApiArticle) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.article.article_id === article.article_id)
      if (existing) {
        return prev.map((l) =>
          l.article.article_id === article.article_id ? { ...l, qty: l.qty + 1 } : l
        )
      }
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

  const totalTtc = useMemo(() => {
    return cart.reduce((sum, l) => sum + Number(l.article.article_sale_price_ttc) * l.qty, 0)
  }, [cart])

  const totalHt = useMemo(() => {
    return cart.reduce((sum, l) => sum + Number(l.article.article_sale_price_ht) * l.qty, 0)
  }, [cart])

  const handleCheckout = useCallback(async () => {
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
        mode_paiement: mode,
        montant_ttc: totalTtc,
        montant_encaisse: montantEncaisse ? Number(montantEncaisse) : totalTtc,
        lines: cart.map((l) => ({
          article_id: l.article.article_id,
          qty: l.qty,
          unit_price_ht: Number(l.article.article_sale_price_ht),
        })),
      }
      const { vente } = await venteService.createVenteComptant(payload)
      toast.success(`Vente ${vente.vente_code ?? ""} enregistrée`)
      // Build ticket HTML
      const ticket = [
        `TICKET DE CAISSE`,
        `Vente: ${vente.vente_code ?? vente.vente_id}`,
        `Date: ${new Date().toLocaleString()}`,
        `Caissier: ${user?.user_name ?? ""}`,
        ``,
        ...cart.map((l) => `${l.article.article_name} x${l.qty}  ${money(Number(l.article.article_sale_price_ttc) * l.qty)}`),
        ``,
        `Total HT: ${money(totalHt)}`,
        `Total TTC: ${money(totalTtc)}`,
        `Encaissé: ${money(montantEncaisse || totalTtc)}`,
        `Mode: ${mode}`,
        ``,
        `Merci de votre visite !`,
      ].join("\n")
      setLastTicket(ticket)
      // Print
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
    } catch (err) {
      toast.error("Vente impossible", {
        description: err instanceof ApiError ? err.details || err.message : "Erreur inattendue",
      })
    } finally {
      setSubmitting(false)
    }
  }, [cart, selectedClient, selectedDepot, posId, mode, totalTtc, totalHt, montantEncaisse, user])

  if (!registerOpen) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Ouverture de caisse</CardTitle>
            <CardDescription>
              {user ? `${user.user_name} · ${roleLabel(user.role)}` : "Caissier"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Cliquez pour ouvrir la caisse et commencer les ventes.
            </p>
            <AtomButton onClick={() => setConfirmOpenRegister(true)} iconLeft={ShoppingCartIcon}>
              Ouvrir la caisse
            </AtomButton>
          </CardContent>
        </Card>

        <MConfirmDialog
          open={confirmOpenRegister}
          onOpenChange={setConfirmOpenRegister}
          title="Ouvrir la caisse ?"
          description="La session de caisse sera ouverte et vous pourrez commencer les ventes."
          confirmLabel="Ouvrir la caisse"
          onConfirm={() => {
            setConfirmOpenRegister(false)
            openRegister()
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Caisse</h1>
          <p className="text-sm text-muted-foreground">
            {user?.user_name} · Caisse ouverte
          </p>
        </div>
        <div className="flex gap-2">
          {lastTicket ? (
            <AtomButton
              variant="outline"
              iconLeft={PrinterIcon}
              onClick={() => {
                const w = window.open("", "_blank", "width=400,height=600")
                if (w) {
                  w.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${lastTicket.replace(/</g, "&lt;")}</pre>`)
                  w.document.close()
                  w.focus()
                  w.print()
                }
              }}
            >
              Réimprimer
            </AtomButton>
          ) : null}
          <AtomButton variant="outline" onClick={() => setConfirmCloseOpen(true)}>
            Fermer la caisse
          </AtomButton>
        </div>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Produits</CardTitle>
            <CardDescription>Cliquez pour ajouter au panier.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {articles.map((a) => (
                  <button
                    key={a.article_id}
                    type="button"
                    onClick={() => addToCart(a)}
                    className="rounded-md border p-3 text-left text-sm hover:bg-muted"
                  >
                    <p className="font-medium truncate">{a.article_name}</p>
                    <p className="text-xs text-muted-foreground">{a.article_code}</p>
                    <p className="mt-1 font-semibold">{money(a.article_sale_price_ttc)} Ar</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <AtomButton
                  variant="outline"
                  size="sm"
                  disabled={articlePage <= 1}
                  onClick={() => setArticlePage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </AtomButton>
                <span className="text-sm text-muted-foreground">
                  Page {articlePage} / {Math.max(1, Math.ceil(articleTotal / ARTICLE_PAGE_SIZE))}
                </span>
                <AtomButton
                  variant="outline"
                  size="sm"
                  disabled={articlePage >= Math.ceil(articleTotal / ARTICLE_PAGE_SIZE)}
                  onClick={() => setArticlePage((p) => p + 1)}
                >
                  Suivant
                </AtomButton>
              </div>
              </>
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
                  <span className="w-20 text-right">{money(Number(l.article.article_sale_price_ttc) * l.qty)}</span>
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
              disabled={submitting || cart.length === 0}
              className="w-full"
            >
              {submitting ? "Enregistrement…" : "Valider et imprimer"}
            </AtomButton>
          </CardContent>
        </Card>
      </div>

      <MConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Fermer la caisse ?"
        description="La session de caisse sera clôturée et le panier en cours sera vidé. Cette action est irréversible."
        confirmLabel="Fermer la caisse"
        destructive
        onConfirm={() => {
          setConfirmCloseOpen(false)
          closeRegister()
        }}
      />

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
