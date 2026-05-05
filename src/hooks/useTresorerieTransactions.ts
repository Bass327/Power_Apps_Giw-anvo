import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getTransactions,
  createTransaction,
} from "@/services/sharepoint/tresorerieTransactionsService"
import type { TransactionFormData } from "@/types/tresorerieTransactions"

const QUERY_KEY = ["tresorerie-transactions"]

export function useTresorerieTransactions() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    retry:     false,
    queryFn:   async () => {
      try {
        const token = await getToken()
        return await getTransactions(token)
      } catch (err) {
        if (err instanceof Error && err.message.includes("introuvable")) return []
        if (err instanceof Error && err.message.includes("(400)")) {
          console.warn("[Trésorerie] Erreur 400 sur Tresorerie_Transactions — vérifier les colonnes Lookup dans SharePoint.", err.message)
          return []
        }
        throw err
      }
    },
  })
}

export function useCreateTransaction() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      saisiPar,
    }: {
      data:     TransactionFormData
      saisiPar: string
    }) => {
      const token = await getToken()
      return createTransaction(token, data, saisiPar)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Transaction enregistrée avec succès")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible d'enregistrer la transaction : ${msg}`)
    },
  })
}
