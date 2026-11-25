import { useNavigate } from "react-router-dom"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { OFeatureGrid } from "@/components/organisms"
import { useAuth } from "@/context/auth-context"
import { roleLabel } from "@/lib/roles"

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

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isCashier = user?.role === "cashier"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
      <section className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Gestion de Supermarché</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">
              {user.user_name} · {roleLabel(user.role)}
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
          {isCashier ? (
            <AtomButton onClick={() => navigate("/profile")}>
              Mon profil
            </AtomButton>
          ) : (
            <AtomButton onClick={() => navigate("/dashboard")}>
              Ouvrir le tableau de bord
            </AtomButton>
          )}
        </div>
      </section>

      <section id="modules">
        <OFeatureGrid features={[...features]} columns={3} />
      </section>
    </div>
  )
}
