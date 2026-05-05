import { getListItems, getSiteId, graphFetch } from "@/lib/graphClient"
import type { TresorerieTypeDepense, CategorieGlobale } from "@/types/tresorerieTransactions"

const LIST_NAME = "Tresorerie_TypesDepenses"

interface TypeDepenseSPFields {
  Title?:            string   // "Type de dépense" renommé en Title
  CodeTypeDepense?:  string
  CategorieParente?: string
  Actif?:            boolean
}

interface TypeDepenseSPItem {
  id:     string
  fields: TypeDepenseSPFields
}

function mapTypeDepense(item: TypeDepenseSPItem): TresorerieTypeDepense {
  const f = item.fields
  return {
    id:               item.id,
    nom:              f.Title            ?? "",
    codeTypeDepense:  f.CodeTypeDepense  ?? "",
    categorieParente: (f.CategorieParente as CategorieGlobale) ?? null,
    actif:            f.Actif            ?? true,
  }
}

const FIELDS_SELECT = "($select=Title,CodeTypeDepense,CategorieParente,Actif)"

/** Récupère tous les types de dépenses actifs, triés par nom */
export async function getTypesDepenses(token: string): Promise<TresorerieTypeDepense[]> {
  const items = await getListItems<TypeDepenseSPItem>(token, LIST_NAME, FIELDS_SELECT)
  return items
    .map(mapTypeDepense)
    .filter((t) => t.actif)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
}

/** Diagnostic : affiche les noms internes des colonnes dans la console */
export async function logTypesDepensesColumns(token: string): Promise<void> {
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
