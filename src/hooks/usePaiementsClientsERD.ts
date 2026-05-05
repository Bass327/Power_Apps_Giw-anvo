import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { logListFieldsFromSite } from "@/lib/graphClient"
import {
  getClientsERD,
  DTO_SITE_PATH,
  LIST_NAME_ERD,
} from "@/services/sharepoint/paiementsClientsERDService"
import type { ClientERD } from "@/types/clientsERD"

const QUERY_KEY = ["clients-erd"]

export interface UseClientsERDResult {
  clients:   ClientERD[]
  isLoading: boolean
  isError:   boolean
  error:     Error | null
  refetch:   () => void
}

/**
 * Hook de données — Clients ERD Kolda
 *
 * Retourne la liste brute des clients avec leurs paiements mensuels.
 * Les KPIs et le filtrage sont calculés directement dans la page
 * en fonction des segments actifs.
 *
 * En mode développement, affiche les champs réels de la liste dans
 * la console pour faciliter le diagnostic du mapping.
 *
 * Stale time : 5 minutes
 */
export function useClientsERD(): UseClientsERDResult {
  const { isAuthenticated, getToken } = useAuth()

  const query = useQuery<ClientERD[]>({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<ClientERD[]> => {
      const token = await getToken()

      // Diagnostic automatique en développement
      if (import.meta.env.DEV) {
        void logListFieldsFromSite(token, DTO_SITE_PATH, LIST_NAME_ERD)
      }

      return getClientsERD(token)
    },
  })

  return {
    clients:   query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error as Error | null,
    refetch:   query.refetch,
  }
}
