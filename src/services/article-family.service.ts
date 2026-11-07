import { apiRequest } from "@/lib/api-client"
import type {
  ApiArticleFamily,
  ApiArticleFamilyOption,
  ArticleFamiliesQuery,
  CreateArticleFamilyPayload,
  UpdateArticleFamilyPayload,
} from "@/types/api"

// Endpoints du module Familles d'articles (backend : src/article-families).
// Module de référence non scopé par point de vente : réservé aux rôles
// `ADMIN` et `SUPERADMIN`. Les identifiants sont des entiers auto-générés.

/** GET /article-families — liste paginée + recherche sur `name`. */
export async function listArticleFamilies(query: ArticleFamiliesQuery = {}) {
  const envelope = await apiRequest<ApiArticleFamily[]>("/article-families", {
    query,
  })
  return {
    envelope,
    families: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/**
 * GET /article-families/select — liste légère `{ id, name }` triée par nom.
 * Utile pour alimenter les sélecteurs du module Articles.
 */
export async function listArticleFamilyOptions() {
  const envelope = await apiRequest<ApiArticleFamilyOption[]>(
    "/article-families/select"
  )
  return { envelope, options: envelope.data }
}

/** GET /article-families/:id — détail d'une famille. */
export async function getArticleFamily(id: number) {
  const envelope = await apiRequest<ApiArticleFamily>(
    `/article-families/${encodeURIComponent(String(id))}`
  )
  return { envelope, family: envelope.data }
}

/** POST /article-families — crée une famille. */
export async function createArticleFamily(payload: CreateArticleFamilyPayload) {
  const envelope = await apiRequest<ApiArticleFamily>("/article-families", {
    method: "POST",
    body: payload,
  })
  return { envelope, family: envelope.data }
}

/** PATCH /article-families/:id — met à jour le nom d'une famille. */
export async function updateArticleFamily(
  id: number,
  payload: UpdateArticleFamilyPayload
) {
  const envelope = await apiRequest<ApiArticleFamily>(
    `/article-families/${encodeURIComponent(String(id))}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, family: envelope.data }
}

/** DELETE /article-families/:id — supprime définitivement une famille. */
export async function deleteArticleFamily(id: number) {
  const envelope = await apiRequest<{ id: number }>(
    `/article-families/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  )
  return { envelope, id: envelope.data?.id ?? id }
}
