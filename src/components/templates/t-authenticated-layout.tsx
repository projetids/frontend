import { useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { MConfirmDialog } from "@/components/molecules"
import { TAppSidebar } from "@/components/templates/t-app-sidebar"
import { useAuth } from "@/context/auth-context"
import { appNavigation } from "@/lib/navigation"
import { roleLabel } from "@/lib/roles"

// Enveloppe commune des routes protégées : barre latérale, déconnexion
// confirmée et zone de contenu des pages (Outlet). Tous les rôles y accèdent.
export function TAuthenticatedLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)

  async function handleLogout() {
    try {
      await logout()
      navigate("/login", { replace: true })
    } catch {
      toast.error("Déconnexion impossible")
    }
  }

  return (
    <TAppSidebar
      brand="IDS"
      groups={appNavigation}
      user={
        user
          ? {
              name: user.user_name,
              role: roleLabel(user.role),
              href: "/profile",
            }
          : undefined
      }
      onLogout={() => setConfirmLogout(true)}
      footer="IDS — Gestion de Supermarché · Plateforme interne"
    >
      <MConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Se déconnecter ?"
        description="Votre session sera fermée sur cet appareil. Voulez-vous continuer ?"
        confirmLabel="Se déconnecter"
        destructive
        onConfirm={() => void handleLogout()}
      />
      <Outlet />
    </TAppSidebar>
  )
}
