import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getDemandesAchats,
  createDemandeAchat,
  updateStatutDemande,
} from "@/services/sharepoint/demandesAchatsService"
import { getListItemAttachments, attachFileToListItem, type SPAttachment } from "@/lib/graphClient"
import { sendNotificationsAsync } from "@/services/notificationService"
import type {
  CreateDemandeAchatPayload,
  UpdateStatutPayload,
} from "@/types/DemandeAchat"
import type { UserRole } from "@/types/user"

const QUERY_KEY = ["demandes-achats"]

/* ── Pièces jointes d'une demande ── */
export function useDemandeAttachments(demandeId: string | undefined) {
  const { tryGetSharePointToken } = useAuth()

  return useQuery<SPAttachment[]>({
    queryKey:  ["demande-attachments", demandeId],
    enabled:   !!demandeId,
    staleTime: 5 * 60 * 1000,
    retry:     false,
    queryFn:   async () => {
      const spToken = await tryGetSharePointToken()
      // Token SP indisponible (ex: mode Teams sans compte MSAL) → pas de pièces jointes
      if (!spToken) return []
      return getListItemAttachments(spToken, demandeId!)
    },
  })
}

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
  const { getToken, getSharePointToken } = useAuth()
  const queryClient                      = useQueryClient()

  return useMutation({
    mutationFn: async ({
      payload,
      soumettre,
      fichiers,
      role,
    }: {
      payload:   CreateDemandeAchatPayload
      soumettre: boolean
      fichiers?: File[]
      role?:     UserRole
    }) => {
      // Pièce de caisse créée par le Comptable → approbation automatique sans circuit de validation
      const statutAuto =
        role === "Comptable" && payload.typeDemande === "PIECE_CAISSE"
          ? "APPROUVE"
          : soumettre
          ? "SOUMIS"
          : "BROUILLON"

      const token  = await getToken()
      const result = await createDemandeAchat(token, payload, statutAuto)

      // Upload des pièces jointes — séparé de la création pour ne pas bloquer en cas d'échec
      if (fichiers && fichiers.length > 0) {
        try {
          // Requiert un token SharePoint (audience distincte du token Graph)
          const spToken = await getSharePointToken()
          await Promise.all(fichiers.map((f) => attachFileToListItem(spToken, result.id, f)))
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : "Erreur inconnue"
          // Avertissement non-bloquant : l'item est déjà créé dans SharePoint
          toast.warning(`Demande créée, mais les pièces jointes n'ont pas pu être ajoutées : ${msg}`)
        }
      }

      // Notification fire-and-forget (ne bloque pas la mutation)
      if (soumettre && statutAuto !== "APPROUVE") {
        sendNotificationsAsync(token, {
          module:         "DEMANDE_ACHAT",
          newStatut:      "SOUMIS",
          submitterEmail: payload.demandeur,
          titre:          payload.titre,
        })
      }
      return result
    },

    onSuccess: (_, { soumettre, role, payload }) => {
      // Invalide le cache pour forcer un rechargement de la liste
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })

      // Message adapté au cas d'auto-approbation
      const autoApprouve = role === "Comptable" && payload.typeDemande === "PIECE_CAISSE"
      toast.success(
        autoApprouve
          ? "Pièce de caisse enregistrée et approuvée automatiquement"
          : soumettre
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
      demandeurEmail,
      titre,
    }: {
      id:              string
      update:          UpdateStatutPayload
      role:            UserRole
      demandeurEmail?: string
      titre?:          string
    }) => {
      const token = await getToken()
      await updateStatutDemande(token, id, update, role)

      // Notification fire-and-forget
      if (demandeurEmail && titre) {
        sendNotificationsAsync(token, {
          module:         "DEMANDE_ACHAT",
          newStatut:      update.statut,
          submitterEmail: demandeurEmail,
          titre,
        })
      }
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
