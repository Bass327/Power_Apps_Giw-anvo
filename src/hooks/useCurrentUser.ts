import { useQuery } from "@tanstack/react-query"
import { graphFetch, graphFetchBlob, getListItems } from "@/lib/graphClient"
import { useAuth } from "@/hooks/useAuth"
import type { GiwAnvoUser, UserRole } from "@/types/user"

interface MsGraphUser {
  id:                string
  displayName:       string
  mail:              string | null
  userPrincipalName: string
  jobTitle:          string | null
}

interface SharePointUserFields {
  Title:               string
  R_x00f4_le?:         string   // Rôle — nom interne réel (ô encodé)
  D_x00e9_partement?:  string   // Département — nom interne réel (é encodé)
  Actif?:              string   // "Oui" | "Non"
}

interface SharePointUserItem {
  id:     string
  fields: SharePointUserFields
}

/** Génère les initiales à partir du nom complet (ex: "Mamadou Diallo" → "MD") */
function buildInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

/**
 * Vérifie que le rôle correspond exactement à l'une des valeurs autorisées.
 * Sensible à la casse — la liste SharePoint doit utiliser les valeurs exactes.
 */
function parseRole(raw: string | undefined): UserRole {
  const valid: UserRole[] = ["Employé", "RAF", "Chef Dept.", "Comptable", "Directrice"]
  if (valid.includes(raw as UserRole)) return raw as UserRole
  return "Employé"
}

/**
 * Récupère le profil complet de l'utilisateur connecté :
 * - Données Microsoft 365 (nom, email) via Graph /me
 * - Rôle et département GIW'ANVO via la liste SharePoint Utilisateurs_GiwAnvo
 * - Photo de profil Microsoft 365
 */
export const useCurrentUser = () => {
  const { isAuthenticated, getToken } = useAuth()

  const query = useQuery<GiwAnvoUser>({
    queryKey:  ["current-user"],
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000, // Profil mis en cache 10 minutes

    queryFn: async (): Promise<GiwAnvoUser> => {
      const token = await getToken()

      // Récupération du profil Microsoft 365
      const msUser = await graphFetch<MsGraphUser>(token, "/me")
      const email  = msUser.mail ?? msUser.userPrincipalName

      // Rôle par défaut avant lookup SharePoint
      let role:        UserRole = "Employé"
      let departement: string   = ""
      let actif:       boolean  = true

      try {
        const spItems = await getListItems<SharePointUserItem>(
          token,
          "Utilisateurs_Giwanvo",
        )

        // Recherche par nom affiché ou email (insensible à la casse)
        const rawFields = (item: SharePointUserItem) =>
          item.fields as unknown as Record<string, string>

        const spUser = spItems.find(
          (item) =>
            item.fields.Title?.toLowerCase() === msUser.displayName.toLowerCase() ||
            rawFields(item).Email?.toLowerCase()        === email.toLowerCase() ||
            rawFields(item).UserEmail?.toLowerCase()    === email.toLowerCase() ||
            rawFields(item).EmailAddress?.toLowerCase() === email.toLowerCase() ||
            rawFields(item).Demandeur?.toLowerCase()    === email.toLowerCase(),
        )

        if (spUser) {
          role        = parseRole(spUser.fields.R_x00f4_le)
          departement = spUser.fields.D_x00e9_partement ?? ""
          actif       = spUser.fields.Actif !== "Non"
        }
      } catch (err) {
        // Liste SharePoint inaccessible ou colonne manquante — on garde le rôle par défaut
        console.warn("Impossible de récupérer le profil SharePoint:", err)
      }

      // En mode DEV, le RoleSwitcher peut forcer un rôle via localStorage
      if (import.meta.env.DEV) {
        const devRole = localStorage.getItem("dev_role") as UserRole | null
        if (devRole) role = devRole
      }

      // Photo de profil Microsoft 365 — null si absente ou non accessible
      const photoUrl = await graphFetchBlob(token, "/me/photo/$value")

      return {
        id:          msUser.id,
        displayName: msUser.displayName,
        email,
        initials:    buildInitials(msUser.displayName),
        role,
        departement,
        actif,
        jobTitle:    msUser.jobTitle ?? "Collaborateur",
        photoUrl,
      }
    },
  })

  /** Vérifie si l'utilisateur a exactement le rôle donné */
  const hasRole = (r: UserRole): boolean => query.data?.role === r

  /**
   * Vérifie si l'utilisateur peut approuver ou valider dans le circuit.
   * Chef Dept. (N1), RAF (N2), Directrice (finale) et Comptable (paiement).
   */
  const canApprove = (): boolean => {
    const r = query.data?.role
    return r === "Chef Dept." || r === "RAF" || r === "Directrice" || r === "Comptable"
  }

  return {
    ...query,
    /** Profil complet de l'utilisateur (undefined si chargement en cours) */
    user: query.data,
    /** Rôle GIW'ANVO (undefined si chargement en cours) */
    role: query.data?.role,
    hasRole,
    canApprove,
  }
}
