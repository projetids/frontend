import { apiRequest } from "@/lib/api-client"
import type {
  ApiArticle,
  ApiArticleOption,
  ArticlesQuery,
  CreateArticlePayload,
  UpdateArticlePayload,
} from "@/types/api"

// Endpoints du module Articles (backend : src/articles). Chaque article est
// rattaché à un point de vente : l'API scope automatiquement les admins à leur
// PO, tandis que le superadmin voit tout et doit fournir `point_of_sale_id` à
// la création. Les routes `PATCH`/`DELETE` répondent 404 hors périmètre.
// `article_code` doit être unique pour un même point de vente (409 sinon).

/** GET /articles (admin, superadmin) — liste paginée + filtres. */
export async function listArticles(query: ArticlesQuery = {}) {
  const envelope = await apiRequest<ApiArticle[]>("/articles", { query })
  return {
    envelope,
    articles: envelope.data,
    meta: envelope.meta ?? {
      page: 1,
      limit: query.limit ?? 20,
      total: envelope.data.length,
    },
  }
}

/** GET /articles/select — liste légère des articles publiés. */
export async function listArticleOptions() {
  const envelope = await apiRequest<ApiArticleOption[]>("/articles/select")
  return { envelope, options: envelope.data }
}

/** GET /articles/:id — détail d'un article (404 hors périmètre PO). */
export async function getArticle(article_id: string) {
  const envelope = await apiRequest<ApiArticle>(
    `/articles/${encodeURIComponent(article_id)}`
  )
  return { envelope, article: envelope.data }
}

/** POST /articles — crée un article dans le catalogue. */
export async function createArticle(payload: CreateArticlePayload) {
  const envelope = await apiRequest<ApiArticle>("/articles", {
    method: "POST",
    body: payload,
  })
  return { envelope, article: envelope.data }
}

/** PATCH /articles/:id — met à jour partiellement un article. */
export async function updateArticle(
  article_id: string,
  payload: UpdateArticlePayload
) {
  const envelope = await apiRequest<ApiArticle>(
    `/articles/${encodeURIComponent(article_id)}`,
    { method: "PATCH", body: payload }
  )
  return { envelope, article: envelope.data }
}

/** DELETE /articles/:id — supprime définitivement un article. */
export async function deleteArticle(article_id: string) {
  const envelope = await apiRequest<{ article_id: string }>(
    `/articles/${encodeURIComponent(article_id)}`,
    { method: "DELETE" }
  )
  return { envelope, article_id: envelope.data.article_id }
}
