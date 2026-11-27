import { API_URL } from "@/lib/env"
import { apiRequest, ApiError } from "@/lib/api-client"

/** Réponse JSON tolérante : null si le corps n'est pas du JSON valable. */
function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}
import type {
  ApiEnvelope,
  ApiOpenCashSession,
  ApiUser,
  CreateAdminPayload,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  ProfileUpdatePayload,
  RefreshResponse,
  RegisterPayload,
  RegisterResponse,
  UsersQuery,
} from "@/types/api"

// Implémentation des endpoints décrits dans docs/auth.md (section 4).

/** POST /auth/register (public) → utilisateur créé + access token. */
export async function register(payload: RegisterPayload) {
  const envelope = await apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  })
  return { envelope, user: envelope.data.user, access_token: envelope.data.access_token }
}

/** POST /auth/login (public) → user, session_id, access_token, refresh_token. */
export async function login(payload: LoginPayload) {
  const envelope = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  })
  return { envelope, ...envelope.data }
}

/**
 * POST /auth/refresh (public) → nouveau access_token uniquement.
 * Implémenté à part : il renvoie lui-même un 401 en cas de refresh_token
 * invalide, sans déclencher de replay.
 */
export async function refresh(
  session_id: string,
  refresh_token: string,
): Promise<{ envelope: ApiEnvelope<RefreshResponse>; access_token: string }> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, refresh_token }),
  })

  const payload = await readJson(response)

  if (!response.ok) {
    const envelope = payload as ApiEnvelope<RefreshResponse> | null
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? "UNAUTHORIZED",
      envelope?.message ?? "Session expirée, reconnectez-vous.",
    )
  }

  const envelope = payload as ApiEnvelope<RefreshResponse>
  return { envelope, access_token: envelope.data.access_token }
}

/** GET /auth/session (auth) → IDs des sessions actives de l'utilisateur. */
export async function getActiveSessions() {
  const envelope = await apiRequest<string[]>("/auth/session")
  return { envelope, sessions: envelope.data }
}

/**
 * POST /auth/logout (auth) → révoque la session courante et renvoie la caisse
 * encore ouverte du caissier (`open_cash_session`), ou `null`.
 */
export async function logout(session_id: string) {
  const envelope = await apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
    body: { session_id },
  })
  return {
    envelope,
    message: envelope.message,
    open_cash_session: envelope.data.open_cash_session,
  }
}

/** POST /auth/logout-session (auth) → révoque une session précise. */
export async function logoutSession(session_id: string) {
  const envelope = await apiRequest<{
    session_id: string
    revoked: boolean
    open_cash_session: ApiOpenCashSession | null
  }>("/auth/logout-session", { method: "POST", body: { session_id } })
  return { envelope, ...envelope.data }
}

/**
 * POST /auth/forgot-password (public) — réponse identique que le compte
 * existe ou non (l'API envoie l'email avec un lien valable 15 min).
 */
export async function forgotPassword(user_mail: string) {
  const envelope = await apiRequest<null>("/auth/forgot-password", {
    method: "POST",
    body: { user_mail },
    auth: false,
  })
  return { envelope, message: envelope.message }
}

/** POST /auth/reset-password (public) — `INVALID_RESET_TOKEN` si token périmé. */
export async function resetPassword(token: string, new_password: string) {
  const envelope = await apiRequest<null>("/auth/reset-password", {
    method: "POST",
    body: { token, new_password },
    auth: false,
  })
  return { envelope, message: envelope.message }
}

/** GET /auth/users (auth, admin/superadmin) — liste paginée (meta remplie). */
export async function getUsers(query: UsersQuery = {}) {
  const envelope = await apiRequest<ApiUser[]>("/auth/users", { query })
  return {
    envelope,
    users: envelope.data,
    meta: envelope.meta ?? { page: 1, limit: 1, total: 1 },
  }
}

/** GET /auth/profile (auth) — utilisateur courant (sans user_password). */
export async function getProfile() {
  const envelope = await apiRequest<ApiUser>("/auth/profile")
  return { envelope, user: envelope.data }
}

/** PATCH /auth/profile (auth) — champs optionnels, utilisateur mis à jour. */
export async function updateProfile(payload: ProfileUpdatePayload) {
  const envelope = await apiRequest<ApiUser>("/auth/profile", {
    method: "PATCH",
    body: payload,
  })
  return { envelope, user: envelope.data }
}

/** DELETE /auth/profile (auth) — suppression définitive du compte. */
export async function deleteProfile() {
  const envelope = await apiRequest<null>("/auth/profile", { method: "DELETE" })
  return { envelope, message: envelope.message }
}

// ——— Gestion et validation des comptes (superadmin / admin) ———

/**
 * POST /auth/admins (superadmin) — crée un admin au statut `pending`.
 * Le point de vente est soit existant (`point_of_sale_id`), soit créé à la
 * volée à partir de `point_of_sale_nom`.
 */
export async function createAdmin(payload: CreateAdminPayload) {
  const envelope = await apiRequest<ApiUser>("/auth/admins", {
    method: "POST",
    body: payload,
  })
  return { envelope, user: envelope.data }
}

/** GET /auth/admins/pending (superadmin) — admins en attente de validation. */
export async function getPendingAdmins() {
  const envelope = await apiRequest<ApiUser[]>("/auth/admins/pending")
  return { envelope, users: envelope.data }
}

/** GET /auth/caisiers/pending (admin) — caissiers en attente du point de vente. */
export async function getPendingCaisiers() {
  const envelope = await apiRequest<ApiUser[]>("/auth/caisiers/pending")
  return { envelope, users: envelope.data }
}

/** PUT /auth/admins/:id/validate (superadmin) — active un admin en attente (§4.16). */
export async function validateAdmin(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/admins/${encodeURIComponent(user_id)}/validate`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** PUT /auth/caisiers/:id/validate (admin) — active un caissier en attente (§4.17). */
export async function validateCaisier(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/caisiers/${encodeURIComponent(user_id)}/validate`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** PUT /auth/admins/:id/reactivate (superadmin) — réactive un admin rejeté (§4.19). */
export async function reactivateAdmin(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/admins/${encodeURIComponent(user_id)}/reactivate`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** PUT /auth/caisiers/:id/reactivate (admin) — réactive un caissier rejeté (§4.18). */
export async function reactivateCaisier(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/caisiers/${encodeURIComponent(user_id)}/reactivate`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** POST /auth/caisiers (admin) — crée un caissier avec mot de passe temporaire. */
export async function createCashier(payload: {
  user_name: string
  user_mail: string
  user_phone?: string
  point_of_sale_id?: string
}) {
  const envelope = await apiRequest<ApiUser & { temporary_password?: string }>(
    "/auth/caisiers",
    { method: "POST", body: payload },
  )
  return { envelope, user: envelope.data, temporary_password: envelope.data.temporary_password }
}

/** POST /auth/change-password (auth) — change le mot de passe temporaire/actuel. */
export async function changePassword(temporary_password: string, new_password: string) {
  const envelope = await apiRequest<null>("/auth/change-password", {
    method: "POST",
    body: { temporary_password, new_password },
  })
  return { envelope, message: envelope.message }
}

/** PUT /auth/admins/:id/reject (superadmin) — rejette une demande admin. */
export async function rejectAdmin(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/admins/${encodeURIComponent(user_id)}/reject`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** PUT /auth/caisiers/:id/reject (admin) — rejette un caissier. */
export async function rejectCaisier(user_id: string) {
  const envelope = await apiRequest<ApiUser>(
    `/auth/caisiers/${encodeURIComponent(user_id)}/reject`,
    { method: "PUT" },
  )
  return { envelope, user: envelope.data }
}

/** GET /auth/admins (superadmin) — liste paginée des admins. */
export async function getAdmins(query: { page?: number; limit?: number; status?: string; search?: string } = {}) {
  const envelope = await apiRequest<ApiUser[]>("/auth/admins", { query })
  return {
    envelope,
    users: envelope.data,
    meta: envelope.meta ?? { page: 1, limit: query.limit ?? 20, total: envelope.data.length },
  }
}
