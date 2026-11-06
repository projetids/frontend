import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { HomePage } from "@/pages"
import Login from "@/components/shadcn-studio/blocks/login-page-01/login-page-01"
import Register from "@/components/shadcn-studio/blocks/register-page-01/register-page-01"
import { ProtectedRoute } from "./protected-route"

export type AppRole = "superadmin" | "admin" | "caissier"

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/dashboard", element: <HomePage />, handle: { roles: ["superadmin", "admin", "caissier"] } },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}