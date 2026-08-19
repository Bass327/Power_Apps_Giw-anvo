import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { detectTeams } from "@/lib/teamsAuth"
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
 * - Teams     : re-auth silencieuse si le token est absent ou expiré, via login()
 *               (SSO natif Teams en priorité, repli sur le flux popup PKCE si besoin).
 * - Navigateur : MSAL localStorage → token renouvelé silencieusement.
 *               Si aucun compte → redirige vers /login.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { inProgress } = useMsal()
  const { isAuthenticated, login } = useAuth()
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

      // Dans Teams sans session active → login() tente le SSO natif Teams en silence,
      // puis se rabat sur le flux popup PKCE si le SSO échoue
      try {
        await login()
        if (!cancelled) setTeamsReady(true)
      } catch {
        // Re-auth silencieuse échouée → on affiche /login
        if (!cancelled) setTeamsReady(false)
      }
    }

    void tryTeamsSilentAuth()
    return () => { cancelled = true }
    // login() est recréée à chaque rendu de useAuth() — l'ajouter en dépendance
    // redéclencherait cet effet en boucle. On ne veut réagir qu'aux changements d'auth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Timeout de sécurité si MSAL reste bloqué (Teams iframe)
  // HandleRedirect est exclu : MSAL doit traiter le code OAuth jusqu'au bout
  useEffect(() => {
    if (
      inProgress === InteractionStatus.None ||
      inProgress === InteractionStatus.HandleRedirect
    ) {
      setTimedOut(false)
      return
    }
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
