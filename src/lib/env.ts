const FALLBACK_API_URL = "http://localhost:3000/api/v1"

// Vite n'expose que les variables préfixées VITE_, et elles sont publiées dans le bundle.
export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? FALLBACK_API_URL
