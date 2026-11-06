import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { HomePage } from "@/pages"
import Login from "@/components/shadcn-studio/blocks/login-page-01/login-page-01"
import Register from "@/components/shadcn-studio/blocks/register-page-01/register-page-01"
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages"
import { ProtectedRoute } from "./protected-route"

export type AppRole = "superadmin" | "admin" | "caisier"

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <HomePage />, handle: { roles: ["superadmin", "admin", "caisier"] } },
      { path: "/dashboard", element: <HomePage />, handle: { roles: ["superadmin", "admin", "caisier"] } },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
