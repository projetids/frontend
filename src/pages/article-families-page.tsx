import { useCallback, useEffect, useRef, useState } from "react"
import {
  FolderTreeIcon,
  Loader2Icon,
  PencilLineIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  EMPTY_ARTICLE_FAMILY_FORM,
  MArticleFamilyDetails,
  MArticleFamilyForm,
  MConfirmDialog,
  MPagination,
  MSearchBar,
  type MArticleFamilyFormValues,
} from "@/components/molecules"
import { OArticleFamiliesTable, OExcelImportDialog } from "@/components/organisms"
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
import { useAuth } from "@/context/auth-context"
import { hasFormErrors, useFormValidation } from "@/hooks/use-form-validation"
import { ApiError } from "@/lib/api-client"
import { roleLabel } from "@/lib/roles"
import { requiredRule } from "@/lib/validation"
import * as articleFamilyService from "@/services/article-family.service"
import type { ApiArticleFamily } from "@/types/api"

// Gestion des familles d'articles (module API /article-families) : liste
// paginée et recherchable, création et modification dans une modal, suppression
// confirmée. Module de référence réservé aux rôles admin et superadmin.

const PAGE_SIZE = 10
const ARTICLE_FAMILY_FORM_ID = "article-family-form"

/** Convertit une famille API en valeurs de formulaire. */
function toFormValues(family: ApiArticleFamily): MArticleFamilyFormValues {
  return { article_families_name: family.article_families_name }
}

export function ArticleFamiliesPage() {
  const { user } = useAuth()

  const [families, setFamilies] = useState<ApiArticleFamily[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incrémenté pour relancer le chargement (bouton « Réessayer », action réussie).
  const [reloadKey, setReloadKey] = useState(0)

  const [importOpen, setImportOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiArticleFamily | null>(null)
  const form = useFormValidation<MArticleFamilyFormValues>({
    initialValues: EMPTY_ARTICLE_FAMILY_FORM,
    rules: {
      article_families_name: requiredRule("Le nom de la famille est requis."),
    },
  })
  const [saving, setSaving] = useState(false)
  // Chargement de la fiche complète (GET /article-families/:id) avant édition.
  const [formLoading, setFormLoading] = useState(false)
  // Identifie la requête de détail en cours : une réponse obsolète est ignorée.
  const detailRequestRef = useRef(0)

  const [viewing, setViewing] = useState<ApiArticleFamily | null>(null)

  const [toDelete, setToDelete] = useState<ApiArticleFamily | null>(null)
  const [deleting, setDeleting] = useState(false)

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
        const response = await articleFamilyService.listArticleFamilies({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
        })
        if (cancelled) return
        setFamilies(response.families)
        setTotal(response.meta.total)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setFamilies([])
        setTotal(0)
        setError(
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de charger les familles d'articles."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, appliedSearch, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  function openCreate() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setEditing(null)
    form.reset(EMPTY_ARTICLE_FAMILY_FORM)
    setFormOpen(true)
  }

  // Le tableau renvoie les colonnes préfixées : on recharge malgré tout la fiche
  // par son `article_families_id` pour rester aligné sur le flux d'édition des
  // autres modules.
  async function openEdit(family: ApiArticleFamily) {
    const requestId = ++detailRequestRef.current
    setEditing(family)
    form.reset(toFormValues(family))
    setFormOpen(true)
    setFormLoading(true)

    try {
      const { family: fresh } = await articleFamilyService.getArticleFamily(
        family.article_families_id
      )
      if (requestId !== detailRequestRef.current) return
      setEditing(fresh)
      form.reset(toFormValues(fresh))
    } catch (err) {
      if (requestId !== detailRequestRef.current) return
      toast.error("Chargement impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Impossible de récupérer la famille d'articles.",
      })
    } finally {
      if (requestId === detailRequestRef.current) setFormLoading(false)
    }
  }

  function openViewDetails(family: ApiArticleFamily) {
    setViewing(family)
  }

  function closeForm() {
    detailRequestRef.current += 1
    setFormLoading(false)
    setFormOpen(false)
    setEditing(null)
    form.reset(EMPTY_ARTICLE_FAMILY_FORM)
  }

  async function handleSubmit() {
    const nextErrors = form.validate()
    if (hasFormErrors(nextErrors)) {
      toast.error("Formulaire incomplet", {
        description: "Renseignez le nom de la famille d'articles.",
      })
      return
    }

    const payload = {
      article_families_name: form.values.article_families_name.trim(),
    }

    setSaving(true)
    try {
      const { envelope } = editing
        ? await articleFamilyService.updateArticleFamily(
            editing.article_families_id,
            payload
          )
        : await articleFamilyService.createArticleFamily(payload)
      toast.success(envelope.message)
      closeForm()
      // Tri par défaut sur l'identifiant ASC : on revient en tête de liste après
      // création.
      if (!editing) setPage(1)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        form.setErrors({
          article_families_name: "Cette famille d'articles existe déjà.",
        })
        toast.error("Enregistrement refusé", {
          description: "Une famille d'articles porte déjà ce nom.",
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
      const { envelope } = await articleFamilyService.deleteArticleFamily(
        toDelete.article_families_id
      )
      toast.success(envelope.message)
      setToDelete(null)
      // Dernière ligne de la page courante : revenir à la page précédente.
      if (families.length === 1 && page > 1) setPage(page - 1)
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
        title={`Supprimer ${toDelete?.article_families_name ?? "cette famille"} ?`}
        description="La famille sera supprimée définitivement. Cette action est irréversible."
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
        <h1 className="text-3xl font-semibold tracking-tight">
          Familles d'articles
        </h1>
        <p className="text-muted-foreground">
          Organisez le catalogue en familles : chaque famille regroupe des
          articles partageant la même nature. Utilisée comme référence dans les
          formulaires d'articles.
        </p>
      </header>

      {/* Création / modification */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-xl">
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
                {editing
                  ? "Modifier la famille d'articles"
                  : "Nouvelle famille d'articles"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `Mettez à jour le nom de ${editing.article_families_name}.`
                  : "Renseignez le nom de la famille à ajouter au catalogue."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {formLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                Chargement de la famille…
              </div>
            ) : (
              <MArticleFamilyForm
                formId={ARTICLE_FAMILY_FORM_ID}
                showActions={false}
                values={form.values}
                errors={form.errors}
                submitting={saving}
                submitLabel={editing ? "Enregistrer" : "Créer"}
                onChange={form.setValues}
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
              form={ARTICLE_FAMILY_FORM_ID}
              disabled={saving || formLoading}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer la famille"}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex-row items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTreeIcon className="size-5" />
            </div>
            <div className="grid gap-1">
              <DialogTitle>Détails de la famille</DialogTitle>
              <DialogDescription>
                Référence et nom enregistrés dans le catalogue.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            {viewing ? <MArticleFamilyDetails family={viewing} /> : null}
          </DialogBody>
          <DialogFooter>
            <AtomButton variant="outline" onClick={() => setViewing(null)}>
              Fermer
            </AtomButton>
            {viewing ? (
              <AtomButton
                iconLeft={PencilLineIcon}
                onClick={() => {
                  const family = viewing
                  setViewing(null)
                  void openEdit(family)
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
          <CardTitle>Catalogue des familles</CardTitle>
          <CardDescription>
            Recherchez une famille par son nom, puis modifiez ou supprimez-la
            depuis le tableau.
          </CardDescription>
          <CardAction>
            <div className="flex gap-2">
              <AtomButton
                iconLeft={UploadIcon}
                variant="outline"
                onClick={() => setImportOpen(true)}
                disabled={saving || deleting}
              >
                Importer Excel
              </AtomButton>
              <AtomButton
                iconLeft={PlusIcon}
                onClick={openCreate}
                disabled={saving || deleting}
              >
                Nouvelle famille
              </AtomButton>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <MSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une famille…"
              aria-label="Rechercher une famille d'articles"
              className="sm:max-w-xs"
            />
            <AtomBadge variant="secondary">
              {total} famille{total > 1 ? "s" : ""}
            </AtomBadge>
          </div>

          <OArticleFamiliesTable
            families={families}
            loading={loading}
            error={error}
            disabled={deleting || saving}
            onEdit={(family) => void openEdit(family)}
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

      {/* Import Excel */}
      <OExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importer des familles d'articles (Excel)"
        description="Fichier .xls/.xlsx, ligne 1 = en-têtes. Colonne : article_families_name (requis)."
        entityLabel="famille(s)"
        onImport={(file) => articleFamilyService.importArticleFamilies(file)}
        onImported={reload}
      />
    </div>
  )
}
