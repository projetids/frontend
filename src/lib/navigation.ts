import {
  ChartNoAxesCombinedIcon,
  FolderTreeIcon,
  KeyRoundIcon,
  PackageIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react"
import type { TAppSidebarGroup } from "@/components/templates/t-app-sidebar"

// Navigation de la barre latérale pour les utilisateurs connectés.
// Seules les routes réellement livrées sont listées ; les modules à venir
// seront ajoutés ici au fur et à mesure.
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
    label: "Gestion",
    items: [
      {
        label: "Fournisseurs",
        icon: TruckIcon,
        href: "/suppliers",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Familles d'articles",
        icon: FolderTreeIcon,
        href: "/article-families",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Articles",
        icon: PackageIcon,
        href: "/articles",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Dépôts",
        icon: WarehouseIcon,
        href: "/depots",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Clients",
        icon: UsersIcon,
        href: "/clients",
        roles: ["superadmin", "admin"],
      },
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
      {
        label: "Permissions",
        icon: KeyRoundIcon,
        href: "/user-permissions",
        roles: ["superadmin", "admin"],
      },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Mon profil", icon: UserRoundIcon, href: "/profile" },
      {
        label: "Mes permissions",
        icon: KeyRoundIcon,
        href: "/user-permissions",
        roles: ["cashier"],
      },
    ],
  },
]
