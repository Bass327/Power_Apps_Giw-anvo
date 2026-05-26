import * as microsoftTeams from "@microsoft/teams-js"

// localStorage : le token survit aux rechargements de l'iframe Teams et aux fermetures de session
const TEAMS_TOKEN_KEY         = "giwanvo.teams.token"
const TEAMS_TOKEN_EXP         = "giwanvo.teams.token.exp"
const TEAMS_REFRESH_TOKEN_KEY = "giwanvo.teams.refresh_token"
const TEAMS_CLIENT_ID_KEY     = "giwanvo.teams.client_id"
const TEAMS_TENANT_ID_KEY     = "giwanvo.teams.tenant_id"

// Résultat mis en cache pour éviter de ré-initialiser le SDK à chaque appel
let _teamsDetected: Promise<boolean> | null = null

/**
 * Initialise le SDK Teams au démarrage de l'app.
 *
 * Doit être appelé une seule fois au montage de l'app (useEffect dans App.tsx).
 * - Si dans Teams → notifyAppLoaded() masque le spinner de chargement Teams
 *   et affiche notre app. Sans cet appel, Teams déclenche un timeout.
 * - Timeout 8 s : hors Teams, initialize() ne reçoit jamais de réponse
 *   et pend indéfiniment.
 */
export function initTeams(): Promise<boolean> {
  if (_teamsDetected) return _teamsDetected
  _teamsDetected = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 8_000)
    microsoftTeams.app.initialize()
      .then(() => {
        clearTimeout(timer)
        // Signale à Teams que l'app est chargée et visible
        microsoftTeams.app.notifyAppLoaded()
        resolve(true)
      })
      .catch(() => { clearTimeout(timer); resolve(false) })
  })
  return _teamsDetected
}

/** Détecte si l'app tourne dans Microsoft Teams — utilise le cache d'initTeams(). */
export function detectTeams(): Promise<boolean> {
  return initTeams()
}

/** Signale à Teams que l'app est entièrement prête (après auth réussie). */
export function notifyTeamsReady(): void {
  try { microsoftTeams.app.notifySuccess() } catch (_) { /* hors Teams : no-op */ }
}

const LS_RESULT = "giwanvo_pkce_result"
const LS_ERROR  = "giwanvo_pkce_error"

/** Lance le flux OAuth PKCE via la popup Teams SDK.
 *
 *  Double canal de réception du token :
 *  1. authenticate() Promise — fonctionne si notifySuccess() est bien routé par Teams.
 *  2. Événement storage — auth-end.html écrit le résultat dans localStorage avant
 *     de fermer la popup ; la fenêtre principale le lit via l'événement storage.
 *     Fiable même quand Teams Desktop ne route pas notifySuccess().
 */
export function teamsLogin(clientId: string, tenantId: string): Promise<void> {
  // offline_access : nécessaire pour obtenir un refresh token (session persistante)
  const scopes = "User.Read Sites.Read.All Sites.ReadWrite.All TeamsActivity.Send offline_access"
  const url =
    window.location.origin +
    "/auth-start.html" +
    "?c=" + encodeURIComponent(clientId) +
    "&t=" + encodeURIComponent(tenantId) +
    "&s=" + encodeURIComponent(scopes)

  // Nettoie les résultats d'une éventuelle tentative précédente
  localStorage.removeItem(LS_RESULT)
  localStorage.removeItem(LS_ERROR)

  return new Promise<void>((resolve, reject) => {
    let settled   = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const storeToken = (payload: string) => {
      const {
        accessToken,
        expiresIn,
        refreshToken,
        clientId:  cid,
        tenantId:  tid,
      } = JSON.parse(payload) as {
        accessToken:   string
        expiresIn:     number
        refreshToken?: string | null
        clientId?:     string
        tenantId?:     string
      }
      localStorage.setItem(TEAMS_TOKEN_KEY, accessToken)
      localStorage.setItem(TEAMS_TOKEN_EXP, String(Date.now() + expiresIn * 1000))
      // Stockage du refresh token pour la session persistante
      if (refreshToken) localStorage.setItem(TEAMS_REFRESH_TOKEN_KEY, refreshToken)
      if (cid)          localStorage.setItem(TEAMS_CLIENT_ID_KEY, cid)
      if (tid)          localStorage.setItem(TEAMS_TENANT_ID_KEY, tid)
      localStorage.removeItem(LS_RESULT)
    }

    const done = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (pollTimer) clearInterval(pollTimer)
      window.removeEventListener("storage", onStorage)
      action()
    }

    const timer = setTimeout(() => {
      done(() => reject(new Error(
        "Teams auth timeout — vérifiez que l'URI https://" +
        window.location.host + "/auth-end.html est bien enregistrée dans Azure AD"
      )))
    }, 45_000)

    // Canal 2 : storage event (Teams Web — popup et frame à la même origine)
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_RESULT && e.newValue) {
        done(() => { storeToken(e.newValue!); resolve() })
      }
      if (e.key === LS_ERROR && e.newValue) {
        localStorage.removeItem(LS_ERROR)
        done(() => reject(new Error(e.newValue!)))
      }
    }
    window.addEventListener("storage", onStorage)

    // Canal 3 : polling localStorage (Teams Desktop ne propage pas les storage events
    // entre webviews distincts — seul canal fiable avec notifySuccess)
    pollTimer = setInterval(() => {
      const result = localStorage.getItem(LS_RESULT)
      if (result) { done(() => { storeToken(result); resolve() }); return }
      const error = localStorage.getItem(LS_ERROR)
      if (error) { localStorage.removeItem(LS_ERROR); done(() => reject(new Error(error))) }
    }, 500)

    // Canal 1 : authenticate() Promise — résolu par notifySuccess dans auth-end.html
    microsoftTeams.authentication.authenticate({ url, width: 600, height: 535 })
      .then((raw: unknown) => {
        done(() => { storeToken(raw as string); resolve() })
      })
      .catch((err: unknown) => {
        const msg = String(err instanceof Error ? err.message : err)
        // user_cancelled = popup fermée via window.close() — les canaux 2/3 prennent le relais
        if (!msg.includes("user_cancelled") && !msg.includes("CancelledByUser")) {
          done(() => reject(new Error(msg)))
        }
      })
  })
}

/** Retourne le token Teams stocké, ou null s'il est absent / expiré. */
export function getStoredTeamsToken(): string | null {
  try {
    const token = localStorage.getItem(TEAMS_TOKEN_KEY)
    const exp   = localStorage.getItem(TEAMS_TOKEN_EXP)
    if (!token || !exp) return null
    // Marge de 2 min pour éviter d'utiliser un token quasi-expiré
    if (Date.now() > parseInt(exp) - 120_000) {
      localStorage.removeItem(TEAMS_TOKEN_KEY)
      localStorage.removeItem(TEAMS_TOKEN_EXP)
      return null
    }
    return token
  } catch { return null }
}

/** Vérifie si un refresh token Teams est disponible (session restaurable sans re-login). */
export function hasTeamsRefreshToken(): boolean {
  return !!localStorage.getItem(TEAMS_REFRESH_TOKEN_KEY)
}

/** Supprime le token Teams et toutes les données de session (déconnexion). */
export function clearTeamsToken(): void {
  localStorage.removeItem(TEAMS_TOKEN_KEY)
  localStorage.removeItem(TEAMS_TOKEN_EXP)
  localStorage.removeItem(TEAMS_REFRESH_TOKEN_KEY)
  localStorage.removeItem(TEAMS_CLIENT_ID_KEY)
  localStorage.removeItem(TEAMS_TENANT_ID_KEY)
}

// Mutex pour éviter deux appels parallèles au token endpoint (le refresh token est à usage unique)
let _refreshInFlight: Promise<string | null> | null = null

/**
 * Rafraîchit silencieusement le token Teams à partir du refresh token stocké.
 * Utilise un mutex pour éviter la consommation double du refresh token.
 * Retourne le nouveau access token, ou null si le refresh échoue.
 */
export function refreshTeamsToken(): Promise<string | null> {
  if (_refreshInFlight) return _refreshInFlight
  _refreshInFlight = _doRefresh().finally(() => { _refreshInFlight = null })
  return _refreshInFlight
}

async function _doRefresh(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem(TEAMS_REFRESH_TOKEN_KEY)
    const clientId     = localStorage.getItem(TEAMS_CLIENT_ID_KEY)
    const tenantId     = localStorage.getItem(TEAMS_TENANT_ID_KEY)
    if (!refreshToken || !clientId || !tenantId) return null

    const resp = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     clientId,
          grant_type:    "refresh_token",
          refresh_token: refreshToken,
          // offline_access requis pour recevoir un nouveau refresh token (rotation)
          scope: "User.Read Sites.Read.All Sites.ReadWrite.All TeamsActivity.Send offline_access",
        }),
      }
    )
    const data = await resp.json() as {
      access_token?:  string
      refresh_token?: string
      expires_in?:    number
      error?:         string
    }

    if (!data.access_token) {
      // Refresh token expiré ou révoqué → nettoie la session
      clearTeamsToken()
      return null
    }

    localStorage.setItem(TEAMS_TOKEN_KEY, data.access_token)
    localStorage.setItem(TEAMS_TOKEN_EXP, String(Date.now() + (data.expires_in ?? 3600) * 1000))
    // Microsoft émet un nouveau refresh token (rotation) — on le stocke pour la prochaine fois
    if (data.refresh_token) {
      localStorage.setItem(TEAMS_REFRESH_TOKEN_KEY, data.refresh_token)
    }
    return data.access_token
  } catch {
    return null
  }
}

/**
 * Tente de restaurer silencieusement la session Teams au démarrage de l'app.
 * Appelé dans App.tsx — ne bloque pas le rendu, s'exécute en arrière-plan.
 * - Token encore valide → no-op
 * - Token expiré + refresh token présent → rafraîchit silencieusement
 * - Aucun token → no-op (l'utilisateur devra se reconnecter)
 */
export async function restoreTeamsSession(): Promise<void> {
  // Token encore valide → rien à faire
  if (getStoredTeamsToken()) return
  // Refresh token disponible → tentative de refresh silencieux
  if (hasTeamsRefreshToken()) {
    await refreshTeamsToken()
  }
}
