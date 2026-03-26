const GRAPH_BASE = "https://graph.microsoft.com/v1.0"
const SP_HOSTNAME = import.meta.env.VITE_SHAREPOINT_HOSTNAME as string
const SP_SITE_PATH = import.meta.env.VITE_SHAREPOINT_SITE_PATH as string

/** Requête générique vers Graph API */
export async function graphFetch<T>(token: string, endpoint: string): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Erreur Graph API (${response.status}): ${details}`)
  }

  return response.json() as Promise<T>
}

/**
 * Télécharge une ressource binaire depuis Graph API (ex: photo de profil).
 * Retourne une blob URL utilisable directement dans un <img src>.
 * Retourne null si la ressource n'existe pas (404) ou en cas d'erreur.
 */
export async function graphFetchBlob(token: string, endpoint: string): Promise<string | null> {
  try {
    const response = await fetch(`${GRAPH_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/** Requête PATCH/POST vers Graph API */
export async function graphMutate<T>(
  token:   string,
  endpoint: string,
  method:   "POST" | "PATCH" | "DELETE",
  body?:    unknown,
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Erreur Graph API ${method} (${response.status}): ${details}`)
  }

  // DELETE renvoie 204 sans corps
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// Cache de l'ID du site SharePoint pour éviter une requête à chaque appel
let cachedSiteId: string | null = null

/** Récupère l'ID du site SharePoint (mis en cache après le premier appel) */
export async function getSiteId(token: string): Promise<string> {
  if (cachedSiteId) return cachedSiteId

  // L'apostrophe dans le chemin du site doit être encodée pour l'URL
  const encodedPath = SP_SITE_PATH.replace(/'/g, "%27")
  const site = await graphFetch<{ id: string }>(
    token,
    `/sites/${SP_HOSTNAME}:${encodedPath}`,
  )
  cachedSiteId = site.id
  return cachedSiteId
}

// Cache des GUIDs de listes (nom affiché ou interne → GUID)
// Graph API est plus fiable avec les GUIDs qu'avec les noms dans les URLs d'items
const listIdCache: Record<string, string> = {}

/**
 * Résout un nom de liste SharePoint (interne ou affiché) en son GUID.
 * Essaie d'abord `/lists/{name}`, puis énumère toutes les listes en fallback.
 * Le GUID est mis en cache pour les appels suivants.
 */
async function resolveListId(token: string, siteId: string, listName: string): Promise<string> {
  if (listIdCache[listName]) return listIdCache[listName]

  try {
    // Tentative directe par nom interne
    const list = await graphFetch<{ id: string }>(
      token,
      `/sites/${siteId}/lists/${encodeURIComponent(listName)}?$select=id`,
    )
    listIdCache[listName] = list.id
    return list.id
  } catch {
    // Fallback : énumération de toutes les listes pour trouver par displayName
    const allLists = await graphFetch<{ value: { id: string; name: string; displayName: string }[] }>(
      token,
      `/sites/${siteId}/lists?$select=id,name,displayName`,
    )
    const found = allLists.value.find(
      (l) => l.name === listName || l.displayName === listName,
    )
    if (!found) throw new Error(`Liste SharePoint "${listName}" introuvable sur ce site`)
    listIdCache[listName] = found.id
    return found.id
  }
}

/** Récupère tous les éléments d'une liste SharePoint */
export async function getListItems<T>(
  token:       string,
  listName:    string,
  queryParams: string = "",
): Promise<T[]> {
  const siteId = await getSiteId(token)
  const listId = await resolveListId(token, siteId, listName)
  const data = await graphFetch<{ value: T[] }>(
    token,
    `/sites/${siteId}/lists/${listId}/items?$expand=fields${queryParams}`,
  )
  return data.value
}

/** Crée un élément dans une liste SharePoint */
export async function createListItem<T>(
  token:    string,
  listName: string,
  fields:   Record<string, unknown>,
): Promise<T> {
  const siteId = await getSiteId(token)
  const listId = await resolveListId(token, siteId, listName)
  return graphMutate<T>(
    token,
    `/sites/${siteId}/lists/${listId}/items`,
    "POST",
    { fields },
  )
}

/**
 * Affiche dans la console tous les noms de listes du site SharePoint.
 * Utile pour vérifier les noms internes exacts (sensibles à la casse).
 * À appeler une seule fois en développement pour le diagnostic.
 */
export async function logAllLists(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: { id: string; displayName: string; name: string }[] }>(
      token,
      `/sites/${siteId}/lists?$select=id,displayName,name`,
    )
    console.group("🗂️ Listes SharePoint disponibles")
    console.table(
      result.value.map((list) => ({
        "Nom affiché (displayName)": list.displayName,
        "Nom interne (name)":        list.name,
        "ID":                        list.id,
      })),
    )
    console.groupEnd()
  } catch (err) {
    console.error("Impossible de récupérer les listes:", err)
  }
}

/** Met à jour un élément d'une liste SharePoint */
export async function updateListItem(
  token:    string,
  listName: string,
  itemId:   string,
  fields:   Record<string, unknown>,
): Promise<void> {
  const siteId = await getSiteId(token)
  const listId = await resolveListId(token, siteId, listName)
  await graphMutate<void>(
    token,
    `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
    "PATCH",
    fields,
  )
}
