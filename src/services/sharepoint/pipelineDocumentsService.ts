/* ═══════════════════════════════════════════════════════════════════════════
   pipelineDocumentsService — Gestion des documents via Drive API (Graph)
   Structure : Pipeline_Documents/{projetCode}/{filename}
   ═══════════════════════════════════════════════════════════════════════════ */

import { getSiteId, graphMutate } from "@/lib/graphClient"
import type { PipelineDocument } from "@/types/pipeline"

const GRAPH_BASE  = "https://graph.microsoft.com/v1.0"
const DOCS_FOLDER = "Pipeline_Documents"

// ─── Shape brut d'un DriveItem Graph API ──────────────────────────────────────

interface DriveItem {
  id:                              string
  name:                            string
  size:                            number
  file?:                           { mimeType: string }
  folder?:                         Record<string, unknown>
  createdBy?:                      { user?: { displayName?: string } }
  createdDateTime:                 string
  lastModifiedDateTime:            string
  webUrl:                          string
  "@microsoft.graph.downloadUrl"?: string
  parentReference:                 { path: string }
}

// ─── Conversion DriveItem → PipelineDocument ──────────────────────────────────

function toDocument(item: DriveItem): PipelineDocument {
  // Extrait le projetCode depuis le chemin parent
  // Ex: ".../root:/Pipeline_Documents/PJ-001" → "PJ-001"
  const parts    = decodeURIComponent(item.parentReference.path).split("/")
  const idx      = parts.findIndex((p) => p === DOCS_FOLDER)
  const projetCode = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : ""

  return {
    id:          item.id,
    projetCode,
    name:        item.name,
    size:        item.size ?? 0,
    mimeType:    item.file?.mimeType ?? "application/octet-stream",
    downloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    webUrl:      item.webUrl,
    auteur:      item.createdBy?.user?.displayName ?? "Inconnu",
    created:     item.createdDateTime,
    modified:    item.lastModifiedDateTime,
  }
}

// ─── Fetch Drive (GET) ────────────────────────────────────────────────────────

async function driveFetch<T>(token: string, siteId: string, path: string): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}/sites/${siteId}/drive${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Drive API (${response.status}): ${details}`)
  }
  return response.json() as Promise<T>
}

// ─── Sélection des champs Drive ───────────────────────────────────────────────

const DRIVE_SELECT =
  "$select=id,name,size,file,folder,createdBy,createdDateTime,lastModifiedDateTime,webUrl,parentReference,@microsoft.graph.downloadUrl"

// ═══════════════════════════════════════════════════════════════════════════════
// API publique
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Liste les documents du pipeline.
 * - Sans projetCode → recherche récursive dans tout Pipeline_Documents/
 * - Avec projetCode → liste le dossier Pipeline_Documents/{projetCode}/
 * Retourne [] si le dossier n'existe pas encore.
 */
export async function getDocuments(
  token:       string,
  projetCode?: string,
): Promise<PipelineDocument[]> {
  const siteId = await getSiteId(token)

  try {
    if (projetCode) {
      const encodedCode = encodeURIComponent(projetCode)
      const data = await driveFetch<{ value: DriveItem[] }>(
        token,
        siteId,
        `/root:/${DOCS_FOLDER}/${encodedCode}:/children?${DRIVE_SELECT}`,
      )
      return data.value.filter((i) => !!i.file).map(toDocument)
    } else {
      // Recherche récursive dans le dossier racine Pipeline_Documents
      const data = await driveFetch<{ value: DriveItem[] }>(
        token,
        siteId,
        `/root:/${DOCS_FOLDER}:/search(q='')?${DRIVE_SELECT}`,
      )
      return data.value.filter((i) => !!i.file).map(toDocument)
    }
  } catch (err) {
    // Dossier introuvable = aucun document encore uploadé
    if (
      err instanceof Error &&
      (err.message.includes("404") ||
        err.message.includes("itemNotFound") ||
        err.message.includes("PathNotFound"))
    ) {
      return []
    }
    throw err
  }
}

/**
 * Upload un fichier vers Pipeline_Documents/{projetCode}/{filename}.
 * Le dossier projet est créé automatiquement par SharePoint si absent.
 * Limite : fichiers < 250 MB (upload simple PUT).
 */
export async function uploadDocument(
  token:      string,
  projetCode: string,
  file:       File,
): Promise<PipelineDocument> {
  const siteId      = await getSiteId(token)
  const encodedCode = encodeURIComponent(projetCode)
  const encodedName = encodeURIComponent(file.name)
  const drivePath   = `/${DOCS_FOLDER}/${encodedCode}/${encodedName}`
  const arrayBuffer = await file.arrayBuffer()

  const response = await fetch(
    `${GRAPH_BASE}/sites/${siteId}/drive/root:${drivePath}:/content`,
    {
      method:  "PUT",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: arrayBuffer,
    },
  )

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Erreur upload "${file.name}" (${response.status}): ${details}`)
  }

  const item = (await response.json()) as DriveItem
  return toDocument(item)
}

/**
 * Supprime un document du drive par son ID.
 */
export async function deleteDocument(
  token:  string,
  itemId: string,
): Promise<void> {
  const siteId = await getSiteId(token)
  await graphMutate<void>(token, `/sites/${siteId}/drive/items/${itemId}`, "DELETE")
}
