import { useEffect } from "react"
import { ThemeProvider } from "@/providers/theme-provider"
import { SonnerProvider } from "@/providers/sonner-provider"
import { QueryProvider } from "./providers/query-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { RouterProvider } from "react-router-dom"
import { router } from "@/router"
import { initTeams } from "@/lib/teamsAuth"
import { isPowerAppsEnv } from "@/lib/powerAppsBridge"

export default function App() {
  useEffect(() => {
    // Démarre l'initialisation Teams au montage de l'app.
    // Si dans Teams → notifyAppLoaded() est appelé dès que le SDK répond,
    // ce qui masque le spinner de chargement Teams et affiche notre app.
    // Hors Teams → timeout de 3 s puis no-op.
    if (!isPowerAppsEnv()) {
      void initTeams()
    }
  }, [])

  return (
    <ThemeProvider>
      <SonnerProvider>
        <AuthProvider>
          <QueryProvider>
            <RouterProvider router={router} />
          </QueryProvider>
        </AuthProvider>
      </SonnerProvider>
    </ThemeProvider>
  )
}