import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { getMissions, createMission, updateStatutMission } from "@/services/sharepoint/missionsService"
import { sendNotificationsAsync } from "@/services/notificationService"
import type { Mission, StatutMission } from "@/types/rh"

const QUERY_KEY = ["missions"]

export function useMissions() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  QUERY_KEY,
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getMissions(token)
    },
  })
}

export function useCreateMission() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      data,
      soumettre,
    }: {
      data:      Omit<Mission, "id" | "dateDemande">
      soumettre: boolean
    }) => {
      const token = await getToken()
      return createMission(token, data, soumettre)
    },
    onSuccess: (created, { soumettre }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(soumettre ? "Mission soumise pour approbation" : "Brouillon enregistré")
      if (soumettre) {
        void getToken().then((token) => {
          sendNotificationsAsync(token, {
            module:         "ORDRE_MISSION",
            newStatut:      "SOUMIS",
            submitterEmail: created.demandeur,
            titre:          created.intitule,
          })
        })
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible d'enregistrer la mission : ${message}`)
    },
  })
}

export function useUpdateStatutMission() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, statut, commentaire,
    }: { id: string; statut: StatutMission; commentaire?: string; demandeurEmail?: string; titre?: string }) => {
      const token = await getToken()
      await updateStatutMission(token, id, statut, commentaire)
    },
    onSuccess: (_, { statut, demandeurEmail, titre }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const messages: Partial<Record<StatutMission, string>> = {
        APPROUVE: "Mission approuvée",
        EN_COURS: "Mission marquée en cours",
        TERMINE:  "Mission clôturée",
        REJETE:   "Mission rejetée",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
      if (demandeurEmail && titre && (statut === "APPROUVE" || statut === "REJETE")) {
        void getToken().then((token) => {
          sendNotificationsAsync(token, {
            module:         "ORDRE_MISSION",
            newStatut:      statut,
            submitterEmail: demandeurEmail,
            titre,
          })
        })
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour : ${message}`)
    },
  })
}
