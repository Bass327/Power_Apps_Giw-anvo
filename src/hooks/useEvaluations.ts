import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getEvaluations, createEvaluation, updateEvaluation } from "@/services/sharepoint/evaluationsService"
import type { Evaluation, StatutEvaluation } from "@/types/rh"

const QUERY_KEY = ["evaluations"]

export function useEvaluations() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getEvaluations(token)
    },
  })
}

export function useCreateEvaluation() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Evaluation, "id">) => {
      const token = await getToken()
      return createEvaluation(token, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Évaluation planifiée")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer l'évaluation : ${message}`)
    },
  })
}

export function useUpdateEvaluation() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id:    string
      patch: Partial<Pick<Evaluation, "statut" | "note" | "resultats" | "commentaires" | "planAmelioration" | "dateValidation">>
    }) => {
      const token = await getToken()
      await updateEvaluation(token, id, patch)
    },
    onSuccess: (_, { patch }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutEvaluation, string>> = {
        AUTOEVAL:     "Autoévaluation lancée",
        EVAL_MANAGER: "Évaluation manager en cours",
        EN_REVUE_RH:  "Transmise au RH pour revue",
        VALIDEE:      "Évaluation validée",
        CLOTUREE:     "Évaluation clôturée",
      }
      const msg = patch.statut ? (messages[patch.statut] ?? "Évaluation mise à jour") : "Évaluation mise à jour"
      toast.success(msg)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour l'évaluation : ${message}`)
    },
  })
}
