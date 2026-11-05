import type { ComponentProps } from "react"
import { Toaster } from "@/components/ui/sonner"

export type MToasterProps = ComponentProps<typeof Toaster>

export function MToaster(props: MToasterProps) {
  return <Toaster position="top-center" closeButton {...props} />
}
