import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getDemandesAbsences,
  createDemandeAbsence,
  updateStatutDemandeAbsence,
} from "@/services/sharepoint/demandesAbsencesService"
import { sendNotificationsAsync } from "@/services/notificationService"
import type { DemandeAbsence, StatutDemandeAbsence } from "@/types/rh"

const QUERY_KEY = ["demandes-absences"]

/* ── Liste les demandes d'autorisation d'absence ──
   filterEmail : email de l'utilisateur pour le scope "own".
   Undefined → récupère toutes les demandes (DG, RAF, Chef Dept.).
   La queryKey inclut l'email pour avoir un cache séparé par utilisateur. */
export function useDemandesAbsences(filterEmail?: string) {
  const { isAuthenticated, getToken } = useAuth()

  return useQuery({
    queryKey:  filterEmail ? [...QUERY_KEY, filterEmail] : QUERY_KEY,
    /* Règle d'activation :
       - filterEmail = undefined → scope global, toujours actif
       - filterEmail = "x@y"    → scope "own" avec email, actif
       - filterEmail = ""       → scope "own" SANS email (user pas encore chargé) → on attend */
    enabled:   isAuthenticated && filterEmail !== "",
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getDemandesAbsences(token, filterEmail || undefined)
    },
  })
}

/* ── Créer une nouvelle demande d'autorisation d'absence ── */
export function useCreateDemandeAbsence() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async (
      data: Omit<DemandeAbsence, "id" | "dateDemande" | "codeDemande" | "statut" | "documentGenere">,
    ) => {
      const token = await getToken()
      return createDemandeAbsence(token, data)
    },

    onSuccess: (created, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(
        "Votre demande d'autorisation d'absence a été transmise au chef de département et à la Direction Générale.",
      )
      /* Notification Teams fire-and-forget → Chef Dept. + Directrice
         On utilise `variables` (données originales) car SP POST ne retourne
         pas les champs personnalisés dans la réponse. */
      const email = variables.demandeur || created.demandeur
      const nom   = variables.nomDemandeur || created.nomDemandeur
      void getToken().then((token) => {
        sendNotificationsAsync(token, {
          module:         "DEMANDE_ABSENCE",
          newStatut:      "SOUMIS",
          submitterEmail: email,
          titre:          `Demande d'autorisation d'absence — ${nom} (${created.codeDemande})`,
        })
      })
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de soumettre la demande : ${message}`)
    },
  })
}

/* ── Mettre à jour le statut — Chef Dept. ou Directrice ── */
export function useUpdateStatutDemandeAbsence() {
  const { getToken }  = useAuth()
  const queryClient   = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      statut,
      commentaire,
      validePar,
      role,
      demandeurEmail,
      nomDemandeur,
      codeDemande,
    }: {
      id:              string
      statut:          StatutDemandeAbsence
      commentaire?:    string
      validePar?:      string
      role?:           string
      demandeurEmail?: string
      nomDemandeur?:   string
      codeDemande?:    string
    }) => {
      const token = await getToken()
      await updateStatutDemandeAbsence(token, id, statut, commentaire, validePar, role)

      /* Notification Teams fire-and-forget — même pattern que les Achats_Prestations */
      if (demandeurEmail) {
        sendNotificationsAsync(token, {
          module:         "DEMANDE_ABSENCE",
          newStatut:      statut,
          submitterEmail: demandeurEmail,
          titre:          `Demande d'autorisation d'absence — ${nomDemandeur ?? demandeurEmail} (${codeDemande ?? ""})`,
        })
      }
    },

    onSuccess: (_, { statut }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })

      const messages: Partial<Record<StatutDemandeAbsence, string>> = {
        VALIDE_CHEF:     "Demande validée — la Direction Générale en est informée",
        REJETE_CHEF:     "Demande rejetée par le chef de département",
        APPROUVE_DG:     "Demande approuvée par la Direction Générale",
        REFUSE_DG:       "Demande refusée par la Direction Générale",
        DOCUMENT_GENERE: "Document marqué comme généré",
      }
      toast.success(messages[statut] ?? "Statut mis à jour")
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour le statut : ${message}`)
    },
  })
}
