import { getListItems, createListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type {
  BudgetMensuel,
  BudgetFormData,
  CategorieGlobale,
  StatutBudget,
} from "@/types/tresorerieTransactions"

const LIST_NAME = "Tresorerie_BudgetsMensuels"

/* ── Interface brute SharePoint ── */
interface BudgetSPFields {
  Title?:                string   // Libellé budget
  Mois?:                 number
  Annee?:                number
  CategorieGlobale?:     string
  ProjetLookupId?:       number   // ID lookup vers Tresorerie_Projects
  Projet?:               string   // valeur affichée
  TypeDepenseLookupId?:  number   // ID lookup vers Tresorerie_TypesDepenses
  TypeDepense?:          string   // valeur affichée
  MontantBudgete?:       number
  Commentaire?:          string
  VersionBudget?:        string
  StatutBudget?:         string
}

interface BudgetSPItem {
  id:     string
  fields: BudgetSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapBudget(item: BudgetSPItem): BudgetMensuel {
  const f = item.fields
  return {
    id:               item.id,
    libelle:          f.Title              ?? "",
    mois:             f.Mois               ?? 0,
    annee:            f.Annee              ?? 0,
    categorieGlobale: (f.CategorieGlobale  as CategorieGlobale) ?? "General",
    projetId:         f.ProjetLookupId     != null ? String(f.ProjetLookupId)     : undefined,
    projetNom:        f.Projet             ?? undefined,
    typeDepenseId:    f.TypeDepenseLookupId != null ? String(f.TypeDepenseLookupId): undefined,
    typeDepenseNom:   f.TypeDepense         ?? undefined,
    montantBudgete:   Number(f.MontantBudgete) || 0,
    commentaire:      f.Commentaire         ?? undefined,
    versionBudget:    f.VersionBudget       ?? undefined,
    statutBudget:     (f.StatutBudget       as StatutBudget) ?? "Brouillon",
  }
}

const FIELDS_SELECT =
  "($select=Title,Mois,Annee,CategorieGlobale," +
  "ProjetLookupId,TypeDepenseLookupId," +
  "MontantBudgete,Commentaire,VersionBudget,StatutBudget)"

/* ── Lecture ── */
export async function getBudgets(token: string): Promise<BudgetMensuel[]> {
  const items = await getListItems<BudgetSPItem>(token, LIST_NAME, FIELDS_SELECT)
  return items
    .map(mapBudget)
    .sort((a, b) => a.annee !== b.annee ? b.annee - a.annee : b.mois - a.mois)
}

/* ── Création ── */
export async function createBudget(
  token: string,
  data:  BudgetFormData,
): Promise<BudgetMensuel> {
  const moisStr = String(data.mois).padStart(2, "0")
  const libelle = [
    `Budget ${moisStr}/${data.annee}`,
    data.categorieGlobale !== "General" && data.projetNom ? data.projetNom : null,
    data.typeDepenseNom ?? null,
  ]
    .filter(Boolean)
    .join(" — ")

  const rawFields: Record<string, unknown> = {
    Title:            libelle,
    Mois:             data.mois,
    Annee:            data.annee,
    CategorieGlobale: data.categorieGlobale,
    MontantBudgete:   data.montantBudgete,
    Commentaire:      data.commentaire   || undefined,
    VersionBudget:    data.versionBudget || undefined,
    StatutBudget:     data.statutBudget  ?? "Brouillon",
  }

  if (data.projetId)      rawFields.ProjetLookupId      = parseInt(data.projetId, 10)
  if (data.typeDepenseId) rawFields.TypeDepenseLookupId = parseInt(data.typeDepenseId, 10)

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  let created: BudgetSPItem
  try {
    created = await createListItem<BudgetSPItem>(token, LIST_NAME, fields)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    // Si un champ Lookup est refusé par SP, réessayer sans les LookupId
    if (msg.includes("400") && (msg.includes("not recognized") || msg.includes("invalidRequest"))) {
      void logBudgetsColumns(token)
      const fieldsSansLookup = Object.fromEntries(
        Object.entries(fields).filter(([k]) => !k.endsWith("LookupId")),
      )
      console.warn("[Budget] Champs Lookup refusés — réessai sans Projet/TypeDepense. Voir console pour les vrais noms SP.")
      created = await createListItem<BudgetSPItem>(token, LIST_NAME, fieldsSansLookup)
    } else {
      throw err
    }
  }
  return mapBudget(created)
}

/* ── Diagnostic colonnes ── */
export async function logBudgetsColumns(token: string): Promise<void> {
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
