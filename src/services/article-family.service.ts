import { apiRequest } from "@/lib/api-client"
import type {
  ApiArticleFamily,
  ArticleFamiliesQuery,
  CreateArticleFamilyPayload,
  UpdateArticleFamilyPayload,
} from "@/types/api"

// Endpoints du module Familles d'articles (backend : src/article-families).
// Module de référence non scopé par point de vente : réservé aux rôles
// `ADMIN` et `SUPERADMIN`. L'API expose des colonnes préfixées
// (`article_families_id`, `article_families_name`).

/** Réponse brute : tolère aussi l'ancien format `{ id, name }`. */
type RawArticleFamily = {
  article_families_id?: number
  article_families_name?: string
  id?: number
  name?: string
}

function normalizeFamily(raw: RawArticleFamily): ApiArticleFamily {
  return {
    article_families_id: raw.article_families_id ?? raw.id ?? 0,
    article_families_name: raw.article_families_name ?? raw.name ?? "",
  }
}

/** GET /article-families — liste paginée + recherche sur le nom. */
export async function listArticleFamilies(query: ArticleFamiliesQuery = {}) {
  const envelope = await apiRequest<RawArticleFamily[]>("/article-families", {
    query,
  })
  const families = envelope.data.map(normalizeFamily)
  return {
    envelope,
    families,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: families.length,
    },
  }
}

/**
 * GET /article-families/select — liste légère triée par nom.
 * Utile pour alimenter les sélecteurs du module Articles.
 */
export async function listArticleFamilyOptions() {
  const envelope = await apiRequest<RawArticleFamily[]>(
    "/article-families/select"
  )
  return { envelope, options: envelope.data.map(normalizeFamily) }
}

/** GET /article-families/:id — détail d'une famille. */
export async function getArticleFamily(id: number) {
  const envelope = await apiRequest<RawArticleFamily>(
    `/article-families/${encodeURIComponent(String(id))}`
  )
  return { envelope, family: normalizeFamily(envelope.data) }
}

/** POST /article-families — crée une famille. */
export async function createArticleFamily(payload: CreateArticleFamilyPayload) {
  const envelope = await apiRequest<RawArticleFamily>("/article-families", {
    method: "POST",
    body: payload,
  })
  return { envelope, family: normalizeFamily(envelope.data) }
}

/** PATCH /article-families/:id — met à jour le nom d'une famille. */
export async function updateArticleFamily(
  id: number,
  payload: UpdateArticleFamilyPayload
) {
  const envelope = await apiRequest<RawArticleFamily>(
    `/article-families/${encodeURIComponent(String(id))}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, family: normalizeFamily(envelope.data) }
}

/** DELETE /article-families/:id — supprime définitivement une famille. */
export async function deleteArticleFamily(id: number) {
  const envelope = await apiRequest<{
    article_families_id?: number
    id?: number
  }>(`/article-families/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  })
  return {
    envelope,
    id: envelope.data?.article_families_id ?? envelope.data?.id ?? id,
  }
}
