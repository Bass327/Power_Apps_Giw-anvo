import * as microsoftTeams from "@microsoft/teams-js"

const TEAMS_TOKEN_KEY = "giwanvo.teams.token"
const TEAMS_TOKEN_EXP = "giwanvo.teams.token.exp"

/** Détecte si l'app tourne dans Microsoft Teams (Desktop ou Web). */
export async function detectTeams(): Promise<boolean> {
  try {
    await microsoftTeams.app.initialize()
    return true
  } catch {
    return false
  }
}

/** Lance le flux OAuth Teams SDK (PKCE, sans popup bloqué). */
export async function teamsLogin(clientId: string, tenantId: string): Promise<void> {
  const scopes = "User.Read Sites.Read.All Sites.ReadWrite.All"
  const url =
    window.location.origin +
    "/auth-start.html" +
    "?c=" + encodeURIComponent(clientId) +
    "&t=" + encodeURIComponent(tenantId) +
    "&s=" + encodeURIComponent(scopes)

  const raw = await microsoftTeams.authentication.authenticate({ url, width: 600, height: 535 })

  // auth-end.html renvoie un JSON { accessToken, expiresIn }
  const { accessToken, expiresIn } = JSON.parse(raw as string) as {
    accessToken: string
    expiresIn:  number
  }

  sessionStorage.setItem(TEAMS_TOKEN_KEY, accessToken)
  sessionStorage.setItem(TEAMS_TOKEN_EXP, String(Date.now() + expiresIn * 1000))
}

/** Retourne le token Teams stocké, ou null s'il est absent / expiré. */
export function getStoredTeamsToken(): string | null {
  try {
    const token = sessionStorage.getItem(TEAMS_TOKEN_KEY)
    const exp   = sessionStorage.getItem(TEAMS_TOKEN_EXP)
    if (!token || !exp) return null
    // Marge de 2 min pour éviter d'utiliser un token quasi-expiré
    if (Date.now() > parseInt(exp) - 120_000) {
      sessionStorage.removeItem(TEAMS_TOKEN_KEY)
      sessionStorage.removeItem(TEAMS_TOKEN_EXP)
      return null
    }
    return token
  } catch { return null }
}

/** Supprime le token Teams (déconnexion). */
export function clearTeamsToken(): void {
  sessionStorage.removeItem(TEAMS_TOKEN_KEY)
  sessionStorage.removeItem(TEAMS_TOKEN_EXP)
}
