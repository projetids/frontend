import { Navigate, Outlet, useLocation, useMatches } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { AtomIcon } from "@/components/atoms"
import type { ApiRole } from "@/types/api"

/** `handle` déclaré sur les routes pour restreindre l'accès par rôle. */
export type ProtectedRouteHandle = {
  roles?: ApiRole[]
}

/**
 * Garde les routes protégées tant que la session est restaurée en mémoire.
 * Pendant la vérification du refresh_token (au chargement), on sépare l'UI
 * pour éviter un flash de redirection vers /login.
 *
 * Le `handle.roles` le plus proche restreint ensuite la route au rôle courant
 * (docs/auth.md §5 : UI par rôle, l'API renvoie 403 `FORBIDDEN` sinon).
 */
export function ProtectedRoute() {
  const { status, user } = useAuth()
  const location = useLocation()
  const matches = useMatches()

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

  const allowedRoles = matches.reduce<ApiRole[] | undefined>((acc, match) => {
    const roles = (match.handle as ProtectedRouteHandle | undefined)?.roles
    return roles ?? acc
  }, undefined)

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/profile" replace />
  }

  // Un compte créé avec un mot de passe temporaire doit le changer avant
  // d'accéder aux autres écrans (docs/auth.md §4.10).
  if (user?.must_change_password && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />
  }

  return <Outlet />
}
