import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getTypesDepenses } from "@/services/sharepoint/tresorerieTypesDepensesService"
import type { TypeDepense } from "@/types/tresorerieTransactions"

export function useTresorerieTypesDepenses() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery<TypeDepense[]>({
    queryKey:  ["tresorerie-types-depenses"],
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000,
    retry:     false,
    queryFn:   async () => {
      try {
        const token = await getToken()
        return await getTypesDepenses(token)
      } catch (err) {
        if (err instanceof Error && err.message.includes("introuvable")) return []
        if (err instanceof Error && err.message.includes("(400)")) {
          console.warn("[Trésorerie] Erreur 400 sur Tresorerie_TypesDepenses — vérifier la structure de la liste dans SharePoint.", err.message)
          return []
        }
        throw err
      }
    },
  })
}
