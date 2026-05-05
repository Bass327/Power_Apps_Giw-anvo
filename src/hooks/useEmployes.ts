import { useQuery } from "@tanstack/react-query"
import { getListItems } from "@/lib/graphClient"
import { useAuth } from "@/hooks/useAuth"

export interface Employe {
  id:          string
  nom:         string   // NomComplet ou Title
  email:       string
  role:        string
  departement: string
  poste:       string
}

interface SPEmployeFields {
  Title?:              string
  NomComplet?:         string
  Email?:              string
  R_x00f4_le?:         string
  D_x00e9_partement?:  string
  Poste?:              string
  Actif?:              string
}

interface SPEmployeItem {
  id:     string
  fields: SPEmployeFields
}

/**
 * Retourne la liste des employés actifs depuis Utilisateurs_Giwanvo.
 * Utilisé pour peupler les listes déroulantes de sélection d'employé.
 * Stale time : 10 min (données rarement modifiées en cours de journée).
 */
export function useEmployes() {
  const { isAuthenticated, tryGetToken } = useAuth()

  const query = useQuery<Employe[]>({
    queryKey:  ["employes"],
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000,
    retry:     1,

    queryFn: async (): Promise<Employe[]> => {
      const token = await tryGetToken()
      if (!token) return []

      const items = await getListItems<SPEmployeItem>(token, "Utilisateurs_Giwanvo")

      return items
        .filter((item) => item.fields.Actif !== "Non")
        .map((item) => ({
          id:          item.id,
          nom:         item.fields.NomComplet ?? item.fields.Title ?? "—",
          email:       item.fields.Email ?? "",
          role:        item.fields.R_x00f4_le ?? "",
          departement: item.fields.D_x00e9_partement ?? "",
          poste:       item.fields.Poste ?? "",
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    },
  })

  return {
    employes:  query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
  }
}
