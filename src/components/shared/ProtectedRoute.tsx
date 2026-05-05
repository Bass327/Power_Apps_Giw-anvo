import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const MSAL_TIMEOUT_MS = 6000

/**
 * Protège une route — redirige vers /login si MSAL n'a pas de session active.
 * Un timeout de 6 s force la redirection si MSAL reste bloqué (ex: Teams iframe).
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { inProgress } = useMsal()
  const { isAuthenticated } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // Si MSAL reste bloqué trop longtemps, on force /login
  useEffect(() => {
    if (inProgress === InteractionStatus.None) { setTimedOut(false); return }
    const id = setTimeout(() => setTimedOut(true), MSAL_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [inProgress])

  // MSAL bloqué → on laisse passer pour rediriger vers /login
  if (timedOut) {
    return <Navigate to="/login" replace />
  }

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
