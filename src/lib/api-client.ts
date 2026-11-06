import { API_URL } from "@/lib/env"
import {
  clearSession,
  getAccessToken,
  getSession,
  setAccessToken,
} from "@/lib/token-store"
import type { ApiEnvelope } from "@/types/api"

// Client HTTP central : enveloppe uniforme de l'API, erreurs typées et
// rafraîchissement automatique du access_token (expire en 15 min).

export class ApiError extends Error {
  status: number
  code: string
  details?: string

  constructor(status: number, code: string, message: string, details?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  /** Query params sérialisés ; les valeurs undefined/null sont ignorées. */
  query?: Record<string, string | number | boolean | undefined | null>
  /**
   * Ajoute le header Authorization s'il y a un token (défaut : true).
   * Mettre `false` sur les routes publiques (register, login, refresh…).
   */
  auth?: boolean
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

/** Réponse JSON tolérante : null si le corps n'est pas du JSON valable. */
function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value
  )
}

/** Jonction d'un refresh déjà en cours (évitons les appels concurrents). */
let refreshInFlight: Promise<boolean> | null = null

/**
 * POST /auth/refresh avec session_id + refresh_token.
 * Retourne `true` si un nouveau access_token a été obtenu.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const session = getSession()
  if (!session) return false

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      })
      if (!response.ok) {
        clearSession()
        return false
      }
      const envelope = (await response.json()) as ApiEnvelope<{
        access_token: string
      }>
      const token = envelope?.data?.access_token
      if (!token) {
        clearSession()
        return false
      }
      setAccessToken(token)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * Appel générique vers l'API. En succès, résout avec l'enveloppe complète
 * (`data` + `meta` éventuelle). En échec, lève une `ApiError` pré-remplie
 * (`error.code` + `message`) prête à être affichée à l'utilisateur.
 *
 * Sur 401 d'une route protégée : tente `POST /auth/refresh` puis rejoue la
 * requête initiale une seule fois ; si le refresh échoue, la session est
 * purgée et l'erreur est remontée (redirection login côté appelant).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, query, auth = true } = options

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getAccessToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  async function send(): Promise<Response> {
    const freshToken = getAccessToken()
    if (auth && freshToken) headers.Authorization = `Bearer ${freshToken}`
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let response = await send()

  // 401 sur route protégée → refresh → replay (une seule fois).
  if (response.status === 401 && auth && !isPublicAuthRoute(path)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await send()
    } else {
      // Session invalide : purge déjà faite dans refreshAccessToken.
      throw new ApiError(401, "UNAUTHORIZED", "Session expirée, reconnectez-vous.")
    }
  }

  const payload = await readJson(response)

  if (isEnvelope(payload)) {
    const envelope = payload as ApiEnvelope<T>
    if (envelope.error) {
      throw new ApiError(
        envelope.status ?? response.status,
        envelope.error.code,
        envelope.message,
        envelope.error.details,
      )
    }
    return envelope
  }

  // Réponse hors contrat (proxy, HTML d'erreur…)
  throw new ApiError(
    response.status,
    response.ok ? "OK" : "HTTP_ERROR",
    response.ok ? "Réponse inattendue de l'API" : `Erreur HTTP ${response.status}`,
  )
}

/** Les routes d'auth publiques gèrent elles-mêmes leurs 401 (pas de replay). */
function isPublicAuthRoute(path: string): boolean {
  return path.startsWith("/auth/login") || path.startsWith("/auth/refresh")
}
