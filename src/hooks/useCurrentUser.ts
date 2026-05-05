import { useQuery } from "@tanstack/react-query"
import { graphFetch, graphFetchBlob, getListItems } from "@/lib/graphClient"
import { useAuth } from "@/hooks/useAuth"
import { isPowerAppsEnv, getContextFromBridge } from "@/lib/powerAppsBridge"
import type { GiwAnvoUser, UserRole } from "@/types/user"

// ─── Types internes ───────────────────────────────────────────────────────────

interface MsGraphUser {
  id:                string
  displayName:       string
  mail:              string | null
  userPrincipalName: string
  jobTitle:          string | null
}

interface SPUserFields {
  Title:              string
  R_x00f4_le?:        string
  D_x00e9_partement?: string
  Actif?:             string
}

interface SPUserItem {
  id:     string
  fields: SPUserFields
}

// ─── Utilitaires purs ─────────────────────────────────────────────────────────

/** Génère 2 initiales depuis un nom complet (ex: "Mamadou Diallo" → "MD"). */
function buildInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join("")
}

/**
 * Normalise un rôle brut SharePoint vers une valeur typée.
 * Insensible à la casse, tolère les variantes courantes de saisie.
 * Retourne "Employé" en dernier recours — jamais d'exception.
 */
function parseRole(raw: string | undefined): UserRole {
  if (!raw) return "Employé"

  const VALID: UserRole[] = ["Employé", "RAF", "Chef Dept.", "Comptable", "Directrice"]
  const exact = VALID.find(r => r === raw)
  if (exact) return exact

  const lower = raw.trim().toLowerCase()
  const ALIASES: Record<string, UserRole> = {
    "employe":                       "Employé",
    "employé(e)":                    "Employé",
    "employe(e)":                    "Employé",
    "collaborateur":                 "Employé",
    "chef dept":                     "Chef Dept.",
    "chef":                          "Chef Dept.",
    "chef de département":           "Chef Dept.",
    "chef departement":              "Chef Dept.",
    "directeur":                     "Directrice",
    "directeur général":             "Directrice",
    "directrice générale":           "Directrice",
    "dg":                            "Directrice",
    "raf":                           "RAF",
    "responsable administratif":     "RAF",
    "comptable":                     "Comptable",
    "accountant":                    "Comptable",
  }

  if (ALIASES[lower]) return ALIASES[lower]

  console.warn(`[GiwAnvo] Rôle non reconnu : "${raw}" → défaut Employé`)
  return "Employé"
}

/**
 * Recherche l'utilisateur dans les items SharePoint.
 * Passe 1 : email (fiable même si le nom d'affichage diffère entre M365 et SP).
 * Passe 2 : Title (nom court) en dernier recours.
 */
function matchSPUser(
  items:       SPUserItem[],
  displayName: string,
  email:       string,
): SPUserItem | undefined {
  if (!items.length) return undefined

  const emailLower = email.toLowerCase()
  const nameLower  = displayName.toLowerCase()

  const byEmail = items.find(item => {
    const f = item.fields as unknown as Record<string, string>
    return (
      f.Email?.toLowerCase()        === emailLower ||
      f.UserEmail?.toLowerCase()    === emailLower ||
      f.EmailAddress?.toLowerCase() === emailLower
    )
  })
  if (byEmail) return byEmail

  return items.find(item =>
    item.fields.Title?.toLowerCase() === nameLower
  )
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export const useCurrentUser = () => {
  const { isAuthenticated, tryGetToken } = useAuth()

  const query = useQuery<GiwAnvoUser>({
    queryKey:  ["current-user"],
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000,
    retry:     1,

    queryFn: async (): Promise<GiwAnvoUser> => {

      // ── Étape 1 : Identité ─────────────────────────────────────────────────
      //
      //   Power Apps → SDK AppLifecycle.getContext (garanti, pas de token requis)
      //   Dev/navigateur → Graph /me (token MSAL requis)
      //
      let displayName = ""
      let email       = ""
      let msUserId    = ""
      let jobTitle    = "Collaborateur"

      if (isPowerAppsEnv()) {
        try {
          const ctx = await getContextFromBridge()
          displayName = ctx.fullName          ?? ""
          email       = ctx.userPrincipalName ?? ""
          msUserId    = ctx.objectId          ?? ""
          console.info("[GiwAnvo] ✅ Identité SDK :", { displayName, email })
        } catch (err) {
          console.error("[GiwAnvo] ❌ Contexte SDK inaccessible :", err)
          // displayName / email restent vides → l'app continue avec un profil minimal
        }
      }

      // ── Étape 2 : Token Graph (best-effort) ───────────────────────────────
      //
      //   Power Apps : nécessite window.powerAppsBridge + connection reference configurée.
      //   Si absent → token null → étapes 3 et 4 sautées → rôle "Employé", photo initiales.
      //   Dev : MSAL, toujours disponible après login.
      //
      const token = await tryGetToken()

      if (!token) {
        console.warn(
          "[GiwAnvo] ⚠️ Token Graph indisponible" +
          (isPowerAppsEnv() ? " — configurez une connection reference SharePoint/Office365" : "") +
          " → rôle: Employé, photo: initiales"
        )
      }

      // Compléter l'identité via /me en mode dev (champs absents du SDK en Power Apps)
      if (!isPowerAppsEnv() && token) {
        try {
          const me = await graphFetch<MsGraphUser>(token, "/me")
          displayName = me.displayName
          email       = me.mail ?? me.userPrincipalName
          msUserId    = me.id
          jobTitle    = me.jobTitle ?? "Collaborateur"
        } catch (err) {
          console.error("[GiwAnvo] ❌ Erreur /me :", err)
        }
      }

      // ── Étape 3 : Rôle et département (Utilisateurs_Giwanvo) ──────────────
      //
      //   Requiert un token. Silencieux si absent.
      //   En cas d'erreur SP (liste inaccessible, timeout…) → "Employé" par défaut.
      //
      let role:        UserRole = "Employé"
      let departement: string   = ""
      let actif:       boolean  = true

      // Override de rôle via le sélecteur (réservé au compte propriétaire de l'app)
      const roleOverride = localStorage.getItem("role_override") as UserRole | null
      if (roleOverride) {
        role = roleOverride
        console.info(`[GiwAnvo] 🛠️ Rôle simulé : ${role}`)
      }

      if (!roleOverride && token && email) {
        try {
          const items = await getListItems<SPUserItem>(token, "Utilisateurs_Giwanvo")
          const found = matchSPUser(items, displayName, email)

          if (found) {
            role        = parseRole(found.fields.R_x00f4_le)
            departement = found.fields.D_x00e9_partement ?? ""
            actif       = found.fields.Actif !== "Non"
            console.info(`[GiwAnvo] ✅ Rôle SP : ${role} | Dép : ${departement}`)
          } else {
            console.warn(
              `[GiwAnvo] ⚠️ Non trouvé dans Utilisateurs_Giwanvo (${items.length} items)\n` +
              `  email: "${email}" | displayName: "${displayName}" → rôle: Employé`
            )
          }
        } catch (err) {
          console.warn("[GiwAnvo] ⚠️ Lecture SP échouée — rôle: Employé :", (err as Error).message)
        }
      }

      // ── Étape 4 : Photo de profil ─────────────────────────────────────────
      //
      //   Non critique : le Header affiche les initiales si photoUrl est null.
      //   Silencieux en cas d'échec (pas de photo = normal pour certains comptes M365).
      //
      let photoUrl: string | null = null
      if (token) {
        try {
          photoUrl = await graphFetchBlob(token, "/me/photo/$value")
        } catch { /* non critique — initiales affichées */ }
      }

      return {
        id:          msUserId,
        displayName,
        email,
        initials:    buildInitials(displayName || "?"),
        role,
        departement,
        actif,
        jobTitle,
        photoUrl,
      }
    },
  })

  const role: UserRole | undefined = query.data?.role

  /** Vérifie si l'utilisateur a exactement le rôle donné. */
  const hasRole = (r: UserRole): boolean => role === r

  /**
   * Vérifie si l'utilisateur peut valider dans le circuit d'approbation.
   * Chef Dept. (N1) → RAF (N2) → Directrice (N3) → Comptable (paiement).
   */
  const canApprove = (): boolean =>
    role === "Chef Dept." ||
    role === "RAF"        ||
    role === "Directrice" ||
    role === "Comptable"

  return {
    ...query,
    user:       query.data,
    role,
    hasRole,
    canApprove,
  }
}
