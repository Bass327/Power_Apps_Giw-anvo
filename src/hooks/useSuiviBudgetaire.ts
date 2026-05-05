import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getLignesBudgetaires,
  createLigneBudgetaire,
  updateStatutBudget,
  updateExecutionBudget,
} from "@/services/sharepoint/suiviBudgetaireService"
import type { LigneBudgetaire, StatutBudget } from "@/types/budget"

const QUERY_KEY = ["suivi-budgetaire"]

export function useLignesBudgetaires() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getLignesBudgetaires(token)
    },
  })
}

export function useCreateLigneBudgetaire() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      soumettre,
    }: {
      data:      Omit<LigneBudgetaire, "id" | "dateCreation">
      soumettre: boolean
    }) => {
      const token = await getToken()
      return createLigneBudgetaire(token, data, soumettre)
    },
    onSuccess: (_, { soumettre }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(soumettre ? "Ligne budgétaire soumise" : "Brouillon enregistré")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer la ligne : ${message}`)
    },
  })
}

export function useUpdateStatutBudget() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, statut, commentaire,
    }: {
      id:           string
      statut:       StatutBudget
      commentaire?: string
    }) => {
      const token = await getToken()
      await updateStatutBudget(token, id, statut, commentaire)
    },
    onSuccess: (_, { statut }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutBudget, string>> = {
        VALIDE_RAF: "Ligne budgétaire validée par le RAF",
        APPROUVE:   "Budget approuvé par la Directrice",
        REJETE:     "Ligne budgétaire rejetée",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour : ${message}`)
    },
  })
}

export function useUpdateExecutionBudget() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, montantEngage, montantRealise,
    }: {
      id:             string
      montantEngage:  number
      montantRealise: number
    }) => {
      const token = await getToken()
      await updateExecutionBudget(token, id, montantEngage, montantRealise)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Exécution budgétaire mise à jour")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour l'exécution : ${message}`)
    },
  })
}
