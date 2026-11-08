import { createBrowserRouter, RouterProvider } from "react-router-dom"
import {
  ArticleFamiliesPage,
  ArticlesPage,
  ClientsPage,
  DepotsPage,
  HomePage,
  ProfilePage,
  SuppliersPage,
  UserPermissionsPage,
  ValidationPage,
  StocksPage,
} from "@/pages"
import Login from "@/components/shadcn-studio/blocks/login-page-01/login-page-01"
import Register from "@/components/shadcn-studio/blocks/register-page-01/register-page-01"
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages"
import { TAuthenticatedLayout } from "@/components/templates"
import { ProtectedRoute } from "./protected-route"
import type { ApiRole } from "@/types/api"

export type AppRole = ApiRole

const allRoles: AppRole[] = ["superadmin", "admin", "cashier"]
const managementRoles: AppRole[] = ["superadmin", "admin"]

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <TAuthenticatedLayout />,
        children: [
          { path: "/", element: <HomePage />, handle: { roles: allRoles } },
          {
            path: "/dashboard",
            element: <HomePage />,
            handle: { roles: allRoles },
          },
          {
            path: "/profile",
            element: <ProfilePage />,
            handle: { roles: allRoles },
          },
          {
            path: "/validation",
            element: <ValidationPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/suppliers",
            element: <SuppliersPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/article-families",
            element: <ArticleFamiliesPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/articles",
            element: <ArticlesPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/depots",
            element: <DepotsPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/stocks",
            element: <StocksPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/clients",
            element: <ClientsPage />,
            handle: { roles: managementRoles },
          },
          {
            path: "/user-permissions",
            element: <UserPermissionsPage />,
            handle: { roles: allRoles },
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
