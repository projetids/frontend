import { useCallback, useEffect, useRef, useState } from "react"
import {
  Loader2Icon,
  PackageIcon,
  PencilLineIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_ARTICLE_FORM,
  MArticleDetails,
  MArticleForm,
  MConfirmDialog,
  MPagination,
  MSearchBar,
  type MArticleFormErrors,
  type MArticleFormValues,
} from "@/components/molecules"
import { OArticlesTable } from "@/components/organisms"
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
import { ApiError } from "@/lib/api-client"
import {
  ARTICLE_STATUS_OPTIONS,
  articleFamilyLabel,
  articleStatusToQuery,
  isDecimalInput,
  normalizeDecimal,
  type ArticleStatusFilter,
} from "@/lib/articles"
import { roleLabel } from "@/lib/roles"
import * as articleFamilyService from "@/services/article-family.service"
import * as articleService from "@/services/article.service"
import type {
  ApiArticle,
  ApiArticleFamily,
  CreateArticlePayload,
} from "@/types/api"

// Gestion des articles (module API /articles) : liste paginée et recherchable
// avec filtres famille/statut, création et modification dans une modal,
// suppression confirmée. Les admins sont limités à leur point de vente ; le
// superadmin voit tous les articles et doit fournir le PO de rattachement.

const PAGE_SIZE = 10
const ARTICLE_FORM_ID = "article-form"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DECIMAL_FIELDS = [
  ["article_tva_rate", "Le taux de TVA"],
  ["article_purchase_price_ht", "Le prix d'achat HT"],
  ["article_purchase_price_ttc", "Le prix d'achat TTC"],
  ["article_margin", "La marge"],
  ["article_sale_price_ht", "Le prix de vente HT"],
  ["article_sale_price_ttc", "Le prix de vente TTC"],
  ["article_theoretical_stock", "Le stock théorique"],
  ["article_reserved_qty", "La quantité réservée"],
  ["article_available_qty", "La quantité disponible"],
] as const satisfies ReadonlyArray<readonly [keyof MArticleFormValues, string]>

/** Convertit un article API en valeurs de formulaire. */
function toFormValues(article: ApiArticle): MArticleFormValues {
  return {
    is_publish: article.is_publish,
    article_code: article.article_code,
    article_name: article.article_name,
    article_unit: article.article_unit,
    article_families_id: String(article.article_families_id),
    article_barcode: article.article_barcode ?? "",
    article_tva_rate: article.article_tva_rate ?? "0",
    article_purchase_price_ht: article.article_purchase_price_ht ?? "0",
    article_purchase_price_ttc: article.article_purchase_price_ttc ?? "0",
    article_margin: article.article_margin ?? "0",
    article_sale_price_ht: article.article_sale_price_ht ?? "0",
    article_sale_price_ttc: article.article_sale_price_ttc ?? "0",
    article_theoretical_stock: article.article_theoretical_stock ?? "0",
    article_reserved_qty: article.article_reserved_qty ?? "0",
    article_available_qty: article.article_available_qty ?? "0",
    article_location: article.article_location ?? "",
    point_of_sale_id: article.point_of_sale_id,
  }
}

export function ArticlesPage() {
  const { user } = useAuth()
  const isSuperadmin = user?.role === "superadmin"

  const [articles, setArticles] = useState<ApiArticle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [familyFilter, setFamilyFilter] = useState("all")
  const [status, setStatus] = useState<ArticleStatusFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  // Familles utilisées par le sélecteur du formulaire et les filtres.
  const [families, setFamilies] = useState<ApiArticleFamily[]>([])
  const [familiesLoading, setFamiliesLoading] = useState(true)
  const [familiesError, setFamiliesError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiArticle | null>(null)
  const [values, setValues] = useState<MArticleFormValues>(EMPTY_ARTICLE_FORM)
  const [formErrors, setFormErrors] = useState<MArticleFormErrors>({})
  const [saving, setSaving] = useState(false)
  // Chargement de la fiche complète (GET /articles/:id) avant édition.
  const [formLoading, setFormLoading] = useState(false)
  // Identifie la requête de détail en cours : une réponse obsolète est ignorée.
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiArticle | null>(null)

  const [toDelete, setToDelete] = useState<ApiArticle | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Chargement initial des familles (sélecteurs et noms du tableau).
  useEffect(() => {
    let cancelled = false

    async function loadFamilies() {
      setFamiliesLoading(true)
      try {
        const { options } =
          await articleFamilyService.listArticleFamilyOptions()
        if (cancelled) return
        setFamilies(options)
        setFamiliesError(null)
      } catch (err) {
        if (cancelled) return
        setFamilies([])
        setFamiliesError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les familles d'articles."
        )
      } finally {
        if (!cancelled) setFamiliesLoading(false)
      }
    }

    void loadFamilies()
    return () => {
      cancelled = true
    }
  }, [])

  // Recherche différée : évite un appel API à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await articleService.listArticles({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
          article_families_id:
            familyFilter === "all" ? undefined : Number(familyFilter),
          is_publish: articleStatusToQuery(status),
        })
        if (cancelled) return
        setArticles(response.articles)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setArticles([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les articles."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, appliedSearch, familyFilter, status, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  function openCreate() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setEditing(null)
    setValues({
      ...EMPTY_ARTICLE_FORM,
      article_families_id: familyFilter === "all" ? "" : familyFilter,
      point_of_sale_id: user?.point_of_sale_id ?? "",
    })
    setFormErrors({})
    setFormOpen(true)
  }

  // Le tableau ne renvoie qu'un résumé : on recharge la fiche complète via son
  // `article_id` pour préremplir la modal d'édition avec les données à jour.
  async function openEdit(article: ApiArticle) {
    const requestId = ++detailRequestRef.current
    setEditing(article)
    setValues(toFormValues(article))
    setFormErrors({})
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { article: fresh } = await articleService.getArticle(
        article.article_id
      )
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      setValues(toFormValues(fresh))
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la fiche de l'article.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(article: ApiArticle) {
    setViewing(article)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    setValues(EMPTY_ARTICLE_FORM)
    setFormErrors({})
  }

  function validateForm(): MArticleFormErrors {
    const errors: MArticleFormErrors = {}

    if (!values.article_name.trim())
      errors.article_name = "La désignation est requise."

    const familyId = Number(values.article_families_id)
    if (
      !values.article_families_id ||
      !Number.isInteger(familyId) ||
      familyId < 1
    ) {
      errors.article_families_id = "La famille d'articles est requise."
    }

    for (const [key, label] of DECIMAL_FIELDS) {
      if (!isDecimalInput(values[key])) {
        errors[key] = `${label} doit être un nombre positif (ex. 12.50).`
      }
    }

    if (isSuperadmin) {
      const pointOfSale = values.point_of_sale_id.trim()
      if (!pointOfSale) {
        errors.point_of_sale_id = "Le point de vente est requis."
      } else if (!UUID_REGEX.test(pointOfSale)) {
        errors.point_of_sale_id = "Identifiant UUID invalide."
      }
    }

    return errors
  }

  async function handleSubmit() {
    const nextErrors = validateForm()
    setFormErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs signalés en rouge.",
      })
      return
    }

    // Champs libres vidés → `null` pour effacer la valeur existante.
    // Les montants restent des chaînes décimales ; une valeur vide vaut « 0 ».
    // Un ADMIN ne peut pas choisir le PO : l'API force le sien.
    // `article_code` n'est jamais envoyé : il est généré par le serveur.
    const payload: CreateArticlePayload = {
      is_publish: values.is_publish,
      article_name: values.article_name.trim(),
      article_unit: values.article_unit,
      article_families_id: Number(values.article_families_id),
      article_barcode: values.article_barcode.trim() || null,
      article_tva_rate: normalizeDecimal(values.article_tva_rate),
      article_purchase_price_ht: normalizeDecimal(
        values.article_purchase_price_ht
      ),
      article_purchase_price_ttc: normalizeDecimal(
        values.article_purchase_price_ttc
      ),
      article_margin: normalizeDecimal(values.article_margin),
      article_sale_price_ht: normalizeDecimal(values.article_sale_price_ht),
      article_sale_price_ttc: normalizeDecimal(values.article_sale_price_ttc),
      article_theoretical_stock: normalizeDecimal(
        values.article_theoretical_stock
      ),
      article_reserved_qty: normalizeDecimal(values.article_reserved_qty),
      article_available_qty: normalizeDecimal(values.article_available_qty),
      article_location: values.article_location.trim() || null,
      ...(isSuperadmin
        ? { point_of_sale_id: values.point_of_sale_id.trim() }
        : {}),
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await articleService.updateArticle(editing.article_id, payload)
        : await articleService.createArticle(payload)
      toast.success(envelope.message)
      closeForm()
      // Tri par défaut sur created_at DESC : un nouvel article apparaît en tête.
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error("Enregistrement refusé", {
          description:
            "Le serveur n'a pas pu générer un code article unique pour ce point de vente. Réessayez dans un instant.",
        })
      } else if (err instanceof ApiError && err.code === "NOT_FOUND") {
        toast.error("Enregistrement impossible", {
          description:
            err.details ||
            "La famille d'articles ou le point de vente est introuvable.",
        })
      } else {
        toast.error(
          editing ? "Modification impossible" : "Création impossible",
          {
            description:
              err instanceof ApiError
                ? err.details || err.message
                : "Erreur inattendue",
          }
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const { envelope } = await articleService.deleteArticle(
        toDelete.article_id
      )
      toast.success(envelope.message)
      setToDelete(null)
      // Dernière ligne de la page courante : revenir à la page précédente.
      if (articles.length === 1 && page > 1) setPage(page - 1)
      else reload()
    } catch (err) {
      toast.error("Suppression impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <MConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Supprimer ${toDelete?.article_name ?? "cet article"} ?`}
        description="L'article sera supprimé définitivement. S'il est déjà référencé par des documents ou des mouvements de stock, préférez le passer en veille."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => void handleDelete()}
      />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">{roleLabel(user.role)}</AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Articles</h1>
        <p className="text-muted-foreground">
          Gérez le catalogue articles du point de vente : familles, unités,
          tarifs et stock dénormalisé. Le code article est généré
          automatiquement par le serveur. Un article en veille reste consultable
          mais n&apos;est plus proposé à la vente.
        </p>
      </header>

      {/* Création / modification */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {editing ? (
                <PencilLineIcon className="size-5" />
              ) : (
                <PlusIcon className="size-5" />
              )}
            </div>
            <div className="grid gap-1">
              <DialogTitle>
                {editing ? "Modifier l'article" : "Nouvel article"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour la fiche de ${editing.article_name}.`
                  : "Renseignez l'article à ajouter au catalogue du point de vente."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement de l&apos;article…
              </div>
            ) : (
              <MArticleForm
                formId={ARTICLE_FORM_ID}
                showActions={false}
                values={values}
                errors={formErrors}
                submitting={saving}
                submitLabel={editing ? "Enregistrer" : "Créer"}
                families={families}
                familiesLoading={familiesLoading}
                familiesError={familiesError}
                showPointOfSale={isSuperadmin}
                pointOfSaleRequired={isSuperadmin}
                editing={editing !== null}
                onChange={(patch) =>
                  setValues((prev) => ({ ...prev, ...patch }))
                }
                onSubmit={() => void handleSubmit()}
                onCancel={closeForm}
              />
            )}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={closeForm} disabled={saving}>
              Annuler
            </AtomButton>
            <AtomButton
              type="submit"
              form={ARTICLE_FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer l'article"}
            </AtomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consultation */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails de l'article</DialogTitle>
              <DialogDescription>
                Fiche complète : identification, tarification, stock et
                traçabilité.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? (
              <MArticleDetails
                article={viewing}
                familyName={articleFamilyLabel(
                  families,
                  viewing.article_families_id
                )}
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const article = viewing
                  setViewing(null)
                  void openEdit(article)
                }}
              >
                Modifier
              </AtomButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue articles</CardTitle>
          <CardDescription>
            Recherchez par code, désignation, code-barres ou référence, filtrez
            par famille et statut, puis modifiez ou supprimez un article.
          </CardDescription>
          <CardAction>
            <AtomButton
              iconLeft={PlusIcon}
              onClick={openCreate}
              disabled={saving || deleting}
            >
              Nouvel article
            </AtomButton>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un article…"
              aria-label="Rechercher un article"
              className="sm:max-w-xs"
            />
            <Select
              value={familyFilter}
              onValueChange={(value) => {
                setFamilyFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-52"
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
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as ArticleStatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-44"
                aria-label="Filtrer par statut"
              >
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
            <AtomBadge variant="secondary">
              {total} article{total > 1 ? "s" : ""}
            </AtomBadge>
          </div>

          <OArticlesTable
            articles={articles}
            families={families}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            showPointOfSale={isSuperadmin}
            onEdit={(article) => void openEdit(article)}
            onDelete={setToDelete}
            onViewDetails={openViewDetails}
            onRetry={reload}
          />

          <MPagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            disabled={loading || deleting}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
