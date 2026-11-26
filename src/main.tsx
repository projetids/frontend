import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { AppRouter } from "./router/index.tsx"
import { MToaster } from "@/components/molecules"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { PaletteProvider } from "@/components/palette-provider.tsx"
import { AuthProvider } from "@/context/auth-context"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <PaletteProvider>
          <AppRouter />
          <MToaster />
        </PaletteProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)
