import {
  ArrowLeftRightIcon,
  BoxesIcon,
  ChartNoAxesCombinedIcon,
  ClipboardCheckIcon,
  FolderTreeIcon,
  KeyRoundIcon,
  PackageIcon,
  PaletteIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  TruckIcon,
  UploadIcon,
  UserRoundIcon,
  UsersIcon,
  WarehouseIcon,
  WalletIcon,
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
        roles: ["superadmin", "admin"],
      },
    ],
  },
  {
    label: "Gestion",
    items: [
      {
        label: "Points de vente",
        icon: StoreIcon,
        href: "/point-of-sales",
        roles: ["superadmin", "admin"],
      },
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
        label: "Stocks",
        icon: BoxesIcon,
        href: "/stocks",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Transferts",
        icon: ArrowLeftRightIcon,
        href: "/transferts",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Inventaires",
        icon: ClipboardCheckIcon,
        href: "/inventaires",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Achats",
        icon: ShoppingCartIcon,
        href: "/achats",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Ventes",
        icon: WalletIcon,
        href: "/ventes",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Caisse",
        icon: ShoppingCartIcon,
        href: "/caisse",
        roles: ["superadmin", "admin", "cashier"],
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
      {
        label: "Séparation Articles.xls",
        icon: UploadIcon,
        href: "/split-articles",
        roles: ["superadmin", "admin"],
      },
      {
        label: "Palettes de couleurs",
        icon: PaletteIcon,
        href: "/palettes",
        roles: ["superadmin", "admin"],
      },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Mon profil", icon: UserRoundIcon, href: "/profile" },
    ],
  },
]
