import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getOperationsCaisse, createOperationCaisse } from "@/services/sharepoint/journalCaisseService"
import type { OperationCaisse } from "@/types/tresorerie"

const QUERY_KEY = ["journal-caisse"]

export function useJournalCaisse() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getOperationsCaisse(token)
    },
  })
}

export function useCreateOperationCaisse() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<OperationCaisse, "id" | "dateSaisie" | "devise">) => {
      const token = await getToken()
      return createOperationCaisse(token, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Opération enregistrée dans le journal")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible d'enregistrer l'opération : ${message}`)
    },
  })
}
