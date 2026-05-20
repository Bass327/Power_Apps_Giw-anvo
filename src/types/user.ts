export type UserRole =
  | 'Employé'
  | 'RAF'
  | 'Chef Dept.'
  | 'Comptable'
  | 'Directrice'

export interface GiwAnvoUser {
  id:          string
  displayName: string
  email:       string
  role:        UserRole
  departement: string
  actif:       boolean
  photoUrl:    string | null
  /** Initiales calculées côté client (ex: "MD" pour "Mamadou Diallo") */
  initials:    string
  /** Titre de poste Microsoft 365 */
  jobTitle:    string
  /** Nom complet depuis la liste SharePoint Utilisateurs_Giwanvo (colonne NomComplet) */
  nomComplet:  string
  /** Intitulé du poste depuis SharePoint (colonne Poste) */
  poste:       string
}

/** Alias de compatibilité — tous les imports existants de CurrentUser continuent de fonctionner */
export type CurrentUser = GiwAnvoUser
