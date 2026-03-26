import { useIsAuthenticated, useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protège une route : redirige vers /login si l'utilisateur n'est pas connecté.
 * Affiche un écran de chargement pendant l'initialisation de MSAL.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  // MSAL est en cours d'initialisation ou de traitement d'une interaction
  if (inProgress !== InteractionStatus.None) {
    return (
      <div
        className="flex items-center justify-center h-screen w-screen"
        style={{ backgroundColor: "#080f0b" }}
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
