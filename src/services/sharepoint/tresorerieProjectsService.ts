import { getListItems, getSiteId, graphFetch } from "@/lib/graphClient"
import type { TresorerieProject, CategorieGlobale } from "@/types/tresorerieTransactions"

const LIST_NAME = "Tresorerie_Projects"

interface ProjectSPFields {
  Title?:            string   // "Nom du projet" renommé en Title
  CodeProjet?:       string
  CategorieGlobale?: string
  Localisation?:     string
  Responsable?:      string
  Actif?:            boolean
}

interface ProjectSPItem {
  id:     string
  fields: ProjectSPFields
}

function mapProject(item: ProjectSPItem): TresorerieProject {
  const f = item.fields
  return {
    id:               item.id,
    nom:              f.Title            ?? "",
    codeProjet:       f.CodeProjet       ?? "",
    categorieGlobale: (f.CategorieGlobale as CategorieGlobale) ?? "General",
    localisation:     f.Localisation     ?? "",
    responsable:      f.Responsable      ?? "",
    actif:            f.Actif            ?? true,
  }
}

const FIELDS_SELECT = "($select=Title,CodeProjet,CategorieGlobale,Localisation,Responsable,Actif)"

/** Récupère tous les projets actifs, triés par nom */
export async function getProjects(token: string): Promise<TresorerieProject[]> {
  const items = await getListItems<ProjectSPItem>(token, LIST_NAME, FIELDS_SELECT)
  return items
    .map(mapProject)
    .filter((p) => p.actif)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
}

/** Diagnostic : affiche les noms internes des colonnes dans la console */
export async function logProjectsColumns(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: { displayName: string; name: string }[] }>(
      token,
      `/sites/${siteId}/lists/${encodeURIComponent(LIST_NAME)}/columns`,
    )
    console.group(`🔍 Colonnes SharePoint — ${LIST_NAME}`)
    console.table(
      result.value
        .filter((c) => !c.name.startsWith("_"))
        .map((c) => ({ "Nom affiché": c.displayName, "Nom interne": c.name })),
    )
    console.groupEnd()
  } catch (err) {
    console.error("Impossible de récupérer les colonnes:", err)
  }
}
