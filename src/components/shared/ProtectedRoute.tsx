import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protège une route — redirige vers /login si MSAL n'a pas de session active.
 * Fonctionne en localhost ET en Power Apps (même flux MSAL).
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { inProgress } = useMsal()
  const { isAuthenticated } = useAuth()

  // MSAL en cours d'initialisation ou d'interaction (ex: renouvellement de token silencieux)
  if (inProgress !== InteractionStatus.None) {
    return (
      <div
        className="flex items-center justify-center h-screen w-screen"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#f0a500", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-display" style={{ color: "#7a9e87" }}>
            Vérification de la session…
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
