import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AtomIcon } from "@/components/atoms"

/**
 * Garde les routes protégées tant que la session est restaurée en mémoire.
 * Pendant la vérification du refresh_token (au chargement), on sépare l'UI
 * pour éviter un flash de redirection vers /login.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <AtomIcon
          name="layers"
          className="text-muted-foreground size-6 animate-pulse"
        />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
