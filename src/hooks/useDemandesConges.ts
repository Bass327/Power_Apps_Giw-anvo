import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getDemandesConges,
  createDemandeConge,
  updateStatutConge,
} from "@/services/sharepoint/demandesCongesService"
import type { DemandeConge, StatutConge } from "@/types/rh"

const QUERY_KEY = ["demandes-conges"]

/* ── Liste toutes les demandes de congé ── */
export function useDemandesConges() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getDemandesConges(token)
    },
  })
}

/* ── Créer une demande de congé ── */
export function useCreateDemandeConge() {
  const { getToken }   = useAuth()
  const queryClient    = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      soumettre,
    }: {
      data:      Omit<DemandeConge, "id" | "dateDemande">
      soumettre: boolean
    }) => {
      const token = await getToken()
      return createDemandeConge(token, data, soumettre)
    },

    onSuccess: (_, { soumettre }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(soumettre ? "Demande de congé soumise" : "Brouillon enregistré")
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer la demande : ${message}`)
    },
  })
}

/* ── Valider ou rejeter une demande ── */
export function useUpdateStatutConge() {
  const { getToken }   = useAuth()
  const queryClient    = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      statut,
      commentaire,
      valideur,
    }: {
      id:          string
      statut:      StatutConge
      commentaire?: string
      valideur?:   string
    }) => {
      const token = await getToken()
      await updateStatutConge(token, id, statut, commentaire, valideur)
    },

    onSuccess: (_, { statut }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutConge, string>> = {
        APPROUVE: "Congé approuvé",
        REJETE:   "Congé refusé",
        EN_COURS: "Congé marqué en cours",
        TERMINE:  "Congé clôturé",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour le statut : ${message}`)
    },
  })
}
