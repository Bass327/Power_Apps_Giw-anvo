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
      // Token expiré → redirection vers Microsoft pour renouveler
      await instance.acquireTokenRedirect(loginRequest)
      // acquireTokenRedirect navigue la page — cette ligne ne sera pas atteinte
      throw new Error("Redirection en cours pour renouveler le token")
    }
  }

  return {
    isAuthenticated: !!account,
    account,
    login,
    logout,
    getToken,
  }
}
