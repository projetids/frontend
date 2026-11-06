import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { OFeatureGrid, ONavbar } from "@/components/organisms"
import { TAppShell } from "@/components/templates"
import { useAuth } from "@/context/auth-context"

const features = [
  {
    icon: "package",
    title: "Produits",
    description:
      "Catalogue complet du supermarché : prix, catégories et références.",
    badge: "Catalogue",
  },
  {
    icon: "cart",
    title: "Ventes",
    description: "Caisse rapide, tickets et historique des transactions.",
    badge: "Caisse",
  },
  {
    icon: "database",
    title: "Stock",
    description:
      "Inventaire en temps réel et alertes de rupture de stock.",
    badge: "Inventaire",
  },
  {
    icon: "users",
    title: "Utilisateurs",
    description:
      "Comptes et permissions selon le rôle : superadmin, admin, caissier.",
    badge: "Comptes",
  },
  {
    icon: "shield",
    title: "Sécurité",
    description:
      "Sessions, rafraîchissement automatique des tokens et récupération de mot de passe.",
    badge: "Authentification",
  },
  {
    icon: "receipt",
    title: "Rapports",
    description: "Bilan des ventes et suivi de la performance du magasin.",
    badge: "Analyse",
  },
] as const

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  caisier: "Caissier",
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  async function handleLogout() {
    try {
      await logout()
      navigate("/login", { replace: true })
    } catch {
      toast.error("Déconnexion impossible")
    }
  }

  return (
    <TAppShell
      header={
        <ONavbar
          brand="IDS"
          links={[{ label: "Tableau de bord", href: "/dashboard" }]}
          action={{ label: "Déconnexion", onClick: () => void handleLogout() }}
        />
      }
      footer="IDS — Gestion de Supermarché · Plateforme interne"
    >
      <div className="flex flex-col gap-10">
        <section className="flex max-w-2xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <AtomBadge variant="outline">Gestion de Supermarché</AtomBadge>
            {user ? (
              <AtomBadge variant="secondary">
                {user.user_name} · {roleLabels[user.role] ?? user.role}
              </AtomBadge>
            ) : null}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Bienvenue sur IDS{user ? `, ${user.user_name}` : ""}
          </h1>
          <p className="text-muted-foreground text-lg">
            La plateforme IDS centralise la gestion du supermarché&nbsp;:
            catalogue produits, caisse, stock et comptes utilisateurs —
            dans une interface simple et sécurisée.
          </p>
          <div>
            <AtomButton onClick={() => navigate("/dashboard")}>
              Ouvrir le tableau de bord
            </AtomButton>
          </div>
        </section>

        <section id="modules">
          <OFeatureGrid features={[...features]} columns={3} />
        </section>
      </div>
    </TAppShell>
  )
}
