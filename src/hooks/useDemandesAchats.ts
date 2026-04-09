import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getDemandesAchats,
  createDemandeAchat,
  updateStatutDemande,
} from "@/services/sharepoint/demandesAchatsService"
import type {
  CreateDemandeAchatPayload,
  UpdateStatutPayload,
} from "@/types/DemandeAchat"
import type { UserRole } from "@/types/user"

const QUERY_KEY = ["demandes-achats"]

/* ── Liste toutes les demandes ── */
export function useDemandesAchats() {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey: QUERY_KEY,
    enabled:  isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes

    queryFn: async () => {
      const token = await getToken()
      return getDemandesAchats(token)
    },
  })
}

/* ── Créer une demande (brouillon ou soumise) ── */
export function useCreateDemandeAchat() {
  const { getToken }   = useAuth()
  const queryClient    = useQueryClient()

  return useMutation({
    mutationFn: async ({
      payload,
      soumettre,
    }: {
      payload:   CreateDemandeAchatPayload
      soumettre: boolean
    }) => {
      const token = await getToken()
      return createDemandeAchat(token, payload, soumettre ? "SOUMIS" : "BROUILLON")
    },

    onSuccess: (_, { soumettre }) => {
      // Invalide le cache pour forcer un rechargement de la liste
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(
        soumettre
          ? "Demande soumise pour validation"
          : "Brouillon enregistré",
      )
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer la demande : ${message}`)
    },
  })
}

/* ── Mettre à jour le statut (validation / rejet / paiement) ── */
export function useUpdateStatutDemande() {
  const { getToken }   = useAuth()
  const queryClient    = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      update,
      role,
    }: {
      id:     string
      update: UpdateStatutPayload
      role:   UserRole
    }) => {
      const token = await getToken()
      await updateStatutDemande(token, id, update, role)
    },

    onSuccess: (_, { update }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })

      const messages: Partial<Record<string, string>> = {
        APPROUVE:    "Demande approuvée par la Directrice",
        EN_PAIEMENT: "Demande prise en charge pour paiement",
        SOLDE:       "Paiement soldé avec succès",
        REJETE:      "Demande rejetée",
      }
      toast.success(messages[update.statut] ?? "Statut mis à jour")
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour le statut : ${message}`)
    },
  })
}
