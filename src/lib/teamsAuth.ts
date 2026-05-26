import * as microsoftTeams from "@microsoft/teams-js"

// localStorage : le token survit aux rechargements de l'iframe Teams et aux fermetures de session
const TEAMS_TOKEN_KEY = "giwanvo.teams.token"
const TEAMS_TOKEN_EXP = "giwanvo.teams.token.exp"

// Résultat mis en cache pour éviter de ré-initialiser le SDK à chaque appel
let _teamsDetected: Promise<boolean> | null = null

/**
 * Initialise le SDK Teams au démarrage de l'app.
 *
 * Doit être appelé une seule fois au montage de l'app (useEffect dans App.tsx).
 * - Si dans Teams → notifyAppLoaded() masque le spinner de chargement Teams
 *   et affiche notre app. Sans cet appel, Teams déclenche un timeout.
 * - Timeout 3 s : hors Teams, initialize() ne reçoit jamais de réponse
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
  const scopes = "User.Read Sites.Read.All Sites.ReadWrite.All TeamsActivity.Send"
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
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      window.removeEventListener("storage", onStorage)
      reject(new Error(
        "Teams auth timeout — vérifiez que l'URI https://" +
        window.location.host + "/auth-end.html est bien enregistrée dans Azure AD"
      ))
    }, 45_000)

    const storeToken = (payload: string) => {
      const { accessToken, expiresIn } = JSON.parse(payload) as {
        accessToken: string
        expiresIn:   number
      }
      localStorage.setItem(TEAMS_TOKEN_KEY, accessToken)
      localStorage.setItem(TEAMS_TOKEN_EXP, String(Date.now() + expiresIn * 1000))
      localStorage.removeItem(LS_RESULT)
    }

    const done = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener("storage", onStorage)
      action()
    }

    // Canal 2 : storage event (popup → localStorage → fenêtre principale)
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

    // Canal 1 : authenticate() Promise (fonctionne si notifySuccess est routé)
    microsoftTeams.authentication.authenticate({ url, width: 600, height: 535 })
      .then((raw: unknown) => {
        done(() => { storeToken(raw as string); resolve() })
      })
      .catch((err: unknown) => {
        const msg = String(err instanceof Error ? err.message : err)
        // user_cancelled = popup fermée par window.close() sans notifySuccess —
        // cas normal avec notre fallback ; le storage event prend le relais.
        // user_cancelled ou CancelledByUser = popup fermée normalement par l'utilisateur
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

/** Supprime le token Teams (déconnexion). */
export function clearTeamsToken(): void {
  localStorage.removeItem(TEAMS_TOKEN_KEY)
  localStorage.removeItem(TEAMS_TOKEN_EXP)
}
