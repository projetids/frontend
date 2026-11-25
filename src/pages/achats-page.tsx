import { useEffect, useState } from "react"
import {
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  FileTextIcon,
  Loader2Icon,
  PackageCheckIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton, AtomInput } from "@/components/atoms"
import {
  MAchatDocumentDetails,
  MCommandeAchatForm,
  MFactureAchatForm,
  MPagination,
  MReceptionAchatForm,
  createAchatLine,
  createEmptyCommandeAchatForm,
  createEmptyFactureAchatForm,
  createEmptyReceptionAchatForm,
  type MAchatLineError,
  type MAchatLineValues,
  type MCommandeAchatFormErrors,
  type MCommandeAchatFormValues,
  type MFactureAchatFormErrors,
  type MFactureAchatFormValues,
  type MReceptionAchatFormErrors,
  type MReceptionAchatFormValues,
} from "@/components/molecules"
import {
  OAchatsReportTable,
  OCommandesAchatTable,
  OFacturesAchatTable,
  OReceptionsAchatTable,
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
import {
  achatStatusBadgeVariant,
  commandeAchatLabel,
  commandeAchatStatusLabel,
  depotAchatLabel,
  factureAchatStatusLabel,
  factureRapprochementLabel,
  formatAchatDate,
  formatAchatDateTime,
  formatAchatQuantity,
  receptionAchatStatusLabel,
  supplierAchatLabel,
} from "@/lib/achats"
import { isDecimalInput, normalizeDecimal } from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import { maxLengthRule, requiredRule, UUID_REGEX, uuidRule } from "@/lib/validation"
import * as achatService from "@/services/achat.service"
import * as articleFamilyService from "@/services/article-family.service"
import * as articleService from "@/services/article.service"
import * as depotService from "@/services/depot.service"
import * as supplierService from "@/services/supplier.service"
import type {
  AchatsReportQuery,
  ApiAchatReportRow,
  ApiArticleFamily,
  ApiArticleOption,
  ApiBonReception,
  ApiCommandeAchat,
  ApiDepotOption,
  ApiFactureAchat,
  ApiSupplier,
  CreateBonReceptionPayload,
  CreateCommandeAchatPayload,
  CreateFactureAchatPayload,
} from "@/types/api"

// Module Achats (API /achats) : commandes fournisseur (BCA, sans impact stock),
// réceptions (BR, ENTRÉE stock au dépôt), factures (FAA, financier) et rapports
// agrégés sur les factures validées. Les admins sont scopés à leur point de
// vente ; le superadmin voit tout et peut filtrer par POS.

const PAGE_SIZE = 10
const COMMANDE_FORM_ID = "achat-commande-form"
const RECEPTION_FORM_ID = "achat-reception-form"
const FACTURE_FORM_ID = "achat-facture-form"

type AchatsTab = "commandes" | "receptions" | "factures" | "rapports"

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

function withFallbackLines(lines: MAchatLineValues[]): MAchatLineValues[] {
  return lines.length > 0 ? lines : [createAchatLine()]
}

/** Valide les lignes communes aux trois documents d'achat. */
function validateAchatLines(
  lines: MAchatLineValues[]
): Record<number, MAchatLineError> {
  const lineErrors: Record<number, MAchatLineError> = {}
  const seen = new Set<string>()

  lines.forEach((line, index) => {
    const lineError: MAchatLineError = {}
    if (!line.article_id) {
      lineError.article_id = "L'article est requis."
    } else if (seen.has(line.article_id)) {
      lineError.article_id = "Cet article est déjà présent dans une autre ligne."
    } else {
      seen.add(line.article_id)
    }

    if (!isDecimalInput(line.qty)) {
      lineError.qty = "Quantité positive requise (ex. 10 ou 2.5)."
    } else if (Number(normalizeDecimal(line.qty)) <= 0) {
      lineError.qty = "La quantité doit être supérieure à 0."
    }

    if (line.unit_price_ht.trim() && !isDecimalInput(line.unit_price_ht)) {
      lineError.unit_price_ht = "Prix positif attendu (ex. 1500)."
    }

    if (Object.keys(lineError).length > 0) lineErrors[index] = lineError
  })

  return lineErrors
}

function buildReceptionLines(
  commande: ApiCommandeAchat
): MAchatLineValues[] {
  return withFallbackLines(
    (commande.lignes ?? []).map((line) => {
      const ordered = Number(line.qty_ordered)
      const received = Number(line.qty_received)
      const remaining = Math.max(0, ordered - received)
      return createAchatLine({
        article_id: line.article_id,
        qty: remaining > 0 ? String(remaining) : "",
        unit_price_ht: line.unit_price_ht,
        commande_ligne_id: line.ligne_id,
        hint: `Commandé : ${formatAchatQuantity(
          line.qty_ordered
        )} · Déjà reçu : ${formatAchatQuantity(
          line.qty_received
        )} · Reste : ${formatAchatQuantity(remaining)}`,
      })
    })
  )
}

function buildFactureLinesFromCommande(
  commande: ApiCommandeAchat
): MAchatLineValues[] {
  return withFallbackLines(
    (commande.lignes ?? []).map((line) =>
      createAchatLine({
        article_id: line.article_id,
        qty: line.qty_ordered,
        unit_price_ht: line.unit_price_ht,
        commande_ligne_id: line.ligne_id,
      })
    )
  )
}

function buildFactureLinesFromReception(
  reception: ApiBonReception
): MAchatLineValues[] {
  return withFallbackLines(
    (reception.lignes ?? []).map((line) =>
      createAchatLine({
        article_id: line.article_id,
        qty: line.qty_received,
        unit_price_ht: line.unit_price_ht,
        commande_ligne_id: line.commande_ligne_id ?? undefined,
      })
    )
  )
}

export function AchatsPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [tab, setTab] = useState<AchatsTab>("commandes")

  // Référentiels communs aux tableaux, filtres et formulaires.
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [articles, setArticles] = useState<ApiArticleOption[]>([])
  const [depots, setDepots] = useState<ApiDepotOption[]>([])
  const [families, setFamilies] = useState<ApiArticleFamily[]>([])
  const [commandeOptions, setCommandeOptions] = useState<ApiCommandeAchat[]>([])
  const [receptionOptions, setReceptionOptions] = useState<ApiBonReception[]>(
    []
  )
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsReloadKey, setOptionsReloadKey] = useState(0)

  // Filtres partagés.
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [posFilter, setPosFilter] = useState("")
  const [appliedPosFilter, setAppliedPosFilter] = useState("")

  // Commandes.
  const [commandes, setCommandes] = useState<ApiCommandeAchat[]>([])
  const [commandesTotal, setCommandesTotal] = useState(0)
  const [commandesPage, setCommandesPage] = useState(1)
  const [commandesLoading, setCommandesLoading] = useState(true)
  const [commandesError, setCommandesError] = useState<string | null>(null)
  const [commandesReloadKey, setCommandesReloadKey] = useState(0)

  // Réceptions.
  const [receptions, setReceptions] = useState<ApiBonReception[]>([])
  const [receptionsTotal, setReceptionsTotal] = useState(0)
  const [receptionsPage, setReceptionsPage] = useState(1)
  const [receptionsLoading, setReceptionsLoading] = useState(true)
  const [receptionsError, setReceptionsError] = useState<string | null>(null)
  const [receptionsReloadKey, setReceptionsReloadKey] = useState(0)

  // Factures.
  const [factures, setFactures] = useState<ApiFactureAchat[]>([])
  const [facturesTotal, setFacturesTotal] = useState(0)
  const [facturesPage, setFacturesPage] = useState(1)
  const [facturesLoading, setFacturesLoading] = useState(true)
  const [facturesError, setFacturesError] = useState<string | null>(null)
  const [facturesReloadKey, setFacturesReloadKey] = useState(0)

  // Rapports.
  const [reportArticleRows, setReportArticleRows] = useState<
    ApiAchatReportRow[]
  >([])
  const [reportFamilyRows, setReportFamilyRows] = useState<ApiAchatReportRow[]>(
    []
  )
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportReloadKey, setReportReloadKey] = useState(0)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [familyFilter, setFamilyFilter] = useState("all")

  // Modales de création.
  const [commandeOpen, setCommandeOpen] = useState(false)
  const [commandeSaving, setCommandeSaving] = useState(false)
  const [receptionOpen, setReceptionOpen] = useState(false)
  const [receptionSaving, setReceptionSaving] = useState(false)
  const [factureOpen, setFactureOpen] = useState(false)
  const [factureSaving, setFactureSaving] = useState(false)

  // Modales de détail.
  const [viewingCommande, setViewingCommande] = useState<ApiCommandeAchat | null>(
    null
  )
  const [commandeDetailLoading, setCommandeDetailLoading] = useState(false)
  const [viewingReception, setViewingReception] =
    useState<ApiBonReception | null>(null)
  const [receptionDetailLoading, setReceptionDetailLoading] = useState(false)
  const [viewingFacture, setViewingFacture] = useState<ApiFactureAchat | null>(
    null
  )
  const [factureDetailLoading, setFactureDetailLoading] = useState(false)

  function initialCommandeValues(): MCommandeAchatFormValues {
    return {
      ...createEmptyCommandeAchatForm(),
      point_of_sale_id:
        isSuperadmin && UUID_REGEX.test(appliedPosFilter)
          ? appliedPosFilter
          : "",
    }
  }

  function initialReceptionValues(): MReceptionAchatFormValues {
    return {
      ...createEmptyReceptionAchatForm(),
      point_of_sale_id:
        isSuperadmin && UUID_REGEX.test(appliedPosFilter)
          ? appliedPosFilter
          : "",
      depot_id: depots.length === 1 ? depots[0].depot_id : "",
    }
  }

  function initialFactureValues(): MFactureAchatFormValues {
    return {
      ...createEmptyFactureAchatForm(),
      point_of_sale_id:
        isSuperadmin && UUID_REGEX.test(appliedPosFilter)
          ? appliedPosFilter
          : "",
    }
  }

  const commandeForm = useFormValidation<MCommandeAchatFormValues>({
    initialValues: () => initialCommandeValues(),
    rules: {
      supplier_id: requiredRule("Le fournisseur est requis."),
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

  const receptionForm = useFormValidation<MReceptionAchatFormValues>({
    initialValues: () => initialReceptionValues(),
    rules: {
      supplier_id: requiredRule("Le fournisseur est requis."),
      depot_id: requiredRule("Le dépôt de réception est requis."),
      commande_id: uuidRule(),
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

  const factureForm = useFormValidation<MFactureAchatFormValues>({
    initialValues: () => initialFactureValues(),
    rules: {
      supplier_id: requiredRule("Le fournisseur est requis."),
      commande_id: uuidRule(),
      reception_id: uuidRule(),
      supplier_invoice_ref: maxLengthRule(120),
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

  // Référentiels : fournisseurs, articles, dépôts, familles et documents
  // existants (pour les sélecteurs de rapprochement).
  useEffect(() => {
    let cancelled = false

    async function load() {
      setOptionsLoading(true)
      const results = await Promise.allSettled([
        supplierService.listSuppliers({ limit: 100 }),
        articleService.listArticleOptions(),
        depotService.listDepotOptions(),
        articleFamilyService.listArticleFamilyOptions(),
        achatService.listCommandes({ limit: 100 }),
        achatService.listReceptions({ limit: 100 }),
      ])
      if (cancelled) return

      const [
        suppliersResult,
        articlesResult,
        depotsResult,
        familiesResult,
        commandesResult,
        receptionsResult,
      ] = results

      setSuppliers(
        suppliersResult.status === "fulfilled"
          ? suppliersResult.value.suppliers
          : []
      )
      setArticles(
        articlesResult.status === "fulfilled"
          ? articlesResult.value.options
          : []
      )
      setDepots(
        depotsResult.status === "fulfilled" ? depotsResult.value.options : []
      )
      setFamilies(
        familiesResult.status === "fulfilled"
          ? familiesResult.value.options
          : []
      )
      setCommandeOptions(
        commandesResult.status === "fulfilled"
          ? commandesResult.value.commandes
          : []
      )
      setReceptionOptions(
        receptionsResult.status === "fulfilled"
          ? receptionsResult.value.receptions
          : []
      )

      setOptionsError(
        results.some((result) => result.status === "rejected")
          ? "Impossible de charger une partie des référentiels. Certains libellés seront remplacés par leurs identifiants."
          : null
      )
      setOptionsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [optionsReloadKey])

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

  useEffect(() => {
    if (tab !== "commandes") return
    let cancelled = false

    async function load() {
      if (invalidPosFilter) {
        setCommandes([])
        setCommandesTotal(0)
        setCommandesError(posFilterError)
        setCommandesLoading(false)
        return
      }

      setCommandesLoading(true)
      try {
        const response = await achatService.listCommandes({
          page: commandesPage,
          limit: PAGE_SIZE,
          supplier_id: supplierFilter === "all" ? undefined : supplierFilter,
          point_of_sale_id: isSuperadmin
            ? appliedPosFilter || undefined
            : undefined,
        })
        if (cancelled) return
        setCommandes(response.commandes)
        setCommandesTotal(response.meta.total)
        setCommandesError(null)
      } catch (err) {
        if (cancelled) return
        setCommandes([])
        setCommandesTotal(0)
        setCommandesError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les commandes d'achat."
        )
      } finally {
        if (!cancelled) setCommandesLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    tab,
    commandesPage,
    supplierFilter,
    appliedPosFilter,
    isSuperadmin,
    invalidPosFilter,
    posFilterError,
    commandesReloadKey,
  ])

  useEffect(() => {
    if (tab !== "receptions") return
    let cancelled = false

    async function load() {
      if (invalidPosFilter) {
        setReceptions([])
        setReceptionsTotal(0)
        setReceptionsError(posFilterError)
        setReceptionsLoading(false)
        return
      }

      setReceptionsLoading(true)
      try {
        const response = await achatService.listReceptions({
          page: receptionsPage,
          limit: PAGE_SIZE,
          supplier_id: supplierFilter === "all" ? undefined : supplierFilter,
          point_of_sale_id: isSuperadmin
            ? appliedPosFilter || undefined
            : undefined,
        })
        if (cancelled) return
        setReceptions(response.receptions)
        setReceptionsTotal(response.meta.total)
        setReceptionsError(null)
      } catch (err) {
        if (cancelled) return
        setReceptions([])
        setReceptionsTotal(0)
        setReceptionsError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les réceptions d'achat."
        )
      } finally {
        if (!cancelled) setReceptionsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    tab,
    receptionsPage,
    supplierFilter,
    appliedPosFilter,
    isSuperadmin,
    invalidPosFilter,
    posFilterError,
    receptionsReloadKey,
  ])

  useEffect(() => {
    if (tab !== "factures") return
    let cancelled = false

    async function load() {
      if (invalidPosFilter) {
        setFactures([])
        setFacturesTotal(0)
        setFacturesError(posFilterError)
        setFacturesLoading(false)
        return
      }

      setFacturesLoading(true)
      try {
        const response = await achatService.listFactures({
          page: facturesPage,
          limit: PAGE_SIZE,
          supplier_id: supplierFilter === "all" ? undefined : supplierFilter,
          point_of_sale_id: isSuperadmin
            ? appliedPosFilter || undefined
            : undefined,
        })
        if (cancelled) return
        setFactures(response.factures)
        setFacturesTotal(response.meta.total)
        setFacturesError(null)
      } catch (err) {
        if (cancelled) return
        setFactures([])
        setFacturesTotal(0)
        setFacturesError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les factures d'achat."
        )
      } finally {
        if (!cancelled) setFacturesLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    tab,
    facturesPage,
    supplierFilter,
    appliedPosFilter,
    isSuperadmin,
    invalidPosFilter,
    posFilterError,
    facturesReloadKey,
  ])

  useEffect(() => {
    if (tab !== "rapports") return
    let cancelled = false

    async function load() {
      if (invalidPosFilter) {
        setReportArticleRows([])
        setReportFamilyRows([])
        setReportError(posFilterError)
        setReportLoading(false)
        return
      }

      setReportLoading(true)
      const query: AchatsReportQuery = {
        date_from: startOfDayIso(dateFrom),
        date_to: endOfDayIso(dateTo),
        point_of_sale_id: isSuperadmin
          ? appliedPosFilter || undefined
          : undefined,
        article_families_id:
          familyFilter === "all" ? undefined : Number(familyFilter),
      }

      const [articleResult, familyResult] = await Promise.allSettled([
        achatService.reportParArticle(query),
        achatService.reportParFamille(query),
      ])
      if (cancelled) return

      setReportArticleRows(
        articleResult.status === "fulfilled" ? articleResult.value.rows : []
      )
      setReportFamilyRows(
        familyResult.status === "fulfilled" ? familyResult.value.rows : []
      )

      if (
        articleResult.status === "rejected" ||
        familyResult.status === "rejected"
      ) {
        const error =
          articleResult.status === "rejected"
            ? articleResult.reason
            : familyResult.status === "rejected"
              ? familyResult.reason
              : null
        setReportError(
          error instanceof ApiError
            ? error.details || error.message
            : "Impossible de charger les rapports d'achat."
        )
      } else {
        setReportError(null)
      }
      setReportLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    tab,
    dateFrom,
    dateTo,
    familyFilter,
    appliedPosFilter,
    isSuperadmin,
    invalidPosFilter,
    posFilterError,
    reportReloadKey,
  ])

  function showAchatError(err: unknown, title: string) {
    toast.error(title, {
      description:
        err instanceof ApiError
          ? err.details || err.message
          : "Erreur inattendue",
    })
  }

  function openCommandeForm() {
    commandeForm.reset(initialCommandeValues())
    setCommandeOpen(true)
  }

  function openReceptionForm() {
    receptionForm.reset(initialReceptionValues())
    setReceptionOpen(true)
  }

  function openFactureForm() {
    factureForm.reset(initialFactureValues())
    setFactureOpen(true)
  }

  function validateCommande(): MCommandeAchatFormErrors {
    const errors: MCommandeAchatFormErrors = { ...commandeForm.validate() }
    if (commandeForm.values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne à la commande."
    }
    const lineErrors = validateAchatLines(commandeForm.values.lines)
    if (Object.keys(lineErrors).length > 0) {
      errors.lineErrors = lineErrors
      errors.lines ??= "Corrigez les lignes signalées en rouge."
    }
    commandeForm.setErrors(errors)
    return errors
  }

  function validateReception(): MReceptionAchatFormErrors {
    const errors: MReceptionAchatFormErrors = { ...receptionForm.validate() }
    if (receptionForm.values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne à la réception."
    }
    const lineErrors = validateAchatLines(receptionForm.values.lines)
    if (Object.keys(lineErrors).length > 0) {
      errors.lineErrors = lineErrors
      errors.lines ??= "Corrigez les lignes signalées en rouge."
    }
    receptionForm.setErrors(errors)
    return errors
  }

  function validateFacture(): MFactureAchatFormErrors {
    const errors: MFactureAchatFormErrors = { ...factureForm.validate() }
    if (factureForm.values.lines.length === 0) {
      errors.lines = "Ajoutez au moins une ligne à la facture."
    }
    const lineErrors = validateAchatLines(factureForm.values.lines)
    if (Object.keys(lineErrors).length > 0) {
      errors.lineErrors = lineErrors
      errors.lines ??= "Corrigez les lignes signalées en rouge."
    }
    factureForm.setErrors(errors)
    return errors
  }

  async function handleCreateCommande() {
    const nextErrors = validateCommande()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = commandeForm.values
    const payload: CreateCommandeAchatPayload = {
      supplier_id: values.supplier_id,
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
      ...(values.expected_date ? { expected_date: values.expected_date } : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty_ordered: Number(normalizeDecimal(line.qty)),
        ...(line.unit_price_ht.trim()
          ? { unit_price_ht: Number(normalizeDecimal(line.unit_price_ht)) }
          : {}),
      })),
    }

    setCommandeSaving(true)
    try {
      const { envelope } = await achatService.createCommande(payload)
      toast.success(envelope.message)
      setCommandeOpen(false)
      commandeForm.reset(initialCommandeValues())
      setCommandesPage(1)
      setCommandesReloadKey((key) => key + 1)
      setOptionsReloadKey((key) => key + 1)
      setTab("commandes")
    } catch (err) {
      showAchatError(err, "Création impossible")
    } finally {
      setCommandeSaving(false)
    }
  }

  async function handleCreateReception() {
    const nextErrors = validateReception()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = receptionForm.values
    const payload: CreateBonReceptionPayload = {
      supplier_id: values.supplier_id,
      depot_id: values.depot_id,
      ...(values.commande_id ? { commande_id: values.commande_id } : {}),
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty_received: Number(normalizeDecimal(line.qty)),
        ...(line.commande_ligne_id
          ? { commande_ligne_id: line.commande_ligne_id }
          : {}),
        ...(line.unit_price_ht.trim()
          ? { unit_price_ht: Number(normalizeDecimal(line.unit_price_ht)) }
          : {}),
      })),
    }

    setReceptionSaving(true)
    try {
      const { envelope } = await achatService.createReception(payload)
      toast.success(envelope.message)
      setReceptionOpen(false)
      receptionForm.reset(initialReceptionValues())
      setReceptionsPage(1)
      setReceptionsReloadKey((key) => key + 1)
      setOptionsReloadKey((key) => key + 1)
      setTab("receptions")
    } catch (err) {
      showAchatError(err, "Réception impossible")
    } finally {
      setReceptionSaving(false)
    }
  }

  async function handleCreateFacture() {
    const nextErrors = validateFacture()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    const values = factureForm.values
    const payload: CreateFactureAchatPayload = {
      supplier_id: values.supplier_id,
      ...(values.commande_id ? { commande_id: values.commande_id } : {}),
      ...(values.reception_id ? { reception_id: values.reception_id } : {}),
      ...(values.supplier_invoice_ref.trim()
        ? { supplier_invoice_ref: values.supplier_invoice_ref.trim() }
        : {}),
      ...(values.invoice_date ? { invoice_date: values.invoice_date } : {}),
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      lines: values.lines.map((line) => ({
        article_id: line.article_id,
        qty: Number(normalizeDecimal(line.qty)),
        ...(line.unit_price_ht.trim()
          ? { unit_price_ht: Number(normalizeDecimal(line.unit_price_ht)) }
          : {}),
      })),
    }

    setFactureSaving(true)
    try {
      const { envelope } = await achatService.createFacture(payload)
      toast.success(envelope.message)
      setFactureOpen(false)
      factureForm.reset(initialFactureValues())
      setFacturesPage(1)
      setFacturesReloadKey((key) => key + 1)
      setOptionsReloadKey((key) => key + 1)
      setTab("factures")
    } catch (err) {
      showAchatError(err, "Création impossible")
    } finally {
      setFactureSaving(false)
    }
  }

  async function handleReceptionCommandeChange(commande_id: string) {
    if (!commande_id) {
      receptionForm.setValues({
        commande_id: "",
        lines: [createAchatLine()],
      })
      return
    }

    try {
      const { commande } = await achatService.getCommande(commande_id)
      receptionForm.setValues({
        commande_id,
        supplier_id: commande.supplier_id,
        lines: buildReceptionLines(commande),
      })
    } catch (err) {
      showAchatError(err, "Commande introuvable")
    }
  }

  async function handleFactureCommandeChange(commande_id: string) {
    if (!commande_id) {
      factureForm.setValues({
        commande_id: "",
        lines: [createAchatLine()],
      })
      return
    }

    try {
      const { commande } = await achatService.getCommande(commande_id)
      factureForm.setValues({
        commande_id,
        reception_id: "",
        supplier_id: commande.supplier_id,
        lines: buildFactureLinesFromCommande(commande),
      })
    } catch (err) {
      showAchatError(err, "Commande introuvable")
    }
  }

  async function handleFactureReceptionChange(reception_id: string) {
    if (!reception_id) {
      factureForm.setValues({
        reception_id: "",
        lines: [createAchatLine()],
      })
      return
    }

    try {
      const { reception } = await achatService.getReception(reception_id)
      factureForm.setValues({
        reception_id,
        commande_id: reception.commande_id ?? "",
        supplier_id: reception.supplier_id,
        lines: buildFactureLinesFromReception(reception),
      })
    } catch (err) {
      showAchatError(err, "Réception introuvable")
    }
  }

  async function openCommandeDetails(commande: ApiCommandeAchat) {
    setViewingCommande(commande)
    setCommandeDetailLoading(true)
    try {
      const { commande: fresh } = await achatService.getCommande(
        commande.commande_id
      )
      setViewingCommande(fresh)
    } catch (err) {
      showAchatError(err, "Chargement impossible")
    } finally {
      setCommandeDetailLoading(false)
    }
  }

  async function openReceptionDetails(reception: ApiBonReception) {
    setViewingReception(reception)
    setReceptionDetailLoading(true)
    try {
      const { reception: fresh } = await achatService.getReception(
        reception.reception_id
      )
      setViewingReception(fresh)
    } catch (err) {
      showAchatError(err, "Chargement impossible")
    } finally {
      setReceptionDetailLoading(false)
    }
  }

  async function openFactureDetails(facture: ApiFactureAchat) {
    setViewingFacture(facture)
    setFactureDetailLoading(true)
    try {
      const { facture: fresh } = await achatService.getFacture(
        facture.facture_id
      )
      setViewingFacture(fresh)
    } catch (err) {
      showAchatError(err, "Chargement impossible")
    } finally {
      setFactureDetailLoading(false)
    }
  }

  function resetFilters() {
    setSupplierFilter("all")
    setPosFilter("")
    setAppliedPosFilter("")
    setDateFrom("")
    setDateTo("")
    setFamilyFilter("all")
    setCommandesPage(1)
    setReceptionsPage(1)
    setFacturesPage(1)
  }

  function refreshCurrent() {
    if (tab === "commandes") {
      setCommandesReloadKey((key) => key + 1)
    } else if (tab === "receptions") {
      setReceptionsReloadKey((key) => key + 1)
    } else if (tab === "factures") {
      setFacturesReloadKey((key) => key + 1)
    } else {
      setReportReloadKey((key) => key + 1)
    }
  }

  const countLabel =
    tab === "commandes"
      ? `${commandesTotal} commande${commandesTotal > 1 ? "s" : ""}`
      : tab === "receptions"
        ? `${receptionsTotal} réception${receptionsTotal > 1 ? "s" : ""}`
        : tab === "factures"
          ? `${facturesTotal} facture${facturesTotal > 1 ? "s" : ""}`
          : `${reportArticleRows.length} article${
              reportArticleRows.length > 1 ? "s" : ""
            }`

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* Création d'une commande */}
      <Dialog
        open={commandeOpen}
        onOpenChange={(open) => {
          if (!open && !commandeSaving) setCommandeOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardListIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvelle commande achat</DialogTitle>
              <DialogDescription>
                Le bon de commande engage le fournisseur sans modifier le stock.
                Le code est généré automatiquement.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MCommandeAchatForm
              formId={COMMANDE_FORM_ID}
              showActions={false}
              values={commandeForm.values}
              errors={commandeForm.errors}
              suppliers={suppliers}
              articles={articles}
              isSuperadmin={isSuperadmin}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={commandeSaving}
              onChange={commandeForm.setValues}
              onSubmit={() => void handleCreateCommande()}
              onCancel={() => setCommandeOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setCommandeOpen(false)}
              disabled={commandeSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={COMMANDE_FORM_ID}
              disabled={commandeSaving || optionsLoading}
            >
              {commandeSaving ? "Enregistrement…" : "Créer la commande"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Création d'une réception */}
      <Dialog
        open={receptionOpen}
        onOpenChange={(open) => {
          if (!open && !receptionSaving) setReceptionOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageCheckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvelle réception achat</DialogTitle>
              <DialogDescription>
                Chaque ligne reçue crée une entrée de stock dans le dépôt choisi.
                Une réception partielle met à jour la commande source.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MReceptionAchatForm
              formId={RECEPTION_FORM_ID}
              showActions={false}
              values={receptionForm.values}
              errors={receptionForm.errors}
              suppliers={suppliers}
              articles={articles}
              depots={depots}
              commandes={commandeOptions}
              isSuperadmin={isSuperadmin}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={receptionSaving}
              onChange={receptionForm.setValues}
              onCommandeChange={(commande_id) =>
                void handleReceptionCommandeChange(commande_id)
              }
              onSubmit={() => void handleCreateReception()}
              onCancel={() => setReceptionOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setReceptionOpen(false)}
              disabled={receptionSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={RECEPTION_FORM_ID}
              disabled={receptionSaving || optionsLoading}
            >
              {receptionSaving ? "Enregistrement…" : "Valider la réception"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Création d'une facture */}
      <Dialog
        open={factureOpen}
        onOpenChange={(open) => {
          if (!open && !factureSaving) setFactureOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Nouvelle facture d&apos;achat</DialogTitle>
              <DialogDescription>
                Document financier sans impact stock, rapprochable d&apos;une
                commande et/ou d&apos;une réception.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <MFactureAchatForm
              formId={FACTURE_FORM_ID}
              showActions={false}
              values={factureForm.values}
              errors={factureForm.errors}
              suppliers={suppliers}
              articles={articles}
              commandes={commandeOptions}
              receptions={receptionOptions}
              isSuperadmin={isSuperadmin}
              optionsLoading={optionsLoading}
              optionsError={optionsError}
              submitting={factureSaving}
              onChange={factureForm.setValues}
              onCommandeChange={(commande_id) =>
                void handleFactureCommandeChange(commande_id)
              }
              onReceptionChange={(reception_id) =>
                void handleFactureReceptionChange(reception_id)
              }
              onSubmit={() => void handleCreateFacture()}
              onCancel={() => setFactureOpen(false)}
            />
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setFactureOpen(false)}
              disabled={factureSaving}
            >
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={FACTURE_FORM_ID}
              disabled={factureSaving || optionsLoading}
            >
              {factureSaving ? "Enregistrement…" : "Créer la facture"}
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
                {viewingCommande?.commande_code ?? "Commande achat"}
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
              <MAchatDocumentDetails
                fields={[
                  {
                    label: "Code",
                    value: viewingCommande.commande_code,
                  },
                  {
                    label: "Fournisseur",
                    value: supplierAchatLabel(
                      suppliers,
                      viewingCommande.supplier_id
                    ),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={achatStatusBadgeVariant(
                          viewingCommande.status
                        )}
                      >
                        {commandeAchatStatusLabel(viewingCommande.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Livraison prévue",
                    value: formatAchatDate(viewingCommande.expected_date),
                  },
                  {
                    label: "Créée le",
                    value: formatAchatDateTime(viewingCommande.created_at),
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
                  note: `Reçu : ${formatAchatQuantity(line.qty_received)}`,
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

      {/* Détail d'une réception */}
      <Dialog
        open={viewingReception !== null}
        onOpenChange={(open) => {
          if (!open) setViewingReception(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageCheckIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de la réception</DialogTitle>
              <DialogDescription>
                {viewingReception?.reception_code ?? "Bon de réception"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {receptionDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewingReception ? (
              <MAchatDocumentDetails
                fields={[
                  {
                    label: "Code",
                    value: viewingReception.reception_code,
                  },
                  {
                    label: "Fournisseur",
                    value: supplierAchatLabel(
                      suppliers,
                      viewingReception.supplier_id
                    ),
                  },
                  {
                    label: "Dépôt",
                    value: depotAchatLabel(depots, viewingReception.depot_id),
                  },
                  {
                    label: "Commande",
                    value: commandeAchatLabel(
                      commandeOptions,
                      viewingReception.commande_id
                    ),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={achatStatusBadgeVariant(
                          viewingReception.status
                        )}
                      >
                        {receptionAchatStatusLabel(viewingReception.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Reçue le",
                    value: formatAchatDateTime(viewingReception.created_at),
                  },
                  {
                    label: "Notes",
                    value: viewingReception.notes?.trim() || "—",
                  },
                  ...(isSuperadmin
                    ? [
                        {
                          label: "Point de vente",
                          value: (
                            <span className="font-mono text-xs">
                              {viewingReception.point_of_sale_id}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                lines={(viewingReception.lignes ?? []).map((line) => ({
                  key: line.ligne_id,
                  article_id: line.article_id,
                  qty: line.qty_received,
                  unit_price_ht: line.unit_price_ht,
                  note: line.commande_ligne_id
                    ? "Ligne de commande liée"
                    : undefined,
                }))}
                articles={articles}
                qtyLabel="Quantité reçue"
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setViewingReception(null)}
            >
              Fermer
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail d'une facture */}
      <Dialog
        open={viewingFacture !== null}
        onOpenChange={(open) => {
          if (!open) setViewingFacture(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détail de la facture</DialogTitle>
              <DialogDescription>
                {viewingFacture?.facture_code ?? "Facture d'achat"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {factureDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement du détail…
              </div>
            ) : viewingFacture ? (
              <MAchatDocumentDetails
                fields={[
                  {
                    label: "Code",
                    value: viewingFacture.facture_code,
                  },
                  {
                    label: "Fournisseur",
                    value: supplierAchatLabel(
                      suppliers,
                      viewingFacture.supplier_id
                    ),
                  },
                  {
                    label: "Réf. fournisseur",
                    value: viewingFacture.supplier_invoice_ref?.trim() || "—",
                  },
                  {
                    label: "Rapprochement",
                    value: factureRapprochementLabel(
                      viewingFacture,
                      commandeOptions,
                      receptionOptions
                    ),
                  },
                  {
                    label: "Statut",
                    value: (
                      <AtomBadge
                        variant={achatStatusBadgeVariant(
                          viewingFacture.status
                        )}
                      >
                        {factureAchatStatusLabel(viewingFacture.status)}
                      </AtomBadge>
                    ),
                  },
                  {
                    label: "Date facture",
                    value: formatAchatDate(viewingFacture.invoice_date),
                  },
                  {
                    label: "Créée le",
                    value: formatAchatDateTime(viewingFacture.created_at),
                  },
                  {
                    label: "Notes",
                    value: viewingFacture.notes?.trim() || "—",
                  },
                  ...(isSuperadmin
                    ? [
                        {
                          label: "Point de vente",
                          value: (
                            <span className="font-mono text-xs">
                              {viewingFacture.point_of_sale_id}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                lines={(viewingFacture.lignes ?? []).map((line) => ({
                  key: line.ligne_id,
                  article_id: line.article_id,
                  qty: line.qty,
                  unit_price_ht: line.unit_price_ht,
                }))}
                articles={articles}
                qtyLabel="Quantité facturée"
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton
              variant="outline"
              onClick={() => setViewingFacture(null)}
            >
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
        <h1 className="text-3xl font-semibold tracking-tight">Achats</h1>
        <p className="text-muted-foreground">
          Passez les commandes fournisseur, réceptionnez les livraisons et
          enregistrez les factures. Les réceptions alimentent le stock du dépôt
          dans une transaction ; les factures restent purement financières.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Achats fournisseurs</CardTitle>
          <CardDescription>
            Commandes (BCA), réceptions (BR) et factures (FAA). Les rapports
            agrègent uniquement les factures validées.
          </CardDescription>
          <CardAction>
            {tab === "commandes" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openCommandeForm}
                disabled={commandeSaving}
              >
                Nouvelle commande
              </AtomButton>
            ) : tab === "receptions" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openReceptionForm}
                disabled={receptionSaving}
              >
                Nouvelle réception
              </AtomButton>
            ) : tab === "factures" ? (
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openFactureForm}
                disabled={factureSaving}
              >
                Nouvelle facture
              </AtomButton>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Vues des achats"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "commandes"}
                onClick={() => setTab("commandes")}
                className={
                  tab === "commandes"
                    ? "inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <ClipboardListIcon className="size-4" />
                Commandes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "receptions"}
                onClick={() => setTab("receptions")}
                className={
                  tab === "receptions"
                    ? "inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <PackageCheckIcon className="size-4" />
                Réceptions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "factures"}
                onClick={() => setTab("factures")}
                className={
                  tab === "factures"
                    ? "inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <FileTextIcon className="size-4" />
                Factures
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "rapports"}
                onClick={() => setTab("rapports")}
                className={
                  tab === "rapports"
                    ? "inline-flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <ChartNoAxesCombinedIcon className="size-4" />
                Rapports
              </button>
            </div>
            <div className="flex items-center gap-2">
              <AtomBadge variant="secondary">{countLabel}</AtomBadge>
              <AtomButton
                size="sm"
                variant="ghost"
                iconLeft={RefreshCwIcon}
                onClick={refreshCurrent}
                disabled={
                  tab === "commandes"
                    ? commandesLoading
                    : tab === "receptions"
                      ? receptionsLoading
                      : tab === "factures"
                        ? facturesLoading
                        : reportLoading
                }
              >
                Actualiser
              </AtomButton>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {tab !== "rapports" ? (
              <Select
                value={supplierFilter}
                onValueChange={(value) => {
                  setSupplierFilter(value)
                  setCommandesPage(1)
                  setReceptionsPage(1)
                  setFacturesPage(1)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-60"
                  aria-label="Filtrer par fournisseur"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les fournisseurs</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem
                      key={supplier.supplier_id}
                      value={supplier.supplier_id}
                    >
                      {supplier.suppliers_name} · {supplier.supplier_number}
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
                <Select
                  value={familyFilter}
                  onValueChange={setFamilyFilter}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-56"
                    aria-label="Filtrer par famille"
                  >
                    <SelectValue />
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

          {tab === "commandes" ? (
            <>
              <OCommandesAchatTable
                commandes={commandes}
                suppliers={suppliers}
                loading={commandesLoading}
                error={commandesError}
                showPointOfSale={isSuperadmin}
                onView={(commande) => void openCommandeDetails(commande)}
                onRetry={() => setCommandesReloadKey((key) => key + 1)}
              />
              <MPagination
                page={commandesPage}
                limit={PAGE_SIZE}
                total={commandesTotal}
                disabled={commandesLoading}
                onPageChange={setCommandesPage}
              />
            </>
          ) : tab === "receptions" ? (
            <>
              <OReceptionsAchatTable
                receptions={receptions}
                suppliers={suppliers}
                depots={depots}
                commandes={commandeOptions}
                loading={receptionsLoading}
                error={receptionsError}
                showPointOfSale={isSuperadmin}
                onView={(reception) => void openReceptionDetails(reception)}
                onRetry={() => setReceptionsReloadKey((key) => key + 1)}
              />
              <MPagination
                page={receptionsPage}
                limit={PAGE_SIZE}
                total={receptionsTotal}
                disabled={receptionsLoading}
                onPageChange={setReceptionsPage}
              />
            </>
          ) : tab === "factures" ? (
            <>
              <OFacturesAchatTable
                factures={factures}
                suppliers={suppliers}
                commandes={commandeOptions}
                receptions={receptionOptions}
                loading={facturesLoading}
                error={facturesError}
                showPointOfSale={isSuperadmin}
                onView={(facture) => void openFactureDetails(facture)}
                onRetry={() => setFacturesReloadKey((key) => key + 1)}
              />
              <MPagination
                page={facturesPage}
                limit={PAGE_SIZE}
                total={facturesTotal}
                disabled={facturesLoading}
                onPageChange={setFacturesPage}
              />
            </>
          ) : (
            <div className="grid gap-6">
              <section className="grid gap-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-medium">Achats par article</h3>
                  <p className="text-xs text-muted-foreground">
                    Agrégat des quantités et montants HT des factures validées.
                  </p>
                </div>
                <OAchatsReportTable
                  mode="article"
                  rows={reportArticleRows}
                  families={families}
                  loading={reportLoading}
                  error={reportError}
                  onRetry={() => setReportReloadKey((key) => key + 1)}
                />
              </section>
              <section className="grid gap-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-medium">Achats par famille</h3>
                  <p className="text-xs text-muted-foreground">
                    Répartition des achats validés par famille d&apos;articles.
                  </p>
                </div>
                <OAchatsReportTable
                  mode="famille"
                  rows={reportFamilyRows}
                  families={families}
                  loading={reportLoading}
                  error={reportError}
                  onRetry={() => setReportReloadKey((key) => key + 1)}
                />
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
