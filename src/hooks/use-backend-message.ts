import { useState } from "react"
import { toast } from "sonner"

export type BackendResponse<T = unknown> = {
  message?: string
  data?: T
  [key: string]: unknown
}

export function useBackendMessage() {
  const [message, setMessage] = useState<string | null>(null)

  function notify(response: BackendResponse, fallback?: string) {
    const msg = response?.message ?? fallback
    if (!msg) return
    setMessage(msg)
    toast.success(msg)
  }

  function notifyError(error: unknown, fallback = "Une erreur est survenue") {
    const msg = error instanceof Error ? error.message : fallback
    setMessage(msg)
    toast.error(msg)
  }

  return { message, notify, notifyError }
}