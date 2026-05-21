const GRAPH_BASE   = "https://graph.microsoft.com/v1.0"
const SP_HOSTNAME  = import.meta.env.VITE_SHAREPOINT_HOSTNAME  as string
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

// ─── Cache site principal ───────────────────────────────────────────────────
let cachedSiteId: string | null = null

/** Récupère l'ID du site SharePoint principal (mis en cache après le premier appel) */
export async function getSiteId(token: string): Promise<string> {
  if (cachedSiteId) return cachedSiteId
  const encodedPath = SP_SITE_PATH.replace(/'/g, "%27")
  const site = await graphFetch<{ id: string }>(
    token,
    `/sites/${SP_HOSTNAME}:${encodedPath}`,
  )
  cachedSiteId = site.id
  return cachedSiteId
}

// ─── Cache multi-sites (chemin de site → siteId) ─────────────────────────────
const siteIdCache: Record<string, string> = {}

/**
 * Récupère l'ID d'un site SharePoint quelconque par son chemin de site.
 * Exemple : getSiteIdByPath(token, "/sites/DTO")
 * Résultat mis en cache par chemin pour éviter les requêtes répétées.
 */
export async function getSiteIdByPath(token: string, sitePath: string): Promise<string> {
  if (siteIdCache[sitePath]) return siteIdCache[sitePath]
  const encodedPath = sitePath.replace(/'/g, "%27")
  const site = await graphFetch<{ id: string }>(
    token,
    `/sites/${SP_HOSTNAME}:${encodedPath}`,
  )
  siteIdCache[sitePath] = site.id
  return siteIdCache[sitePath]
}

// ─── Cache des GUIDs de listes (siteId+listName → listId) ────────────────────
const listIdCache: Record<string, string> = {}

// Cache de l'énumération complète par siteId — une seule requête résout toutes les listes du site
const allListsEnumCache: Record<string, { id: string; name: string; displayName: string }[]> = {}

/**
 * Résout un nom de liste SharePoint en son GUID via énumération.
 * Approche directe — évite les 404 dans la console browser.
 * L'énumération est mise en cache par site (une seule requête par site et par session).
 */
async function resolveListId(token: string, siteId: string, listName: string): Promise<string> {
  const cacheKey = `${siteId}::${listName}`
  if (listIdCache[cacheKey]) return listIdCache[cacheKey]

  // Charge l'intégralité des listes du site une seule fois, puis réutilise le cache
  if (!allListsEnumCache[siteId]) {
    const result = await graphFetch<{ value: { id: string; name: string; displayName: string }[] }>(
      token,
      `/sites/${siteId}/lists?$select=id,name,displayName`,
    )
    allListsEnumCache[siteId] = result.value
  }

  const found = allListsEnumCache[siteId].find(
    (l) => l.name === listName || l.displayName === listName,
  )
  if (!found) throw new Error(`Liste SharePoint "${listName}" introuvable sur ce site`)
  listIdCache[cacheKey] = found.id
  return found.id
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

/**
 * Récupère tous les éléments d'une liste SharePoint sur un site arbitraire.
 * Utilise getSiteIdByPath() pour résoudre le site, puis resolveListId() pour la liste.
 * @param sitePath  Chemin du site, ex: "/sites/DTO"
 * @param listName  Nom interne de la liste SharePoint
 */
export async function getListItemsFromSite<T>(
  token:       string,
  sitePath:    string,
  listName:    string,
  queryParams: string = "",
): Promise<T[]> {
  const siteId = await getSiteIdByPath(token, sitePath)
  const listId = await resolveListId(token, siteId, listName)
  const data   = await graphFetch<{ value: T[] }>(
    token,
    `/sites/${siteId}/lists/${listId}/items?$expand=fields${queryParams}`,
  )
  return data.value
}

/**
 * Affiche dans la console tous les champs d'une liste SharePoint d'un site donné.
 * Utile pour découvrir les noms internes exacts des colonnes (diagnostic).
 * @param sitePath  Chemin du site, ex: "/sites/DTO"
 * @param listName  Nom interne de la liste SharePoint
 */
export async function logListFieldsFromSite(
  token:    string,
  sitePath: string,
  listName: string,
): Promise<void> {
  try {
    const siteId = await getSiteIdByPath(token, sitePath)
    const listId = await resolveListId(token, siteId, listName)
    const result = await graphFetch<{ value: { name: string; displayName: string; type: string }[] }>(
      token,
      `/sites/${siteId}/lists/${listId}/columns?$select=name,displayName,type`,
    )
    console.group(`🗂️ Champs de la liste "${listName}" (site: ${sitePath})`)
    console.table(
      result.value.map((f) => ({
        "Nom interne (name)":      f.name,
        "Nom affiché":             f.displayName,
        "Type":                    f.type,
      })),
    )
    console.groupEnd()
  } catch (err) {
    console.error(`Impossible de récupérer les champs de "${listName}":`, err)
  }
}

/**
 * Affiche dans la console tous les champs du site principal (diagnostic).
 * Même chose que logListFieldsFromSite() mais utilise getSiteId() au lieu d'un chemin arbitraire.
 */
export async function logListFields(token: string, listName: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const listId = await resolveListId(token, siteId, listName)
    const result = await graphFetch<{ value: { name: string; displayName: string }[] }>(
      token,
      `/sites/${siteId}/lists/${listId}/columns?$select=name,displayName`,
    )
    console.group(`🗂️ Colonnes SharePoint — liste "${listName}"`)
    console.table(
      result.value
        .filter((f) => !f.name.startsWith("_") && f.name !== "ID")
        .map((f) => ({ "Nom interne": f.name, "Nom affiché": f.displayName })),
    )
    console.groupEnd()
  } catch (err) {
    console.error(`[logListFields] Erreur pour "${listName}":`, err)
  }
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

export interface SPAttachment {
  FileName:          string
  ServerRelativeUrl: string
}

/**
 * Récupère les pièces jointes d'un élément de liste SharePoint via l'API REST.
 * Retourne un tableau vide en cas d'erreur ou si aucune pièce jointe.
 */
export async function getListItemAttachments(
  spToken: string,
  itemId:  string,
): Promise<SPAttachment[]> {
  const siteUrl = `https://${SP_HOSTNAME}${SP_SITE_PATH}`
  try {
    const response = await fetch(
      `${siteUrl}/_api/web/lists/getByTitle('Demandes_Achats')/items(${itemId})/AttachmentFiles`,
      {
        headers: {
          Authorization: `Bearer ${spToken}`,
          Accept:        "application/json;odata=nometadata",
        },
      },
    )
    if (!response.ok) return []
    const data = await response.json() as { value: SPAttachment[] }
    return data.value ?? []
  } catch {
    return []
  }
}

/**
 * Attache un fichier à un élément de liste SharePoint via l'API REST SharePoint.
 * Graph API v1.0 ne supporte pas l'upload de pièces jointes sur les listes —
 * on utilise donc l'endpoint REST natif SharePoint.
 */
export async function attachFileToListItem(
  token:    string,
  itemId:   string,
  file:     File,
): Promise<void> {
  const siteUrl    = `https://${SP_HOSTNAME}${SP_SITE_PATH}`
  const encodedName = encodeURIComponent(file.name)
  const arrayBuffer = await file.arrayBuffer()

  const response = await fetch(
    `${siteUrl}/_api/web/lists/getByTitle('Demandes_Achats')/items(${itemId})/AttachmentFiles/add(FileName='${encodedName}')`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        Accept:         "application/json;odata=nometadata",
      },
      body: arrayBuffer,
    },
  )

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Erreur upload "${file.name}" (${response.status}): ${details}`)
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
