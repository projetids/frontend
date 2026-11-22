import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import * as authService from "@/services/auth.service"
import {
  clearSession,
  getAccessToken,
  getSession,
  getUser,
  setAccessToken,
  setSession,
  setUser,
} from "@/lib/token-store"
import { refreshAccessToken } from "@/lib/api-client"
import type { LoginPayload, RegisterPayload, ApiUser } from "@/types/api"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthContextValue = {
  user: ApiUser | null
  status: AuthStatus
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  /** Met à jour l'utilisateur courant (après PATCH /auth/profile). */
  updateUser: (next: ApiUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function asUser(value: unknown): ApiUser | null {
  return value && typeof value === "object" && "user_id" in value
    ? (value as ApiUser)
    : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setThisUser] = useState<ApiUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  function setCurrentUser(next: ApiUser | null) {
    setThisUser(next)
    if (next) setUser(next)
    else setUser(null)
  }

  // Au montage : restauration de session. L'access token a expiré (15 min)
  // mais le refresh_token est encore valable 7 jours → refresh silencieux.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!getAccessToken() && !getSession()) {
        if (!cancelled) setStatus("unauthenticated")
        return
      }
      if (!getAccessToken()) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          if (!cancelled) setStatus("unauthenticated")
          return
        }
      }
      try {
        const { user: profile } = await authService.getProfile()
        if (cancelled) return
        setCurrentUser(profile)
        setStatus("authenticated")
      } catch {
        if (cancelled) return
        // Si on n'arrive pas à récupérer le profil, on déconnecte l'utilisateur :
        // la session locale est purgée et l'état passe à `unauthenticated`.
        clearSession()
        setCurrentUser(null)
        setStatus("unauthenticated")
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const { user: loggedUser, session_id, access_token, refresh_token } =
      await authService.login(payload)
    setAccessToken(access_token)
    setSession({ session_id, refresh_token })
    setUser(loggedUser)
    setThisUser(loggedUser)
    setStatus("authenticated")
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    // L'inscription crée un compte au statut `pending` : la connexion est
    // refusée (ACCOUNT_PENDING) tant qu'un admin ne l'a pas validé, donc on
    // n'ouvre aucune session ici — l'utilisateur devra se connecter ensuite.
    await authService.register(payload)
  }, [])

  const logout = useCallback(async () => {
    const session = getSession()
    try {
      if (session) await authService.logout(session.session_id)
    } finally {
      clearSession()
      setThisUser(null)
      setStatus("unauthenticated")
    }
  }, [])

  const updateUser = useCallback((next: ApiUser | null) => {
    setThisUser(next)
    setUser(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? asUser(getUser()),
      status,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, status, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un <AuthProvider>.")
  }
  return context
}
