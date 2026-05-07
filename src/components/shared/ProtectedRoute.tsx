import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import {
  detectTeams,
  teamsLogin,
  notifyTeamsReady,
  getStoredTeamsToken,
} from "@/lib/teamsAuth"
import { isPowerAppsEnv } from "@/lib/powerAppsBridge"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const MSAL_TIMEOUT_MS = 6000

/**
 * Protège une route.
 *
 * Scénarios gérés :
 * - PowerApps : accès direct (pas d'auth côté client)
 * - Teams     : re-auth silencieuse si le token est absent ou expiré.
 *               Azure AD complète automatiquement le flux PKCE via SSO Teams
 *               sans que l'utilisateur n'ait besoin d'intervenir.
 * - Navigateur : MSAL localStorage → token renouvelé silencieusement.
 *               Si aucun compte → redirige vers /login.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { inProgress } = useMsal()
  const { isAuthenticated } = useAuth()
  const [timedOut,      setTimedOut]      = useState(false)
  // null = pas encore déterminé, true = prêt, false = re-auth échouée
  const [teamsReady,    setTeamsReady]    = useState<boolean | null>(
    // Si déjà authentifié dès le montage, pas besoin d'attendre
    isAuthenticated ? true : null,
  )

  useEffect(() => {
    // Déjà authentifié (token valide en localStorage) → rien à faire
    if (isAuthenticated) {
      setTeamsReady(true)
      return
    }

    // PowerApps → accès direct
    if (isPowerAppsEnv()) {
      setTeamsReady(true)
      return
    }

    let cancelled = false

    const tryTeamsSilentAuth = async () => {
      const inTeams = await detectTeams()

      // Hors Teams et hors PowerApps → MSAL gère ; on laisse passer
      if (!inTeams) {
        if (!cancelled) setTeamsReady(true)
        return
      }

      // Dans Teams : si aucun token valide → re-auth silencieuse via Azure AD SSO
      if (!getStoredTeamsToken()) {
        try {
          const clientId = import.meta.env.VITE_CLIENT_ID as string
          const tenantId = import.meta.env.VITE_TENANT_ID as string
          // Le popup se ferme tout seul grâce au SSO Azure AD — l'utilisateur
          // ne voit généralement pas la fenêtre s'afficher
          await teamsLogin(clientId, tenantId)
          notifyTeamsReady()
        } catch {
          // Re-auth silencieuse échouée → on affiche /login
          if (!cancelled) setTeamsReady(false)
          return
        }
      }

      if (!cancelled) setTeamsReady(true)
    }

    void tryTeamsSilentAuth()
    return () => { cancelled = true }
  }, [isAuthenticated])

  // Timeout de sécurité si MSAL reste bloqué (Teams iframe)
  useEffect(() => {
    if (inProgress === InteractionStatus.None) { setTimedOut(false); return }
    const id = setTimeout(() => setTimedOut(true), MSAL_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [inProgress])

  if (timedOut) return <Navigate to="/login" replace />

  // Re-auth Teams échouée → login obligatoire
  if (teamsReady === false) return <Navigate to="/login" replace />

  // En attente : MSAL en cours OU re-auth Teams en cours
  const waiting =
    inProgress !== InteractionStatus.None ||
    teamsReady === null

  if (waiting) {
    return (
      <div
        className="flex items-center justify-center h-screen w-screen"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "#f0a500", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-display" style={{ color: "#7a9e87" }}>
            Vérification de la session…
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
