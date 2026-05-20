import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  getProjets,
  createProjet,
  updateProjet,
  getTasks,
  createTask,
  updateTask,
  getMilestones,
  getPipelineUpdates,
  getContacts,
  createPipelineUpdate,
} from "@/services/sharepoint/pipelineService"
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
} from "@/services/sharepoint/pipelineDocumentsService"
import type {
  ProjetPipeline,
  PipelineTask,
  PipelineDocument,
} from "@/types/pipeline"

// ─── Clés React Query centralisées ────────────────────────────────────────────

export const PIPELINE_KEYS = {
  projets:    ["pipeline-projets"]                               as const,
  tasks:      (projetId?: string)   => ["pipeline-tasks",       projetId]   as const,
  milestones: (projetId?: string)   => ["pipeline-milestones",  projetId]   as const,
  updates:    (projetId?: string)   => ["pipeline-updates",     projetId]   as const,
  contacts:   (projetId?: string)   => ["pipeline-contacts",    projetId]   as const,
  documents:  (projetCode?: string) => ["pipeline-documents",   projetCode] as const,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Projets
// ═══════════════════════════════════════════════════════════════════════════════

/** Retourne tous les projets du pipeline. Cache 3 min. */
export function useProjets() {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.projets,
    enabled:   isAuthenticated,
    staleTime: 3 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getProjets(token)
    },
  })
}

/** Crée un nouveau projet et invalide le cache. */
export function useCreateProjet() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<ProjetPipeline, "id" | "created" | "modified">) => {
      const token = await getToken()
      return createProjet(token, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.projets })
      toast.success("Projet créé avec succès")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer le projet : ${msg}`)
    },
  })
}

/** Met à jour un projet et enregistre optionnellement dans l'historique. */
export function useUpdateProjet() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      fields,
      logMessage,
      auteur,
    }: {
      id:          string
      fields:      Partial<Omit<ProjetPipeline, "id" | "created" | "modified">>
      logMessage?: string
      auteur?:     string
    }) => {
      const token = await getToken()
      await updateProjet(token, id, fields)
      if (logMessage) {
        await createPipelineUpdate(token, id, logMessage, auteur ?? "Système")
      }
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.projets })
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.updates(id) })
      toast.success("Projet mis à jour")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour : ${msg}`)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tâches
// ═══════════════════════════════════════════════════════════════════════════════

/** Retourne toutes les tâches, ou seulement celles d'un projet si projetId fourni. */
export function usePipelineTasks(projetId?: string) {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.tasks(projetId),
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getTasks(token, projetId)
    },
  })
}

/** Crée une tâche et invalide le cache des tâches global + par projet. */
export function useCreateTask() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<PipelineTask, "id" | "created" | "modified">) => {
      const token = await getToken()
      return createTask(token, data)
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.tasks() })
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.tasks(created.projetId) })
      toast.success("Tâche créée")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de créer la tâche : ${msg}`)
    },
  })
}

/** Met à jour le statut ou les champs d'une tâche. */
export function useUpdateTask() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      projetId,
      fields,
    }: {
      id:       string
      projetId: string
      fields:   Partial<Pick<PipelineTask, "statut" | "assignee" | "dateLimite" | "description" | "priorite">>
    }) => {
      const token = await getToken()
      await updateTask(token, id, fields)
      return projetId
    },
    onSuccess: (projetId) => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.tasks() })
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.tasks(projetId) })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de mettre à jour la tâche : ${msg}`)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Jalons
// ═══════════════════════════════════════════════════════════════════════════════

/** Retourne les jalons, filtrés par projet si projetId fourni. */
export function usePipelineMilestones(projetId?: string) {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.milestones(projetId),
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getMilestones(token, projetId)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Historique
// ═══════════════════════════════════════════════════════════════════════════════

/** Retourne l'historique des modifications, filtré par projet si projetId fourni. */
export function usePipelineUpdates(projetId?: string) {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.updates(projetId),
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getPipelineUpdates(token, projetId)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Contacts
// ═══════════════════════════════════════════════════════════════════════════════

/** Retourne les contacts, filtrés par projet si projetId fourni. */
export function usePipelineContacts(projetId?: string) {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.contacts(projetId),
    enabled:   isAuthenticated,
    staleTime: 5 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getContacts(token, projetId)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Documents (Drive SharePoint)
// ═══════════════════════════════════════════════════════════════════════════════

/** Liste les documents — tous ou filtrés par projetCode si fourni. */
export function usePipelineDocuments(projetCode?: string) {
  const { isAuthenticated, getToken } = useAuth()
  return useQuery({
    queryKey:  PIPELINE_KEYS.documents(projetCode),
    enabled:   isAuthenticated,
    staleTime: 2 * 60 * 1000,
    queryFn:   async () => {
      const token = await getToken()
      return getDocuments(token, projetCode)
    },
  })
}

/** Upload un fichier vers Pipeline_Documents/{projetCode}/ et invalide le cache. */
export function useUploadDocument() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projetCode,
      file,
    }: {
      projetCode: string
      file:       File
    }): Promise<PipelineDocument> => {
      const token = await getToken()
      return uploadDocument(token, projetCode, file)
    },
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.documents() })
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.documents(doc.projetCode) })
      toast.success(`"${doc.name}" ajouté`)
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Échec de l'upload : ${msg}`)
    },
  })
}

/** Supprime un document du drive et invalide le cache. */
export function useDeleteDocument() {
  const { getToken } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
    }: {
      itemId:     string
      projetCode: string
    }) => {
      const token = await getToken()
      return deleteDocument(token, itemId)
    },
    onSuccess: (_, { projetCode }) => {
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.documents() })
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.documents(projetCode) })
      toast.success("Document supprimé")
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Impossible de supprimer : ${msg}`)
    },
  })
}
