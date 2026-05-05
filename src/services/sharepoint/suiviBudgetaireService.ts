import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type {
  LigneBudgetaire,
  StatutBudget,
  TypeBudget,
  CategorieBudget,
  Trimestre,
} from "@/types/budget"

const LIST_NAME = "Suivi_Budgtaire"  // nom interne SP (accent supprimé)

/* ── Mapping statuts ── */
function statutVersSP(statut: StatutBudget): string {
  const MAP: Record<StatutBudget, string> = {
    BROUILLON:  "Brouillon",
    SOUMIS:     "Soumis",
    VALIDE_RAF: "Validé RAF",
    APPROUVE:   "Approuvé DG",
    REJETE:     "Rejeté",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutBudget {
  const MAP: Record<string, StatutBudget> = {
    "Brouillon":   "BROUILLON",
    "Soumis":      "SOUMIS",
    "Validé RAF":  "VALIDE_RAF",
    "Approuvé DG": "APPROUVE",
    "Rejeté":      "REJETE",
  }
  return MAP[sp ?? ""] ?? (sp as StatutBudget) ?? "BROUILLON"
}

/* ── Interface brute SharePoint ── */
interface BudgetSPFields {
  Title?:            string   // intitulé du poste
  Code?:             string   // code ligne
  Departement?:      string
  Annee?:            number
  Categorie?:        string
  Type?:             string
  Montant_PAB?:      number
  Montant_Revise?:   number
  Montant_Engage?:   number
  Montant_Realise?:  number
  Statut?:           string
  Trimestre?:        string
  Demandeur?:        string
  Commentaire?:      string
  CommentaireRAF?:   string
  DateValidation?:   string
  Created?:          string
}

interface BudgetSPItem {
  id:     string
  fields: BudgetSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: BudgetSPItem): LigneBudgetaire {
  const f = item.fields
  return {
    id:              item.id,
    titre:           f.Title            ?? "",
    code:            f.Code             ?? "",
    departement:     f.Departement      ?? "",
    annee:           Number(f.Annee)    || new Date().getFullYear(),
    categorie:       (f.Categorie as CategorieBudget) ?? "FONCTIONNEMENT",
    type:            (f.Type as TypeBudget) ?? "INITIAL",
    montantPAB:      Number(f.Montant_PAB)     || 0,
    montantRevise:   Number(f.Montant_Revise)  || Number(f.Montant_PAB) || 0,
    montantEngage:   Number(f.Montant_Engage)  || 0,
    montantRealise:  Number(f.Montant_Realise) || 0,
    statut:          spVersStatut(f.Statut),
    trimestre:       (f.Trimestre as Trimestre) ?? undefined,
    demandeur:       f.Demandeur        ?? "",
    commentaire:     f.Commentaire      ?? undefined,
    commentaireRAF:  f.CommentaireRAF   ?? undefined,
    dateCreation:    f.Created          ?? "",
    dateValidation:  f.DateValidation   ?? undefined,
  }
}

/* ── Récupère toutes les lignes budgétaires ── */
export async function getLignesBudgetaires(token: string): Promise<LigneBudgetaire[]> {
  const items = await getListItems<BudgetSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
}

/* ── Crée une nouvelle ligne budgétaire ── */
export async function createLigneBudgetaire(
  token:     string,
  data:      Omit<LigneBudgetaire, "id" | "dateCreation">,
  soumettre: boolean,
): Promise<LigneBudgetaire> {
  const statut: StatutBudget = soumettre ? "SOUMIS" : "BROUILLON"

  const rawFields: Record<string, unknown> = {
    Title:           data.titre          || undefined,
    Code:            data.code           || undefined,
    Departement:     data.departement    || undefined,
    Annee:           data.annee          ?? undefined,
    Categorie:       data.categorie      || undefined,
    Type:            data.type           || undefined,
    Montant_PAB:     data.montantPAB     ?? undefined,
    Montant_Revise:  data.montantRevise  ?? undefined,
    Montant_Engage:  data.montantEngage  ?? undefined,
    Montant_Realise: data.montantRealise ?? undefined,
    Statut:          statutVersSP(statut),
    Trimestre:       data.trimestre      || undefined,
    Demandeur:       data.demandeur      || undefined,
    Commentaire:     data.commentaire    || undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<BudgetSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut (validation RAF / approbation DG / rejet) ── */
export async function updateStatutBudget(
  token:       string,
  id:          string,
  statut:      StatutBudget,
  commentaire?: string,
): Promise<void> {
  const now = new Date().toISOString()

  const rawFields: Record<string, unknown> = {
    Statut: statutVersSP(statut),
  }

  if (statut === "VALIDE_RAF") {
    rawFields.CommentaireRAF  = commentaire || undefined
    rawFields.DateValidation  = now
  } else if (statut === "APPROUVE") {
    rawFields.CommentaireRAF  = commentaire || undefined
    rawFields.DateValidation  = now
  } else if (statut === "REJETE") {
    rawFields.CommentaireRAF  = commentaire || undefined
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Met à jour les montants d'exécution ── */
export async function updateExecutionBudget(
  token:          string,
  id:             string,
  montantEngage:  number,
  montantRealise: number,
): Promise<void> {
  await updateListItem(token, LIST_NAME, id, {
    Montant_Engage:  montantEngage,
    Montant_Realise: montantRealise,
  })
}

/* ── Diagnostic colonnes ── */
interface SPColumn { displayName: string; name: string }

export async function logBudgetColumns(token: string): Promise<void> {
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
