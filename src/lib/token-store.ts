// Gestion de la session côté client : access_token, refresh_token et session_id.
// Le refresh (rotation) exige de renvoyer session_id + refresh_token ; le choix
// de stocker ces tokens en localStorage est assumé ici (alternative : cookie httpOnly).

const ACCESS_TOKEN_KEY = "ids.access_token"
const REFRESH_TOKEN_KEY = "ids.refresh_token"
const SESSION_ID_KEY = "ids.session_id"
const USER_KEY = "ids.user"

export type StoredSession = {
  session_id: string
  refresh_token: string
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Stockage indisponible (mode privé…) — la session vivra uniquement en mémoire.
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignoré
  }
}

// ——— Access token ———

export function getAccessToken(): string | null {
  return safeGet(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  safeSet(ACCESS_TOKEN_KEY, token)
}

// ——— Refresh + session (rotation / logout) ———

export function getSession(): StoredSession | null {
  const session_id = safeGet(SESSION_ID_KEY)
  const refresh_token = safeGet(REFRESH_TOKEN_KEY)
  if (!session_id || !refresh_token) return null
  return { session_id, refresh_token }
}

export function setSession(session: StoredSession) {
  safeSet(SESSION_ID_KEY, session.session_id)
  safeSet(REFRESH_TOKEN_KEY, session.refresh_token)
}

// ——— Utilisateur courant (persistance d'affichage entre rechargements) ———

export function getUser(): unknown {
  const raw = safeGet(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setUser(user: unknown) {
  safeSet(USER_KEY, JSON.stringify(user))
}

// ——— Nettoyage complet ———

export function clearSession() {
  safeRemove(ACCESS_TOKEN_KEY)
  safeRemove(REFRESH_TOKEN_KEY)
  safeRemove(SESSION_ID_KEY)
  safeRemove(USER_KEY)
}
