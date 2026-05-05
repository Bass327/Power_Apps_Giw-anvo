/**
 * Pont de communication avec le player Power Apps.
 *
 * Décision d'architecture :
 *   On n'instancie jamais de FallbackBridge car cela crée une seconde
 *   initialisation concurrente avec le bridge interne du SDK, que le player
 *   ignore — provoquant un timeout systématique de 8s sur le token.
 *   On attend window.powerAppsBridge (injecté par le player) et on retourne
 *   null si absent, sans jamais lever d'exception.
 */

import { getContext as sdkGetContext } from "@microsoft/power-apps/app"

// ─── Détection environnement ──────────────────────────────────────────────────

/**
 * Retourne true si l'app tourne dans le player Power Apps.
 * On vérifie uniquement le hostname Power Apps — pas l'iframe,
 * car Teams charge aussi l'app dans un iframe et ne doit pas bypasser MSAL.
 */
export const isPowerAppsEnv = (): boolean => {
  if (typeof window === "undefined") return false
  const { hostname } = window.location
  return (
    hostname === "apps.powerapps.com"                  ||
    hostname.endsWith(".powerplatformusercontent.com") ||
    hostname.endsWith(".powerapps.com")
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NativeBridge {
  initialize():                                                              Promise<void>
  executePluginAsync(service: string, action: string, params?: unknown[]): Promise<unknown>
}

declare global {
  interface Window { powerAppsBridge?: NativeBridge }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BRIDGE_POLL_MS = 100
const BRIDGE_WAIT_MS = 5_000   // délai max pour attendre window.powerAppsBridge
const TOKEN_RACE_MS  = 10_000  // délai max pour AppIdentityServicePlugin

// ─── Bridge natif ─────────────────────────────────────────────────────────────

/**
 * Attend que window.powerAppsBridge soit injecté par le player.
 * Retourne null si absent après BRIDGE_WAIT_MS — pas d'exception.
 */
async function awaitNativeBridge(): Promise<NativeBridge | null> {
  if (window.powerAppsBridge) return window.powerAppsBridge
  const deadline = Date.now() + BRIDGE_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise<void>(r => setTimeout(r, BRIDGE_POLL_MS))
    if (window.powerAppsBridge) return window.powerAppsBridge
  }
  return null
}

// ─── Token ────────────────────────────────────────────────────────────────────

/**
 * Tente d'acquérir un access token pour une ressource Microsoft.
 *
 * Retourne null (sans exception) si :
 *   - window.powerAppsBridge est absent après 5s (contexte Code App sans bridge)
 *   - AppIdentityServicePlugin ne répond pas dans les 10s
 *   - Token reçu vide ou non-string
 *   - Connexion Power Apps non configurée pour la ressource
 *
 * Prérequis pour obtenir un token réel :
 *   Ajouter une connection reference dans power.config.json via
 *   `pac code add-data-source --apiId <apiId> --connectionId <id>`.
 */
export async function tryGetTokenFromBridge(resource: string): Promise<string | null> {
  const bridge = await awaitNativeBridge()

  if (!bridge) {
    console.warn(`[Bridge] window.powerAppsBridge absent (${BRIDGE_WAIT_MS / 1000}s) — token null pour ${resource}`)
    return null
  }

  try {
    const raw = await Promise.race([
      bridge.executePluginAsync(
        "AppIdentityServicePlugin",
        "getAppDynamicResourceAccessTokenAsync",
        [resource],
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TOKEN_RACE_MS)
      ),
    ])

    if (typeof raw !== "string" || !raw) {
      console.warn(`[Bridge] Token invalide pour ${resource} (type: ${typeof raw})`)
      return null
    }

    console.info(`[Bridge] ✅ Token obtenu pour ${resource} (${raw.length} chars)`)
    return raw
  } catch (err) {
    console.warn(`[Bridge] ❌ Token échoué pour ${resource} :`, (err as Error).message)
    return null
  }
}

// ─── Contexte utilisateur ─────────────────────────────────────────────────────

export interface PowerAppsUserContext {
  fullName?:          string
  objectId?:          string
  tenantId?:          string
  userPrincipalName?: string
}

/**
 * Retourne le contexte utilisateur via l'API officielle du SDK.
 * Appelle AppLifecycle.getContext — disponible dans tous les contextes Power Apps,
 * même sans window.powerAppsBridge ni connection reference.
 */
export async function getContextFromBridge(): Promise<PowerAppsUserContext> {
  const ctx = await sdkGetContext()
  return {
    fullName:          ctx.user.fullName,
    objectId:          ctx.user.objectId,
    tenantId:          ctx.user.tenantId,
    userPrincipalName: ctx.user.userPrincipalName,
  }
}
