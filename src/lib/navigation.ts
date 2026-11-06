import {
  ChartNoAxesCombinedIcon,
  DatabaseIcon,
  PackageIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShoppingCartIcon,
  UserRoundIcon,
} from "lucide-react"
import type { TAppSidebarGroup } from "@/components/templates/t-app-sidebar"

// Navigation de la barre latérale pour les utilisateurs connectés.
// Le tableau de bord, la validation des comptes et le profil sont des routes ;
// les modules pas encore livrés renvoient vers la vue d'ensemble.
// `roles` masque les entrées réservées à certains rôles (docs/auth.md §5).
export const appNavigation: TAppSidebarGroup[] = [
  {
    items: [
      {
        label: "Tableau de bord",
        icon: ChartNoAxesCombinedIcon,
        href: "/dashboard",
      },
    ],
  },
  {
    label: "Modules",
    items: [
      { label: "Produits", icon: PackageIcon, href: "#modules" },
      { label: "Ventes", icon: ShoppingCartIcon, href: "#modules" },
      { label: "Stock", icon: DatabaseIcon, href: "#modules" },
      { label: "Rapports", icon: ReceiptTextIcon, href: "#modules" },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Validation des comptes",
        icon: ShieldCheckIcon,
        href: "/validation",
        roles: ["superadmin", "admin"],
      },
      { label: "Sécurité", icon: ShieldIcon, href: "#modules" },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Mon profil", icon: UserRoundIcon, href: "/profile" },
      { label: "Paramètres", icon: SettingsIcon, href: "#modules" },
    ],
  },
]
