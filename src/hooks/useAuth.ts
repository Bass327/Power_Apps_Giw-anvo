import { useMsal } from "@azure/msal-react"
import { loginRequest } from "@/lib/msalConfig"

/**
 * Hook simplifié pour l'authentification MSAL.
 * Expose login, logout, getToken et le statut de connexion.
 */
export const useAuth = () => {
  const { instance, accounts } = useMsal()
  const account = accounts[0]

  /**
   * Redirige vers la page de connexion Microsoft.
   * Mode redirect : plus fiable que popup (pas de bloqueur de fenêtres).
   */
  const login = (): void => {
    instance.loginRedirect(loginRequest).catch((error: unknown) => {
      console.error("Erreur de connexion Microsoft:", error)
    })
  }

  const logout = (): void => {
    instance.logoutRedirect({ account })
  }

  /**
   * Récupère un access token valide.
   * Tente d'abord silencieusement, puis via redirect si nécessaire.
   */
  const getToken = async (): Promise<string> => {
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      return response.accessToken
    } catch {
      await instance.acquireTokenRedirect(loginRequest)
      throw new Error("Redirection en cours pour renouveler le token")
    }
  }

  /**
   * Retourne un token pour l'API REST SharePoint.
   * Audience : https://{tenant}.sharepoint.com (différente de graph.microsoft.com)
   * Nécessaire pour les appels directs à /_api/... (ex: upload de pièces jointes).
   */
  const getSharePointToken = async (): Promise<string> => {
    const spResource = `https://${import.meta.env.VITE_SHAREPOINT_HOSTNAME as string}`
    const spRequest  = { scopes: [`${spResource}/.default`], account }
    try {
      const response = await instance.acquireTokenSilent(spRequest)
      return response.accessToken
    } catch {
      await instance.acquireTokenRedirect(spRequest)
      throw new Error("Redirection en cours pour renouveler le token SharePoint")
    }
  }

  return {
    isAuthenticated: !!account,
    account,
    login,
    logout,
    getToken,
    getSharePointToken,
  }
}
