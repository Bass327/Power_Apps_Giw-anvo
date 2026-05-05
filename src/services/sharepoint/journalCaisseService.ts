import { getListItems, createListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { OperationCaisse, TypeOperationCaisse } from "@/types/tresorerie"

const LIST_NAME = "Journal_Caisse"

/* ── Interface brute SharePoint ── */
interface OperationSPFields {
  Title?:         string    // description courte
  TypeOperation?: string
  Montant?:       number
  Saiseur?:       string    // email
  Reference?:     string
  Beneficiaire?:  string
  SoldeApres?:    number
  Created?:       string
}

interface OperationSPItem {
  id:     string
  fields: OperationSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: OperationSPItem): OperationCaisse {
  const f = item.fields
  return {
    id:            item.id,
    typeOperation: (f.TypeOperation as TypeOperationCaisse) ?? "SORTIE",
    montant:       Number(f.Montant)  || 0,
    devise:        "FCFA",
    description:   f.Title           ?? "",
    saiseur:       f.Saiseur         ?? "",
    dateSaisie:    f.Created         ?? "",
    reference:     f.Reference       ?? undefined,
    beneficiaire:  f.Beneficiaire    ?? undefined,
    soldeApres:    f.SoldeApres      ?? undefined,
  }
}

/* ── Récupère toutes les opérations ── */
export async function getOperationsCaisse(token: string): Promise<OperationCaisse[]> {
  const items = await getListItems<OperationSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateSaisie).getTime() - new Date(a.dateSaisie).getTime())
}

/* ── Saisit une nouvelle opération de caisse ── */
export async function createOperationCaisse(
  token: string,
  data:  Omit<OperationCaisse, "id" | "dateSaisie" | "devise">,
): Promise<OperationCaisse> {
  const rawFields: Record<string, unknown> = {
    Title:         data.description  || undefined,
    TypeOperation: data.typeOperation || undefined,
    Montant:       data.montant       ?? undefined,
    Saiseur:       data.saiseur       || undefined,
    Reference:     data.reference     || undefined,
    Beneficiaire:  data.beneficiaire  || undefined,
    SoldeApres:    data.soldeApres    ?? undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<OperationSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Diagnostic colonnes ── */
interface SPColumn { displayName: string; name: string }

export async function logJournalCaisseColumns(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: SPColumn[] }>(
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
