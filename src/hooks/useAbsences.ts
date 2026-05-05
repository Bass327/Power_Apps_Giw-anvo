import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getAbsences, createAbsence, updateStatutAbsence } from "@/services/sharepoint/absencesService"
import type { Absence, StatutAbsence } from "@/types/rh"

const QUERY_KEY = ["absences"]

export function useAbsences() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getAbsences(token)
    },
  })
}

export function useCreateAbsence() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Absence, "id" | "dateSignalement">) => {
      const token = await getToken()
      return createAbsence(token, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Absence signalée")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de signaler l'absence : ${message}`)
    },
  })
}

export function useUpdateStatutAbsence() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, statut, commentaire,
    }: { id: string; statut: StatutAbsence; commentaire?: string }) => {
      const token = await getToken()
      await updateStatutAbsence(token, id, statut, commentaire)
    },
    onSuccess: (_, { statut }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutAbsence, string>> = {
        JUSTIFIEE:     "Absence justifiée",
        NON_JUSTIFIEE: "Absence marquée non justifiée",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour : ${message}`)
    },
  })
}
