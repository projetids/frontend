import { useCallback, useEffect, useState } from "react"
import {
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TruckIcon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  AtomBadge,
  AtomButton,
  AtomInput,
  AtomLabel,
  AtomTextarea,
} from "@/components/atoms"
import {
  MField,
  MPagination,
  MSelectField,
  MVenteDocumentDetails,
} from "@/components/molecules"
import {
  OCommandesVenteTable,
  OLivraisonsVenteTable,
  OVentesComptantTable,
  OVentesReportTable,
} from "@/components/organisms"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { hasFormErrors, useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { normalizeDecimal } from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import {
  bonLivraisonStatusLabel,
  clientVenteLabel,
  commandeVenteLabel,
  commandeVenteStatusLabel,
  depotVenteLabel,
  formatVenteDateTime,
  formatVenteMoney,
  formatVenteQuantity,
  modePaiementLabel,
  venteComptantStatusLabel,
  venteStatusBadgeVariant,
} from "@/lib/ventes"
import {
  decimalRule,
  maxLengthRule,
  requiredRule,
  UUID_REGEX,
  uuidRule,
} from "@/lib/validation"
import * as venteService from "@/services/vente.service"
import * as articleFamilyService from "@/services/article-family.service"
import * as articleService from "@/services/article.service"
import * as clientService from "@/services/client.service"
import * as depotService from "@/services/depot.service"
import type {
  ApiArticleFamily,
  ApiArticleOption,
  ApiBonLivraison,
  ApiClientOptionVente,
  ApiCommandeVente,
  ApiDepotOption,
  ApiModePaiement,
  ApiVenteComptant,
  ApiVenteReportRow,
  CreateBonLivraisonPayload,
  CreateCommandeVentePayload,
  CreateVenteComptantPayload,
} from "@/types/api"

const PAGE_SIZE = 10
const COMMANDE_FORM_ID = "vente-commande-form"
const LIVRAISON_FORM_ID = "vente-livraison-form"
const COMPTANT_FORM_ID = "vente-comptant-form"

type VentesTab = "commandes" | "livraisons" | "comptant" | "rapports"

/** Valeur sentinelle des selects optionnels (MSelectField n'accepte pas ""). */
const NONE_OPTION = "__none__"

/** Convertit une date de filtre (`YYYY-MM-DD`) en début de journée ISO. */
function startOfDayIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** Convertit une date de filtre (`YYYY-MM-DD`) en fin de journée ISO. */
function endOfDayIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** Quantité strictement positive (virgule ou point décimal). */
function positiveQuantityRule(
  message = "Quantité strictement positive requise (ex. 1 ou 2.5)."
): (value: unknown) => string | null {
  return (value) => {
    const text = typeof value === "string" ? value.trim().replace(",", ".") : ""
    if (!text) return "Ce champ est requis."
    const parsed = Number(text)
    return Number.isFinite(parsed) && parsed > 0 ? null : message
  }
}

// ============================================================================
// Formulaire : Nouvelle commande de vente
// ============================================================================

type CommandeVenteFormValues = {
  client_id: string
  point_of_sale_id: string
  notes: string
  article_id: string
  qty_ordered: string
  unit_price_ht: string
}

type CommandeVenteFormErrors = Partial<
  Record<keyof CommandeVenteFormValues, string>
>

function createEmptyCommandeVenteForm(): CommandeVenteFormValues {
  return {
    client_id: "",
    point_of_sale_id: "",
    notes: "",
    article_id: "",
    qty_ordered: "",
    unit_price_ht: "",
  }
}

function CommandeVenteForm({
  formId,
  showActions = true,
  values,
  errors,
  clients,
  articles,
  isSuperadmin,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  formId: string
  showActions?: boolean
  values: CommandeVenteFormValues
  errors: CommandeVenteFormErrors
  clients: ApiClientOptionVente[]
  articles: { article_id: string; article_name: string; article_code: string }[]
  isSuperadmin?: boolean
  submitting: boolean
  onChange: (patch: Partial<CommandeVenteFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const disabled = submitting
  const clientOptions = [
    { value: NONE_OPTION, label: "Aucun client" },
    ...clients.map((c) => ({
      value: c.client_id,
      label: `${c.client_name} · ${c.client_telephone ?? ""}`,
    })),
  ]
  const articleOptions = articles.map((a) => ({
    value: a.article_id,
    label: `${a.article_name} · ${a.article_code}`,
  }))

  return (
    <form
      id={formId}
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Nouvelle commande de vente</h4>
          <p className="text-xs text-muted-foreground">
            Bon de commande (BCV) : engagement client, aucun impact stock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Client"
            value={values.client_id || NONE_OPTION}
            onValueChange={(value) =>
              onChange({ client_id: value === NONE_OPTION ? "" : value })
            }
            options={clientOptions}
            description="Optionnel : laisse la commande sans client identifié."
            error={errors.client_id}
            disabled={disabled}
            searchPlaceholder="Rechercher un client…"
          />
          {isSuperadmin ? (
            <MField
              label="Point de vente (UUID)"
              value={values.point_of_sale_id}
              error={errors.point_of_sale_id}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                onChange({ point_of_sale_id: event.target.value.trim() })
              }
              autoComplete="off"
              disabled={disabled}
              required
            />
          ) : null}
          <MSelectField
            label="Article"
            value={values.article_id}
            onValueChange={(value) => onChange({ article_id: value })}
            options={articleOptions}
            placeholder="Sélectionner un article…"
            error={errors.article_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un article…"
          />
          <MField
            label="Quantité commandée"
            value={values.qty_ordered}
            error={errors.qty_ordered}
            placeholder="0.000"
            inputMode="decimal"
            onChange={(event) => onChange({ qty_ordered: event.target.value })}
            autoComplete="off"
            disabled={disabled}
            required
          />
          <MField
            label="Prix unitaire HT"
            value={values.unit_price_ht}
            error={errors.unit_price_ht}
            placeholder="0"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ unit_price_ht: event.target.value })
            }
            autoComplete="off"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor="commandeVenteNotes">Notes</AtomLabel>
          <AtomTextarea
            id="commandeVenteNotes"
            rows={2}
            value={values.notes}
            placeholder="Instructions, conditions de livraison…"
            onChange={(event) => onChange({ notes: event.target.value })}
            disabled={disabled}
          />
          {errors.notes ? (
            <p className="text-xs text-destructive">{errors.notes}</p>
          ) : null}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2 pt-4">
        {showActions ? (
          <>
            <AtomButton
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Annuler
            </AtomButton>
            <AtomButton type="submit" disabled={disabled}>
              {submitting ? "Enregistrement…" : "Créer la commande"}
            </AtomButton>
          </>
        ) : null}
      </div>
    </form>
  )
}

// ============================================================================
// Formulaire : Nouveau bon de livraison
// ============================================================================

type BonLivraisonFormValues = {
  commande_id: string
  client_id: string
  depot_id: string
  point_of_sale_id: string
  notes: string
  article_id: string
  qty_delivered: string
  commande_ligne_id: string
  unit_price_ht: string
}

type BonLivraisonFormErrors = Partial<
  Record<keyof BonLivraisonFormValues, string>
>

function createEmptyBonLivraisonForm(): BonLivraisonFormValues {
  return {
    commande_id: "",
    client_id: "",
    depot_id: "",
    point_of_sale_id: "",
    notes: "",
    article_id: "",
    qty_delivered: "",
    commande_ligne_id: "",
    unit_price_ht: "",
  }
}

function BonLivraisonForm({
  formId,
  showActions = true,
  values,
  errors,
  clients,
  depots,
  articles,
  commandes,
  isSuperadmin,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  formId: string
  showActions?: boolean
  values: BonLivraisonFormValues
  errors: BonLivraisonFormErrors
  clients: ApiClientOptionVente[]
  depots: ApiDepotOption[]
  articles: { article_id: string; article_name: string; article_code: string }[]
  commandes: ApiCommandeVente[]
  isSuperadmin?: boolean
  submitting: boolean
  onChange: (patch: Partial<BonLivraisonFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const disabled = submitting
  const clientOptions = [
    { value: NONE_OPTION, label: "Aucun client" },
    ...clients.map((c) => ({
      value: c.client_id,
      label: `${c.client_name} · ${c.client_telephone ?? ""}`,
    })),
  ]
  const depotOptions = depots.map((d) => ({
    value: d.depot_id,
    label: `${d.depot_name} · ${d.depot_code}`,
  }))
  const articleOptions = articles.map((a) => ({
    value: a.article_id,
    label: `${a.article_name} · ${a.article_code}`,
  }))
  const commandeOptions = [
    { value: NONE_OPTION, label: "Aucune commande source" },
    ...commandes.map((c) => ({
      value: c.commande_id,
      label: `${c.commande_code} (${
        c.client_id
          ? clients.find((x) => x.client_id === c.client_id)?.client_name
          : "—"
      })`,
    })),
  ]

  return (
    <form
      id={formId}
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Nouveau bon de livraison</h4>
          <p className="text-xs text-muted-foreground">
            Sortie stock du dépôt source. Impact stock immédiat.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Commande source"
            value={values.commande_id || NONE_OPTION}
            onValueChange={(value) =>
              onChange({ commande_id: value === NONE_OPTION ? "" : value })
            }
            options={commandeOptions}
            description="Optionnel : rattache la livraison à une commande."
            error={errors.commande_id}
            disabled={disabled}
            searchPlaceholder="Rechercher une commande…"
          />
          <MSelectField
            label="Client"
            value={values.client_id || NONE_OPTION}
            onValueChange={(value) =>
              onChange({ client_id: value === NONE_OPTION ? "" : value })
            }
            options={clientOptions}
            description="Optionnel : laisse la livraison sans client identifié."
            error={errors.client_id}
            disabled={disabled}
            searchPlaceholder="Rechercher un client…"
          />
          <MSelectField
            label="Dépôt source"
            value={values.depot_id}
            onValueChange={(value) => onChange({ depot_id: value })}
            options={depotOptions}
            placeholder="Sélectionner un dépôt…"
            error={errors.depot_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un dépôt…"
          />
          {isSuperadmin ? (
            <MField
              label="Point de vente (UUID)"
              value={values.point_of_sale_id}
              error={errors.point_of_sale_id}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                onChange({ point_of_sale_id: event.target.value.trim() })
              }
              autoComplete="off"
              disabled={disabled}
              required
            />
          ) : null}
          <MSelectField
            label="Article"
            value={values.article_id}
            onValueChange={(value) => onChange({ article_id: value })}
            options={articleOptions}
            placeholder="Sélectionner un article…"
            error={errors.article_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un article…"
          />
          <MField
            label="Quantité livrée"
            value={values.qty_delivered}
            error={errors.qty_delivered}
            placeholder="0.000"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ qty_delivered: event.target.value })
            }
            autoComplete="off"
            disabled={disabled}
            required
          />
          <MField
            label="Prix unitaire HT"
            value={values.unit_price_ht}
            error={errors.unit_price_ht}
            placeholder="0"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ unit_price_ht: event.target.value })
            }
            autoComplete="off"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor="livraisonVenteNotes">Notes</AtomLabel>
          <AtomTextarea
            id="livraisonVenteNotes"
            rows={2}
            value={values.notes}
            placeholder="Instructions de livraison…"
            onChange={(event) => onChange({ notes: event.target.value })}
            disabled={disabled}
          />
          {errors.notes ? (
            <p className="text-xs text-destructive">{errors.notes}</p>
          ) : null}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2 pt-4">
        {showActions ? (
          <>
            <AtomButton
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Annuler
            </AtomButton>
            <AtomButton type="submit" disabled={disabled}>
              {submitting ? "Enregistrement…" : "Créer la livraison"}
            </AtomButton>
          </>
        ) : null}
      </div>
    </form>
  )
}
// ============================================================================
// Formulaire : Nouvelle vente au comptant
// ============================================================================

type VenteComptantFormValues = {
  client_id: string
  depot_id: string
  point_of_sale_id: string
  mode_paiement: ApiModePaiement
  montant_ttc: string
  montant_encaisse: string
  notes: string
  article_id: string
  qty: string
  unit_price_ht: string
}

type VenteComptantFormErrors = Partial<
  Record<keyof VenteComptantFormValues, string>
>

function createEmptyVenteComptantForm(): VenteComptantFormValues {
  return {
    client_id: "",
    depot_id: "",
    point_of_sale_id: "",
    mode_paiement: "ESPECES",
    montant_ttc: "",
    montant_encaisse: "",
    notes: "",
    article_id: "",
    qty: "",
    unit_price_ht: "",
  }
}

const MODE_PAIEMENT_OPTIONS: { value: ApiModePaiement; label: string }[] = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARTE", label: "Carte bancaire" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "AUTRE", label: "Autre" },
]
function VenteComptantForm({
  formId,
  showActions = true,
  values,
  errors,
  clients,
  depots,
  articles,
  isSuperadmin,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  formId: string
  showActions?: boolean
  values: VenteComptantFormValues
  errors: VenteComptantFormErrors
  clients: ApiClientOptionVente[]
  depots: ApiDepotOption[]
  articles: { article_id: string; article_name: string; article_code: string }[]
  isSuperadmin?: boolean
  submitting: boolean
  onChange: (patch: Partial<VenteComptantFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const disabled = submitting
  const clientOptions = [
    { value: NONE_OPTION, label: "Aucun client" },
    ...clients.map((c) => ({
      value: c.client_id,
      label: `${c.client_name} · ${c.client_telephone ?? ""}`,
    })),
  ]
  const depotOptions = depots.map((d) => ({
    value: d.depot_id,
    label: `${d.depot_name} · ${d.depot_code}`,
  }))
  const articleOptions = articles.map((a) => ({
    value: a.article_id,
    label: `${a.article_name} · ${a.article_code}`,
  }))

  return (
    <form
      id={formId}
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <section className="grid gap-4">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-medium">Nouvelle vente au comptant</h4>
          <p className="text-xs text-muted-foreground">
            Encaissement + sortie stock à validation (BL implicite).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MSelectField
            label="Client"
            value={values.client_id || NONE_OPTION}
            onValueChange={(value) =>
              onChange({ client_id: value === NONE_OPTION ? "" : value })
            }
            options={clientOptions}
            description="Optionnel : vente sans client identifié."
            error={errors.client_id}
            disabled={disabled}
            searchPlaceholder="Rechercher un client…"
          />
          <MSelectField
            label="Dépôt source"
            value={values.depot_id}
            onValueChange={(value) => onChange({ depot_id: value })}
            options={depotOptions}
            placeholder="Sélectionner un dépôt…"
            error={errors.depot_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un dépôt…"
          />
          <MSelectField
            label="Mode de paiement"
            value={values.mode_paiement}
            onValueChange={(value) =>
              onChange({ mode_paiement: value as ApiModePaiement })
            }
            options={MODE_PAIEMENT_OPTIONS}
            error={errors.mode_paiement}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un mode de paiement…"
          />
          {isSuperadmin ? (
            <MField
              label="Point de vente (UUID)"
              value={values.point_of_sale_id}
              error={errors.point_of_sale_id}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                onChange({ point_of_sale_id: event.target.value.trim() })
              }
              autoComplete="off"
              disabled={disabled}
              required
            />
          ) : null}
          <MSelectField
            label="Article"
            value={values.article_id}
            onValueChange={(value) => onChange({ article_id: value })}
            options={articleOptions}
            placeholder="Sélectionner un article…"
            error={errors.article_id}
            disabled={disabled}
            required
            searchPlaceholder="Rechercher un article…"
          />
          <MField
            label="Quantité vendue"
            value={values.qty}
            error={errors.qty}
            placeholder="0.000"
            inputMode="decimal"
            onChange={(event) => onChange({ qty: event.target.value })}
            autoComplete="off"
            disabled={disabled}
            required
          />
          <MField
            label="Prix unitaire HT"
            value={values.unit_price_ht}
            error={errors.unit_price_ht}
            placeholder="0"
            inputMode="decimal"
            onChange={(event) =>
              onChange({ unit_price_ht: event.target.value })
            }
            autoComplete="off"
            disabled={disabled}
          />
          <MField
            label="Montant TTC (Ariary)"
            type="number"
            value={values.montant_ttc}
            error={errors.montant_ttc}
            placeholder="0"
            onChange={(event) => onChange({ montant_ttc: event.target.value })}
            disabled={disabled}
            required
          />
          <MField
            label="Montant encaissé (Ariary)"
            type="number"
            value={values.montant_encaisse}
            error={errors.montant_encaisse}
            placeholder="0"
            onChange={(event) =>
              onChange({ montant_encaisse: event.target.value })
            }
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1.5">
          <AtomLabel htmlFor="venteComptantNotes">Notes</AtomLabel>
          <AtomTextarea
            id="venteComptantNotes"
            rows={2}
            value={values.notes}
            placeholder="Informations de paiement…"
            onChange={(event) => onChange({ notes: event.target.value })}
            disabled={disabled}
          />
          {errors.notes ? (
            <p className="text-xs text-destructive">{errors.notes}</p>
          ) : null}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2 pt-4">
        {showActions ? (
          <>
            <AtomButton
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Annuler
            </AtomButton>
            <AtomButton type="submit" disabled={disabled}>
              {submitting ? "Enregistrement…" : "Valider la vente"}
            </AtomButton>
          </>
        ) : null}
      </div>
    </form>
  )
}
// ============================================================================
// Page principale
// ============================================================================

export default function VentesPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"
  const pointOfSaleId = user?.point_of_sale_id ?? undefined

  const [activeTab, setActiveTab] = useState<VentesTab>("commandes")

  // ——— Référentiels (sélecteurs et libellés) ———
  const [clients, setClients] = useState<ApiClientOptionVente[]>([])
  const [depots, setDepots] = useState<ApiDepotOption[]>([])
  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [families, setFamilies] = useState<ApiArticleFamily[]>([])
  const [commandeOptions, setCommandeOptions] = useState<ApiCommandeVente[]>([])

  // ——— Filtres ———
  const [clientFilter, setClientFilter] = useState("all")
  const [posFilter, setPosFilter] = useState("")
  const [appliedPosFilter, setAppliedPosFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [familyFilter, setFamilyFilter] = useState("all")

  // ——— Commandes ———
  const [commandes, setCommandes] = useState<ApiCommandeVente[]>([])
  const [commandesPage, setCommandesPage] = useState(1)
  const [commandesTotal, setCommandesTotal] = useState(0)
  const [commandesLoading, setCommandesLoading] = useState(false)
  const [commandesError, setCommandesError] = useState<string | null>(null)

  // ——— Livraisons ———
  const [livraisons, setLivraisons] = useState<ApiBonLivraison[]>([])
  const [livraisonsPage, setLivraisonsPage] = useState(1)
  const [livraisonsTotal, setLivraisonsTotal] = useState(0)
  const [livraisonsLoading, setLivraisonsLoading] = useState(false)
  const [livraisonsError, setLivraisonsError] = useState<string | null>(null)

  // ——— Ventes comptant ———
  const [ventesComptant, setVentesComptant] = useState<ApiVenteComptant[]>([])
  const [ventesComptantPage, setVentesComptantPage] = useState(1)
  const [ventesComptantTotal, setVentesComptantTotal] = useState(0)
  const [ventesComptantLoading, setVentesComptantLoading] = useState(false)
  const [ventesComptantError, setVentesComptantError] = useState<string | null>(
    null
  )

  // ——— Rapports ———
  const [reportParArticle, setReportParArticle] = useState<ApiVenteReportRow[]>(
    []
  )
  const [reportParFamille, setReportParFamille] = useState<ApiVenteReportRow[]>(
    []
  )
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // ——— Détails ———
  const [viewingCommande, setViewingCommande] =
    useState<ApiCommandeVente | null>(null)
  const [commandeDetailLoading, setCommandeDetailLoading] = useState(false)
  const [viewingLivraison, setViewingLivraison] =
    useState<ApiBonLivraison | null>(null)
  const [livraisonDetailLoading, setLivraisonDetailLoading] = useState(false)
  const [viewingVente, setViewingVente] = useState<ApiVenteComptant | null>(
    null
  )
  const [venteDetailLoading, setVenteDetailLoading] = useState(false)

  // ——— Modales de création ———
  const [createCommandeOpen, setCreateCommandeOpen] = useState(false)
  const [commandeSaving, setCommandeSaving] = useState(false)
  const commandeForm = useFormValidation<CommandeVenteFormValues>({
    initialValues: createEmptyCommandeVenteForm,
    rules: {
      article_id: requiredRule("L'article est requis."),
      qty_ordered: positiveQuantityRule(),
      unit_price_ht: decimalRule(),
      notes: maxLengthRule(1000),
      ...(isSuperadmin
        ? {
            point_of_sale_id: [
              requiredRule("Le point de vente est requis."),
              uuidRule(),
            ],
          }
        : {}),
    },
  })

  const [createLivraisonOpen, setCreateLivraisonOpen] = useState(false)
  const [livraisonSaving, setLivraisonSaving] = useState(false)
  const livraisonForm = useFormValidation<BonLivraisonFormValues>({
    initialValues: createEmptyBonLivraisonForm,
    rules: {
      depot_id: requiredRule("Le dépôt source est requis."),
      article_id: requiredRule("L'article est requis."),
      qty_delivered: positiveQuantityRule(),
      unit_price_ht: decimalRule(),
      notes: maxLengthRule(1000),
      ...(isSuperadmin
        ? {
            point_of_sale_id: [
              requiredRule("Le point de vente est requis."),
              uuidRule(),
            ],
          }
        : {}),
    },
  })

  const [createVenteComptantOpen, setCreateVenteComptantOpen] = useState(false)
  const [venteComptantSaving, setVenteComptantSaving] = useState(false)
  const venteComptantForm = useFormValidation<VenteComptantFormValues>({
    initialValues: createEmptyVenteComptantForm,
    rules: {
      depot_id: requiredRule("Le dépôt source est requis."),
      article_id: requiredRule("L'article est requis."),
      qty: positiveQuantityRule(),
      unit_price_ht: decimalRule(),
      montant_ttc: [
        requiredRule("Le montant TTC est requis."),
        decimalRule("Montant TTC positif attendu."),
      ],
      montant_encaisse: decimalRule("Montant encaissé positif attendu."),
      notes: maxLengthRule(1000),
      ...(isSuperadmin
        ? {
            point_of_sale_id: [
              requiredRule("Le point de vente est requis."),
              uuidRule(),
            ],
          }
        : {}),
    },
  })

  // ——— Chargement des référentiels ———
  useEffect(() => {
    let cancelled = false

    async function load() {
      const results = await Promise.allSettled([
        clientService.listClientOptions(),
        depotService.listDepotOptions(),
        articleService.listArticleOptions(),
        articleFamilyService.listArticleFamilyOptions(),
        venteService.listCommandesVente({ limit: 100 }),
      ])
      if (cancelled) return

      const [clientsRes, depotsRes, articlesRes, familiesRes, commandesRes] =
        results

      setClients(
        clientsRes.status === "fulfilled" ? clientsRes.value.options : []
      )
      setDepots(depotsRes.status === "fulfilled" ? depotsRes.value.options : [])
      setArticles(
        articlesRes.status === "fulfilled" ? articlesRes.value.options : []
      )
      setFamilies(
        familiesRes.status === "fulfilled" ? familiesRes.value.options : []
      )
      setCommandeOptions(
        commandesRes.status === "fulfilled" ? commandesRes.value.commandes : []
      )

      if (results.some((result) => result.status === "rejected")) {
        const rejected = results.find((result) => result.status === "rejected")
        const reason = rejected?.status === "rejected" ? rejected.reason : null
        toast.error(
          reason instanceof ApiError
            ? reason.message
            : "Erreur de chargement des référentiels"
        )
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Recherche différée du POS pour éviter un appel API à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedPosFilter(posFilter.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [posFilter])

  const invalidPosFilter =
    isSuperadmin &&
    appliedPosFilter.length > 0 &&
    !UUID_REGEX.test(appliedPosFilter)
  const posFilterError = invalidPosFilter
    ? "Identifiant de point de vente invalide (UUID attendu)."
    : null

  // ——— Commandes ———
  const loadCommandes = useCallback(async () => {
    if (invalidPosFilter) {
      setCommandes([])
      setCommandesTotal(0)
      setCommandesError(posFilterError)
      setCommandesLoading(false)
      return
    }

    setCommandesLoading(true)
    try {
      const response = await venteService.listCommandesVente({
        page: commandesPage,
        limit: PAGE_SIZE,
        client_id: clientFilter === "all" ? undefined : clientFilter,
        point_of_sale_id: isSuperadmin
          ? appliedPosFilter || undefined
          : pointOfSaleId,
      })
      setCommandes(response.commandes)
      setCommandesTotal(response.meta.total)
      setCommandesError(null)
    } catch (error) {
      setCommandes([])
      setCommandesTotal(0)
      setCommandesError(
        error instanceof ApiError
          ? error.details || error.message
          : "Impossible de charger les commandes de vente."
      )
    } finally {
      setCommandesLoading(false)
    }
  }, [
    appliedPosFilter,
    clientFilter,
    commandesPage,
    invalidPosFilter,
    isSuperadmin,
    pointOfSaleId,
    posFilterError,
  ])

  useEffect(() => {
    async function load() {
      await loadCommandes()
    }
    void load()
  }, [loadCommandes])

  // ——— Livraisons ———
  const loadLivraisons = useCallback(async () => {
    if (invalidPosFilter) {
      setLivraisons([])
      setLivraisonsTotal(0)
      setLivraisonsError(posFilterError)
      setLivraisonsLoading(false)
      return
    }

    setLivraisonsLoading(true)
    try {
      const response = await venteService.listBonsLivraison({
        page: livraisonsPage,
        limit: PAGE_SIZE,
        client_id: clientFilter === "all" ? undefined : clientFilter,
        point_of_sale_id: isSuperadmin
          ? appliedPosFilter || undefined
          : pointOfSaleId,
      })
      setLivraisons(response.livraisons)
      setLivraisonsTotal(response.meta.total)
      setLivraisonsError(null)
    } catch (error) {
      setLivraisons([])
      setLivraisonsTotal(0)
      setLivraisonsError(
        error instanceof ApiError
          ? error.details || error.message
          : "Impossible de charger les bons de livraison."
      )
    } finally {
      setLivraisonsLoading(false)
    }
  }, [
    appliedPosFilter,
    clientFilter,
    invalidPosFilter,
    isSuperadmin,
    livraisonsPage,
    pointOfSaleId,
    posFilterError,
  ])

  useEffect(() => {
    async function load() {
      await loadLivraisons()
    }
    void load()
  }, [loadLivraisons])

  // ——— Ventes comptant ———
  const loadVentesComptant = useCallback(async () => {
    if (invalidPosFilter) {
      setVentesComptant([])
      setVentesComptantTotal(0)
      setVentesComptantError(posFilterError)
      setVentesComptantLoading(false)
      return
    }

    setVentesComptantLoading(true)
    try {
      const response = await venteService.listVentesComptant({
        page: ventesComptantPage,
        limit: PAGE_SIZE,
        client_id: clientFilter === "all" ? undefined : clientFilter,
        point_of_sale_id: isSuperadmin
          ? appliedPosFilter || undefined
          : pointOfSaleId,
      })
      setVentesComptant(response.ventes)
      setVentesComptantTotal(response.meta.total)
      setVentesComptantError(null)
    } catch (error) {
      setVentesComptant([])
      setVentesComptantTotal(0)
      setVentesComptantError(
        error instanceof ApiError
          ? error.details || error.message
          : "Impossible de charger les ventes au comptant."
      )
    } finally {
      setVentesComptantLoading(false)
    }
  }, [
    appliedPosFilter,
    clientFilter,
    invalidPosFilter,
    isSuperadmin,
    pointOfSaleId,
    posFilterError,
    ventesComptantPage,
  ])

  useEffect(() => {
    async function load() {
      await loadVentesComptant()
    }
    void load()
  }, [loadVentesComptant])

  // ——— Rapports ———
  const loadReports = useCallback(async () => {
    if (invalidPosFilter) {
      setReportParArticle([])
      setReportParFamille([])
      setReportError(posFilterError)
      setReportLoading(false)
      return
    }

    setReportLoading(true)
    try {
      const query = {
        date_from: startOfDayIso(dateFrom),
        date_to: endOfDayIso(dateTo),
        article_families_id: familyFilter === "all" ? undefined : familyFilter,
        point_of_sale_id: isSuperadmin
          ? appliedPosFilter || undefined
          : pointOfSaleId,
      }
      const [articleRes, familleRes] = await Promise.all([
        venteService.reportParArticle(query),
        venteService.reportParFamille(query),
      ])
      setReportParArticle(articleRes.rows)
      setReportParFamille(familleRes.rows)
      setReportError(null)
    } catch (error) {
      setReportParArticle([])
      setReportParFamille([])
      setReportError(
        error instanceof ApiError
          ? error.details || error.message
          : "Impossible de charger les rapports."
      )
    } finally {
      setReportLoading(false)
    }
  }, [
    appliedPosFilter,
    dateFrom,
    dateTo,
    familyFilter,
    invalidPosFilter,
    isSuperadmin,
    pointOfSaleId,
    posFilterError,
  ])

  useEffect(() => {
    async function load() {
      await loadReports()
    }
    void load()
  }, [loadReports])

  // ——— Détails ———
  async function openCommandeDetails(commande: ApiCommandeVente) {
    setViewingCommande(commande)
    setCommandeDetailLoading(true)
    try {
      const { commande: detail } = await venteService.getCommandeVente(
        commande.commande_id
      )
      setViewingCommande(detail)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger le détail de la commande"
      )
    } finally {
      setCommandeDetailLoading(false)
    }
  }

  async function openLivraisonDetails(livraison: ApiBonLivraison) {
    setViewingLivraison(livraison)
    setLivraisonDetailLoading(true)
    try {
      const { livraison: detail } = await venteService.getBonLivraison(
        livraison.livraison_id
      )
      setViewingLivraison(detail)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger le détail de la livraison"
      )
    } finally {
      setLivraisonDetailLoading(false)
    }
  }

  async function openVenteDetails(vente: ApiVenteComptant) {
    setViewingVente(vente)
    setVenteDetailLoading(true)
    try {
      const { vente: detail } = await venteService.getVenteComptant(
        vente.vente_id
      )
      setViewingVente(detail)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger le détail de la vente"
      )
    } finally {
      setVenteDetailLoading(false)
    }
  }

  // ——— Création ———
  async function refreshCommandeOptions() {
    try {
      const response = await venteService.listCommandesVente({ limit: 100 })
      setCommandeOptions(response.commandes)
    } catch {
      // Silencieux : le sélecteur conserve la liste précédente.
    }
  }

  const handleCreateCommande = async () => {
    const errors = commandeForm.validate()
    if (hasFormErrors(errors)) {
      commandeForm.setErrors(errors)
      return
    }
    setCommandeSaving(true)
    try {
      const payload: CreateCommandeVentePayload = {
        client_id: commandeForm.values.client_id || undefined,
        point_of_sale_id: isSuperadmin
          ? commandeForm.values.point_of_sale_id || undefined
          : pointOfSaleId,
        notes: commandeForm.values.notes || undefined,
        lines: [
          {
            article_id: commandeForm.values.article_id,
            qty_ordered: Number(
              normalizeDecimal(commandeForm.values.qty_ordered)
            ),
            unit_price_ht: commandeForm.values.unit_price_ht.trim()
              ? Number(normalizeDecimal(commandeForm.values.unit_price_ht))
              : undefined,
          },
        ],
      }
      await venteService.createCommandeVente(payload)
      setCreateCommandeOpen(false)
      commandeForm.reset()
      void loadCommandes()
      void refreshCommandeOptions()
      toast.success("Commande créée avec succès")
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erreur création commande"
      )
    } finally {
      setCommandeSaving(false)
    }
  }

  const handleCreateLivraison = async () => {
    const errors = livraisonForm.validate()
    if (hasFormErrors(errors)) {
      livraisonForm.setErrors(errors)
      return
    }
    setLivraisonSaving(true)
    try {
      const payload: CreateBonLivraisonPayload = {
        commande_id: livraisonForm.values.commande_id || undefined,
        client_id: livraisonForm.values.client_id || undefined,
        depot_id: livraisonForm.values.depot_id,
        point_of_sale_id: isSuperadmin
          ? livraisonForm.values.point_of_sale_id || undefined
          : pointOfSaleId,
        notes: livraisonForm.values.notes || undefined,
        lines: [
          {
            article_id: livraisonForm.values.article_id,
            qty_delivered: Number(
              normalizeDecimal(livraisonForm.values.qty_delivered)
            ),
            commande_ligne_id:
              livraisonForm.values.commande_ligne_id || undefined,
            unit_price_ht: livraisonForm.values.unit_price_ht.trim()
              ? Number(normalizeDecimal(livraisonForm.values.unit_price_ht))
              : undefined,
          },
        ],
      }
      await venteService.createBonLivraison(payload)
      setCreateLivraisonOpen(false)
      livraisonForm.reset()
      void loadLivraisons()
      toast.success("Livraison créée avec succès")
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Erreur création livraison"
      )
    } finally {
      setLivraisonSaving(false)
    }
  }

  const handleCreateVenteComptant = async () => {
    const errors = venteComptantForm.validate()
    if (hasFormErrors(errors)) {
      venteComptantForm.setErrors(errors)
      return
    }
    setVenteComptantSaving(true)
    try {
      const payload: CreateVenteComptantPayload = {
        client_id: venteComptantForm.values.client_id || undefined,
        depot_id: venteComptantForm.values.depot_id,
        point_of_sale_id: isSuperadmin
          ? venteComptantForm.values.point_of_sale_id || undefined
          : pointOfSaleId,
        mode_paiement: venteComptantForm.values.mode_paiement,
        montant_ttc: Number(
          normalizeDecimal(venteComptantForm.values.montant_ttc)
        ),
        montant_encaisse: venteComptantForm.values.montant_encaisse.trim()
          ? Number(normalizeDecimal(venteComptantForm.values.montant_encaisse))
          : undefined,
        notes: venteComptantForm.values.notes || undefined,
        lines: [
          {
            article_id: venteComptantForm.values.article_id,
            qty: Number(normalizeDecimal(venteComptantForm.values.qty)),
            unit_price_ht: venteComptantForm.values.unit_price_ht.trim()
              ? Number(normalizeDecimal(venteComptantForm.values.unit_price_ht))
              : undefined,
          },
        ],
      }
      await venteService.createVenteComptant(payload)
      setCreateVenteComptantOpen(false)
      venteComptantForm.reset()
      void loadVentesComptant()
      toast.success("Vente au comptant créée avec succès")
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Erreur création vente comptant"
      )
    } finally {
      setVenteComptantSaving(false)
    }
  }

  // ——— Barre d'outils ———
  function refreshCurrent() {
    if (activeTab === "commandes") void loadCommandes()
    else if (activeTab === "livraisons") void loadLivraisons()
    else if (activeTab === "comptant") void loadVentesComptant()
    else void loadReports()
  }

  function resetFilters() {
    setClientFilter("all")
    setPosFilter("")
    setAppliedPosFilter("")
    setDateFrom("")
    setDateTo("")
    setFamilyFilter("all")
    setCommandesPage(1)
    setLivraisonsPage(1)
    setVentesComptantPage(1)
  }

  const tabItems = [
    {
      key: "commandes" as const,
      label: "Commandes",
      icon: ClipboardListIcon,
    },
    { key: "livraisons" as const, label: "Livraisons", icon: TruckIcon },
    { key: "comptant" as const, label: "Ventes comptant", icon: WalletIcon },
    {
      key: "rapports" as const,
      label: "Rapports",
      icon: ChartNoAxesCombinedIcon,
    },
  ]

  const countLabel =
    activeTab === "commandes"
      ? `${commandesTotal} commande${commandesTotal > 1 ? "s" : ""}`
      : activeTab === "livraisons"
        ? `${livraisonsTotal} livraison${livraisonsTotal > 1 ? "s" : ""}`
        : activeTab === "comptant"
          ? `${ventesComptantTotal} vente${ventesComptantTotal > 1 ? "s" : ""}`
          : `${reportParArticle.length} ligne${reportParArticle.length > 1 ? "s" : ""}`

  const currentLoading =
    activeTab === "commandes"
      ? commandesLoading
      : activeTab === "livraisons"
        ? livraisonsLoading
        : activeTab === "comptant"
          ? ventesComptantLoading
          : reportLoading

  // ============================================================================
  // Rendu
  // ============================================================================

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Création d'une commande */}
      <Dialog
        open={createCommandeOpen}
        onOpenChange={(open) => {
          if (!open && !commandeSaving) setCreateCommandeOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardListIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvelle commande de vente</DialogTitle>
              <DialogDescription>
                Le bon de commande (BCV) engage le client sans modifier le
                stock. Le code est généré automatiquement.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <CommandeVenteForm
              formId={COMMANDE_FORM_ID}
              showActions={false}
              values={commandeForm.values}
              errors={commandeForm.errors}
              clients={clients}
              articles={articles}
              isSuperadmin={isSuperadmin}
              submitting={commandeSaving}
              onChange={commandeForm.setValues}
              onSubmit={() => void handleCreateCommande()}
              onCancel={() => setCreateCommandeOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setCreateCommandeOpen(false)}
              disabled={commandeSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={COMMANDE_FORM_ID}
              disabled={commandeSaving}
            >
              {commandeSaving ? "Enregistrement…" : "Créer la commande"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Création d'une livraison */}
      <Dialog
        open={createLivraisonOpen}
        onOpenChange={(open) => {
          if (!open && !livraisonSaving) setCreateLivraisonOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TruckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouveau bon de livraison</DialogTitle>
              <DialogDescription>
                Chaque ligne livrée crée une sortie de stock sur le dépôt
                source. Une livraison partielle met à jour la commande liée.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <BonLivraisonForm
              formId={LIVRAISON_FORM_ID}
              showActions={false}
              values={livraisonForm.values}
              errors={livraisonForm.errors}
              clients={clients}
              depots={depots}
              articles={articles}
              commandes={commandeOptions}
              isSuperadmin={isSuperadmin}
              submitting={livraisonSaving}
              onChange={livraisonForm.setValues}
              onSubmit={() => void handleCreateLivraison()}
              onCancel={() => setCreateLivraisonOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setCreateLivraisonOpen(false)}
              disabled={livraisonSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={LIVRAISON_FORM_ID}
              disabled={livraisonSaving}
            >
              {livraisonSaving ? "Enregistrement…" : "Créer la livraison"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Création d'une vente au comptant */}
      <Dialog
        open={createVenteComptantOpen}
        onOpenChange={(open) => {
          if (!open && !venteComptantSaving) setCreateVenteComptantOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <WalletIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvelle vente au comptant</DialogTitle>
              <DialogDescription>
                L&apos;encaissement et la sortie de stock sont appliqués à la
                validation (bon de livraison implicite).
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <VenteComptantForm
              formId={COMPTANT_FORM_ID}
              showActions={false}
              values={venteComptantForm.values}
              errors={venteComptantForm.errors}
              clients={clients}
              depots={depots}
              articles={articles}
              isSuperadmin={isSuperadmin}
              submitting={venteComptantSaving}
              onChange={venteComptantForm.setValues}
              onSubmit={() => void handleCreateVenteComptant()}
              onCancel={() => setCreateVenteComptantOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setCreateVenteComptantOpen(false)}
              disabled={venteComptantSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={COMPTANT_FORM_ID}
              disabled={venteComptantSaving}
            >
              {venteComptantSaving ? "Enregistrement…" : "Valider la vente"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail d'une commande */}
      <Dialog
        open={viewingCommande !== null}
        onOpenChange={(open) => {
          if (!open) setViewingCommande(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardListIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de la commande</DialogTitle>
              <DialogDescription>
                {viewingCommande?.commande_code ?? "Commande de vente"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {commandeDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewingCommande ? (
              <MVenteDocumentDetails
                fields={[
                  { label: "Code", value: viewingCommande.commande_code },
                  {
                    label: "Client",
                    value: clientVenteLabel(clients, viewingCommande.client_id),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={venteStatusBadgeVariant(
                          viewingCommande.status
                        )}
                      >
                        {commandeVenteStatusLabel(viewingCommande.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Créée le",
                    value: formatVenteDateTime(viewingCommande.created_at),
                  },
                  {
                    label: "Notes",
                    value: viewingCommande.notes?.trim() || "—",
                  },
                  ...(isSuperadmin
                    ? [
                        {
                          label: "Point de vente",
                          value: (
                            <span className="font-mono text-xs">
                              {viewingCommande.point_of_sale_id}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                lines={(viewingCommande.lignes ?? []).map((line) => ({
                  key: line.ligne_id,
                  article_id: line.article_id,
                  qty: line.qty_ordered,
                  unit_price_ht: line.unit_price_ht,
                  note: `Livré : ${formatVenteQuantity(line.qty_delivered)}`,
                }))}
                articles={articles}
                qtyLabel="Quantité commandée"
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setViewingCommande(null)}
            >
              Fermer
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail d'une livraison */}
      <Dialog
        open={viewingLivraison !== null}
        onOpenChange={(open) => {
          if (!open) setViewingLivraison(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TruckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de la livraison</DialogTitle>
              <DialogDescription>
                {viewingLivraison?.livraison_code ?? "Bon de livraison"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {livraisonDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewingLivraison ? (
              <MVenteDocumentDetails
                fields={[
                  { label: "Code", value: viewingLivraison.livraison_code },
                  {
                    label: "Commande",
                    value: commandeVenteLabel(
                      commandeOptions,
                      viewingLivraison.commande_id
                    ),
                  },
                  {
                    label: "Client",
                    value: clientVenteLabel(
                      clients,
                      viewingLivraison.client_id
                    ),
                  },
                  {
                    label: "Dépôt source",
                    value: depotVenteLabel(depots, viewingLivraison.depot_id),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={venteStatusBadgeVariant(
                          viewingLivraison.status
                        )}
                      >
                        {bonLivraisonStatusLabel(viewingLivraison.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Créée le",
                    value: formatVenteDateTime(viewingLivraison.created_at),
                  },
                  {
                    label: "Notes",
                    value: viewingLivraison.notes?.trim() || "—",
                  },
                  ...(isSuperadmin
                    ? [
                        {
                          label: "Point de vente",
                          value: (
                            <span className="font-mono text-xs">
                              {viewingLivraison.point_of_sale_id}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                lines={(viewingLivraison.lignes ?? []).map((line) => ({
                  key: line.ligne_id,
                  article_id: line.article_id,
                  qty: line.qty_delivered,
                  unit_price_ht: line.unit_price_ht,
                  note: line.commande_ligne_id
                    ? "Ligne de commande liée"
                    : undefined,
                }))}
                articles={articles}
                qtyLabel="Quantité livrée"
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setViewingLivraison(null)}
            >
              Fermer
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail d'une vente au comptant */}
      <Dialog
        open={viewingVente !== null}
        onOpenChange={(open) => {
          if (!open) setViewingVente(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <WalletIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de la vente</DialogTitle>
              <DialogDescription>
                {viewingVente?.vente_code ?? "Vente au comptant"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {venteDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewingVente ? (
              <MVenteDocumentDetails
                fields={[
                  { label: "Code", value: viewingVente.vente_code },
                  {
                    label: "Client",
                    value: clientVenteLabel(clients, viewingVente.client_id),
                  },
                  {
                    label: "Dépôt source",
                    value: depotVenteLabel(depots, viewingVente.depot_id),
                  },
                  {
                    label: "Mode de paiement",
                    value: modePaiementLabel(viewingVente.mode_paiement),
                  },
                  {
                    label: "Montant TTC",
                    value: formatVenteMoney(viewingVente.montant_ttc),
                  },
                  {
                    label: "Montant encaissé",
                    value: formatVenteMoney(viewingVente.montant_encaisse),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={venteStatusBadgeVariant(viewingVente.status)}
                      >
                        {venteComptantStatusLabel(viewingVente.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Créée le",
                    value: formatVenteDateTime(viewingVente.created_at),
                  },
                  {
                    label: "Notes",
                    value: viewingVente.notes?.trim() || "—",
                  },
                  ...(isSuperadmin
                    ? [
                        {
                          label: "Point de vente",
                          value: (
                            <span className="font-mono text-xs">
                              {viewingVente.point_of_sale_id}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                lines={(viewingVente.lignes ?? []).map((line) => ({
                  key: line.ligne_id,
                  article_id: line.article_id,
                  qty: line.qty,
                  unit_price_ht: line.unit_price_ht,
                }))}
                articles={articles}
                qtyLabel="Quantité vendue"
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewingVente(null)}>
              Fermer
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Ventes / Caisse
        </h1>
        <p className="text-muted-foreground">
          Passez les commandes clients, livrez les marchandises et encaissez les
          ventes au comptant. Les livraisons et les ventes validées sortent le
          stock du dépôt source ; les rapports agrègent uniquement les documents
          validés.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ventes et encaissements</CardTitle>
          <CardDescription>
            Commandes (BCV), livraisons (BL) et ventes au comptant (VC). Les
            rapports agrègent les livraisons validées et les ventes encaissées.
          </CardDescription>
          <CardAction>
            {activeTab === "commandes" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={() => setCreateCommandeOpen(true)}
                disabled={commandeSaving}
              >
                Nouvelle commande
              </AtomButton>
            ) : activeTab === "livraisons" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={() => setCreateLivraisonOpen(true)}
                disabled={livraisonSaving}
              >
                Nouvelle livraison
              </AtomButton>
            ) : activeTab === "comptant" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={() => setCreateVenteComptantOpen(true)}
                disabled={venteComptantSaving}
              >
                Nouvelle vente comptant
              </AtomButton>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Vues des ventes"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
            >
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    activeTab === tab.key
                      ? "inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
                      : "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  }
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <AtomBadge variant="secondary">{countLabel}</AtomBadge>
              <AtomButton
                size="sm"
                variant="ghost"
                iconLeft={RefreshCwIcon}
                onClick={refreshCurrent}
                disabled={currentLoading}
              >
                Actualiser
              </AtomButton>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {activeTab !== "rapports" ? (
              <Select
                value={clientFilter}
                onValueChange={(value) => {
                  setClientFilter(value)
                  setCommandesPage(1)
                  setLivraisonsPage(1)
                  setVentesComptantPage(1)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-60"
                  aria-label="Filtrer par client"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent searchPlaceholder="Rechercher un client…">
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <AtomInput
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  aria-label="Date de début"
                  title="Du"
                  className="w-40"
                />
                <AtomInput
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  aria-label="Date de fin"
                  title="Au"
                  className="w-40"
                />
                <Select value={familyFilter} onValueChange={setFamilyFilter}>
                  <SelectTrigger
                    size="sm"
                    className="w-56"
                    aria-label="Filtrer par famille"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent searchPlaceholder="Rechercher une famille…">
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
              </>
            )}

            {isSuperadmin ? (
              <AtomInput
                value={posFilter}
                onChange={(event) => setPosFilter(event.target.value)}
                placeholder="Filtrer par POS (UUID)"
                aria-label="Filtrer par point de vente"
                className="w-72"
              />
            ) : null}

            <AtomButton
              size="sm"
              variant="ghost"
              iconLeft={RotateCcwIcon}
              onClick={resetFilters}
            >
              Réinitialiser
            </AtomButton>
          </div>

          {activeTab === "commandes" ? (
            <>
              <OCommandesVenteTable
                commandes={commandes}
                clients={clients}
                loading={commandesLoading}
                error={commandesError}
                showPointOfSale={isSuperadmin}
                onView={(commande) => void openCommandeDetails(commande)}
                onRetry={() => void loadCommandes()}
              />
              <MPagination
                page={commandesPage}
                limit={PAGE_SIZE}
                total={commandesTotal}
                disabled={commandesLoading}
                onPageChange={setCommandesPage}
              />
            </>
          ) : activeTab === "livraisons" ? (
            <>
              <OLivraisonsVenteTable
                livraisons={livraisons}
                clients={clients}
                depots={depots}
                commandes={commandeOptions}
                loading={livraisonsLoading}
                error={livraisonsError}
                showPointOfSale={isSuperadmin}
                onView={(livraison) => void openLivraisonDetails(livraison)}
                onRetry={() => void loadLivraisons()}
              />
              <MPagination
                page={livraisonsPage}
                limit={PAGE_SIZE}
                total={livraisonsTotal}
                disabled={livraisonsLoading}
                onPageChange={setLivraisonsPage}
              />
            </>
          ) : activeTab === "comptant" ? (
            <>
              <OVentesComptantTable
                ventes={ventesComptant}
                clients={clients}
                depots={depots}
                loading={ventesComptantLoading}
                error={ventesComptantError}
                showPointOfSale={isSuperadmin}
                onView={(vente) => void openVenteDetails(vente)}
                onRetry={() => void loadVentesComptant()}
              />
              <MPagination
                page={ventesComptantPage}
                limit={PAGE_SIZE}
                total={ventesComptantTotal}
                disabled={ventesComptantLoading}
                onPageChange={setVentesComptantPage}
              />
            </>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <OVentesReportTable
                mode="article"
                rows={reportParArticle}
                families={families}
                loading={reportLoading}
                error={reportError}
                onRetry={() => void loadReports()}
              />
              <OVentesReportTable
                mode="famille"
                rows={reportParFamille}
                families={families}
                loading={reportLoading}
                error={reportError}
                onRetry={() => void loadReports()}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
