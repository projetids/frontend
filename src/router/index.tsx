import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { HomePage, ProfilePage } from "@/pages"
import Login from "@/components/shadcn-studio/blocks/login-page-01/login-page-01"
import Register from "@/components/shadcn-studio/blocks/register-page-01/register-page-01"
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages"
import { TAuthenticatedLayout } from "@/components/templates"
import { ProtectedRoute } from "./protected-route"

export type AppRole = "superadmin" | "admin" | "caisier"

const allRoles = ["superadmin", "admin", "caisier"]

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
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
