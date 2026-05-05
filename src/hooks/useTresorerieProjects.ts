import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getProjects } from "@/services/sharepoint/tresorerieProjectsService"
import type { TresorerieProject } from "@/types/tresorerieTransactions"

export function useTresorerieProjects() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery<TresorerieProject[]>({
    queryKey:  ["tresorerie-projects"],
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000,
    retry:     false,
    queryFn:   async () => {
      try {
        const token = await getToken()
        return await getProjects(token)
      } catch (err) {
        if (err instanceof Error && err.message.includes("introuvable")) return []
        if (err instanceof Error && err.message.includes("(400)")) {
          console.warn("[Trésorerie] Erreur 400 sur Tresorerie_Projects — vérifier la structure de la liste dans SharePoint.", err.message)
          return []
        }
        throw err
      }
    },
  })
}
