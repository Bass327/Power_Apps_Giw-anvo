import { useMsal } from "@azure/msal-react"
import { loginRequest } from "@/lib/msalConfig"
import { isPowerAppsEnv, tryGetTokenFromBridge } from "@/lib/powerAppsBridge"
import { detectTeams, teamsLogin, getStoredTeamsToken, clearTeamsToken, notifyTeamsReady } from "@/lib/teamsAuth"

const MSAL_STUB = { instance: null as never, accounts: [] as never[] }

export const useAuth = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const msal    = isPowerAppsEnv() ? MSAL_STUB : useMsal()
  const account = msal.accounts[0]

  // Token Teams (stocké en sessionStorage après connexion via Teams SDK)
  const teamsToken     = getStoredTeamsToken()
  const isAuthenticated = isPowerAppsEnv() || !!account || !!teamsToken

  const redirectUri = window.location.origin + "/"

  const login = async (): Promise<void> => {
    if (isPowerAppsEnv()) return

    // Détection Teams : si oui → flux Teams SDK (PKCE sans popup bloqué)
    const inTeams = await detectTeams()
    if (inTeams) {
      const clientId = import.meta.env.VITE_CLIENT_ID as string
      const tenantId = import.meta.env.VITE_TENANT_ID as string
      await teamsLogin(clientId, tenantId)
      // Auth réussie → signale à Teams que l'app est entièrement prête
      notifyTeamsReady()
      window.location.replace("/")
      return
    }

    // Hors Teams → MSAL popup avec fallback redirect
    try {
      await msal.instance.loginPopup({ ...loginRequest, redirectUri })
    } catch (popupErr: unknown) {
      const msg = popupErr instanceof Error ? popupErr.message : String(popupErr)
      if (msg.includes("popup_window_error") || msg.includes("empty_window_error")) {
        await msal.instance.loginRedirect({ ...loginRequest, redirectUri })
      } else {
        throw popupErr
      }
    }
  }

  const logout = (): void => {
    if (isPowerAppsEnv()) return
    clearTeamsToken()
    if (account) {
      msal.instance.logoutRedirect({ account }).catch((e: unknown) => {
        console.error("[Auth] Erreur déconnexion redirect :", e)
      })
    } else {
      // Session Teams uniquement — recharger la page de login
      window.location.replace("/login")
    }
  }

  /**
   * Récupère un token Microsoft Graph.
   * Priorité : token Teams (stocké) → MSAL silent → MSAL popup → redirect.
   */
  const getToken = async (): Promise<string> => {
    if (isPowerAppsEnv()) {
      const t = await tryGetTokenFromBridge("https://graph.microsoft.com")
      if (!t) throw new Error("Token Graph indisponible (connexion Power Apps non configurée)")
      return t
    }

    // Token issu du flux Teams SDK
    const stored = getStoredTeamsToken()
    if (stored) return stored

    const msalAccount = account ?? msal.instance.getAllAccounts()[0]
    if (!msalAccount) {
      await login()
      throw new Error("Reconnexion requise — veuillez réessayer")
    }
    try {
      const r = await msal.instance.acquireTokenSilent({ ...loginRequest, account: msalAccount })
      return r.accessToken
    } catch {
      try {
        const r = await msal.instance.acquireTokenPopup({ ...loginRequest, account: msalAccount })
        return r.accessToken
      } catch (popupErr: unknown) {
        const msg = popupErr instanceof Error ? popupErr.message : String(popupErr)
        if (msg.includes("popup_window_error") || msg.includes("empty_window_error")) {
          await msal.instance.acquireTokenRedirect({ ...loginRequest, account: msalAccount })
          throw new Error("Redirection en cours pour renouveler le token")
        }
        throw popupErr
      }
    }
  }

  /**
   * Variante sans exception de getToken().
   * Retourne null si le token est indisponible pour n'importe quelle raison.
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
   */
  const getSharePointToken = async (): Promise<string> => {
    const spHostname = import.meta.env.VITE_SHAREPOINT_HOSTNAME as string
    if (isPowerAppsEnv()) {
      const t = await tryGetTokenFromBridge(`https://${spHostname}`)
      if (!t) throw new Error("Token SharePoint indisponible")
      return t
    }

    // En Teams, le token Graph couvre aussi les appels SharePoint via Graph API
    const stored = getStoredTeamsToken()
    if (stored) return stored

    const spResource  = `https://${spHostname}`
    const msalAccount = account ?? msal.instance.getAllAccounts()[0]
    if (!msalAccount) { await login(); throw new Error("Reconnexion requise") }
    const spRequest = { scopes: [`${spResource}/.default`], account: msalAccount }
    try {
      const r = await msal.instance.acquireTokenSilent(spRequest)
      return r.accessToken
    } catch {
      try {
        const r = await msal.instance.acquireTokenPopup(spRequest)
        return r.accessToken
      } catch (popupErr: unknown) {
        const msg = popupErr instanceof Error ? popupErr.message : String(popupErr)
        if (msg.includes("popup_window_error") || msg.includes("empty_window_error")) {
          await msal.instance.acquireTokenRedirect(spRequest)
          throw new Error("Redirection en cours")
        }
        throw popupErr
      }
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
