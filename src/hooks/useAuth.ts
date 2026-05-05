import { useMsal } from "@azure/msal-react"
import { loginRequest } from "@/lib/msalConfig"
import { isPowerAppsEnv, tryGetTokenFromBridge } from "@/lib/powerAppsBridge"

const MSAL_STUB = { instance: null as never, accounts: [] as never[] }

export const useAuth = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const msal    = isPowerAppsEnv() ? MSAL_STUB : useMsal()
  const account = msal.accounts[0]

  const isAuthenticated = isPowerAppsEnv() || !!account

  const redirectUri = window.location.origin + "/"

  const login = async (): Promise<void> => {
    if (isPowerAppsEnv()) return
    // Toujours utiliser loginRedirect — les popups sont bloqués dans Teams et certains navigateurs
    await msal.instance.loginRedirect({ ...loginRequest, redirectUri })
  }

  const logout = (): void => {
    if (isPowerAppsEnv()) return
    msal.instance.logoutRedirect({ account }).catch((e: unknown) => {
      console.error("[Auth] Erreur déconnexion redirect :", e)
    })
  }

  /**
   * Récupère un token Microsoft Graph.
   * En Power Apps : via window.powerAppsBridge (nécessite connection reference).
   * En dev/navigateur : via MSAL silent → popup → redirect.
   * Lève une exception si le token est indisponible.
   * Utiliser tryGetToken() pour une version sans exception.
   */
  const getToken = async (): Promise<string> => {
    if (isPowerAppsEnv()) {
      const t = await tryGetTokenFromBridge("https://graph.microsoft.com")
      if (!t) throw new Error("Token Graph indisponible (connexion Power Apps non configurée)")
      return t
    }
    const msalAccount = account ?? msal.instance.getAllAccounts()[0]
    if (!msalAccount) {
      await login()
      throw new Error("Reconnexion requise — veuillez réessayer")
    }
    try {
      const r = await msal.instance.acquireTokenSilent({ ...loginRequest, account: msalAccount })
      return r.accessToken
    } catch {
      // Redirect pour le renouvellement de token — compatible Teams et navigateurs strict
      await msal.instance.acquireTokenRedirect({ ...loginRequest, account: msalAccount })
      throw new Error("Redirection en cours pour renouveler le token")
    }
  }

  /**
   * Variante sans exception de getToken().
   * Retourne null si le token est indisponible pour n'importe quelle raison.
   * Permet un dégradé gracieux : l'app reste fonctionnelle sans données Graph.
   */
  const tryGetToken = async (): Promise<string | null> => {
    try {
      return await getToken()
    } catch (err) {
      console.warn("[Auth] tryGetToken → null :", (err as Error).message)
      return null
    }
  }

  /**
   * Récupère un token SharePoint REST API (audience distincte de Graph).
   * Utilisé pour les pièces jointes via l'API REST native SharePoint.
   * Lève une exception si indisponible — utiliser tryGetSharePointToken() sinon.
   */
  const getSharePointToken = async (): Promise<string> => {
    const spHostname = import.meta.env.VITE_SHAREPOINT_HOSTNAME as string
    if (isPowerAppsEnv()) {
      const t = await tryGetTokenFromBridge(`https://${spHostname}`)
      if (!t) throw new Error("Token SharePoint indisponible")
      return t
    }
    const spResource  = `https://${spHostname}`
    const msalAccount = account ?? msal.instance.getAllAccounts()[0]
    if (!msalAccount) { await login(); throw new Error("Reconnexion requise") }
    const spRequest = { scopes: [`${spResource}/.default`], account: msalAccount }
    try {
      const r = await msal.instance.acquireTokenSilent(spRequest)
      return r.accessToken
    } catch {
      await msal.instance.acquireTokenRedirect(spRequest)
      throw new Error("Redirection en cours")
    }
  }

  /** Variante sans exception de getSharePointToken(). */
  const tryGetSharePointToken = async (): Promise<string | null> => {
    try {
      return await getSharePointToken()
    } catch (err) {
      console.warn("[Auth] tryGetSharePointToken → null :", (err as Error).message)
      return null
    }
  }

  return {
    isAuthenticated,
    account,
    login,
    logout,
    getToken,
    tryGetToken,
    getSharePointToken,
    tryGetSharePointToken,
  }
}
