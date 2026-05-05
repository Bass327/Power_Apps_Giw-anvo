import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getDecaissements,
  createDecaissement,
  updateStatutDecaissement,
} from "@/services/sharepoint/decaissementsService"
import type { DemandeDecaissement, StatutDecaissement } from "@/types/tresorerie"

const QUERY_KEY = ["decaissements"]

export function useDecaissements() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getDecaissements(token)
    },
  })
}

export function useCreateDecaissement() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      soumettre,
    }: {
      data:      Omit<DemandeDecaissement, "id" | "dateDemande" | "devise">
      soumettre: boolean
    }) => {
      const token = await getToken()
      return createDecaissement(token, data, soumettre)
    },
    onSuccess: (_, { soumettre }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(soumettre ? "Demande de décaissement soumise" : "Brouillon enregistré")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer la demande : ${message}`)
    },
  })
}

export function useUpdateStatutDecaissement() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, statut, commentaire, reference,
    }: {
      id:          string
      statut:      StatutDecaissement
      commentaire?: string
      reference?:  string
    }) => {
      const token = await getToken()
      await updateStatutDecaissement(token, id, statut, commentaire, reference)
    },
    onSuccess: (_, { statut }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutDecaissement, string>> = {
        VALIDE_RAF: "Décaissement validé par le RAF",
        APPROUVE:   "Décaissement approuvé par la Directrice",
        EXECUTE:    "Décaissement marqué exécuté",
        REJETE:     "Décaissement rejeté",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour : ${message}`)
    },
  })
}
