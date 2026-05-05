import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getBudgets, createBudget, logBudgetsColumns } from "@/services/sharepoint/tresorerieBudgetsService"
import type { BudgetFormData } from "@/types/tresorerieTransactions"

const QUERY_KEY = ["tresorerie-budgets"]

export function useTresorerieBudgets() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry:     false,
    queryFn:   async () => {
      try {
        const token = await getToken()
        return await getBudgets(token)
      } catch (err) {
        if (err instanceof Error && err.message.includes("introuvable")) return []
        if (err instanceof Error && err.message.includes("(400)")) {
          // Diagnostic automatique pour identifier les vrais noms de colonnes
          const t = await getToken()
          void logBudgetsColumns(t)
          console.warn("[Budget] Erreur 400 sur Tresorerie_BudgetsMensuels — voir table colonnes ci-dessus.", err.message)
          return []
        }
        throw err
      }
    },
  })
}

export function useCreateBudget() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const token = await getToken()
      return createBudget(token, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Ligne de budget enregistrée")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible d'enregistrer le budget : ${msg}`)
    },
  })
}
