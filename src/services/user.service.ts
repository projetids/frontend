import { API_URL } from "@/lib/env"

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  email: string
  name?: string
}

export type LoginResponse = {
  accessToken: string
  user: AuthUser
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || "Échec de la connexion")
  }

  return (await response.json()) as LoginResponse
}

export const userService = { login }