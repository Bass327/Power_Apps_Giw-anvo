import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { Evaluation, StatutEvaluation, PeriodeEvaluation, NoteEvaluation } from "@/types/rh"

const LIST_NAME = "valuations_Performance"  // nom interne SharePoint (accent initial supprimé)

/* ════════════════════════════════════════════════
   Mapping statuts : valeurs TypeScript ↔ valeurs SharePoint
   ════════════════════════════════════════════════ */

function statutVersSP(statut: StatutEvaluation): string {
  const MAP: Record<StatutEvaluation, string> = {
    PLANIFIEE:    "Planifiée",
    AUTOEVAL:     "Autoévaluation",
    EVAL_MANAGER: "Évaluation manager",
    EN_REVUE_RH:  "En revue RH",
    VALIDEE:      "Validée",
    CLOTUREE:     "Clôturée",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutEvaluation {
  const MAP: Record<string, StatutEvaluation> = {
    "Planifiée":          "PLANIFIEE",
    "Autoévaluation":     "AUTOEVAL",
    "Évaluation manager": "EVAL_MANAGER",
    "En revue RH":        "EN_REVUE_RH",
    "Validée":            "VALIDEE",
    "Clôturée":           "CLOTUREE",
  }
  return MAP[sp ?? ""] ?? "PLANIFIEE"
}

/* ── Interface brute SharePoint ── */
interface EvaluationSPFields {
  Title?:            string   // résumé / titre de l'évaluation
  Employe?:          string   // email de l'employé évalué
  Evaluateur?:       string   // email de l'évaluateur
  Periode?:          string   // S1 / S2 / ANNUELLE
  Annee?:            number
  Objectifs?:        string
  Resultats?:        string
  Note?:             string   // ex : "Satisfaisant"
  Commentaires?:     string
  PlanAmelioration?: string
  Statut?:           string
  DatePlanification?: string
  DateValidation?:   string
  Created?:          string
}

interface EvaluationSPItem {
  id:     string
  fields: EvaluationSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: EvaluationSPItem): Evaluation {
  const f = item.fields
  return {
    id:                item.id,
    employe:           f.Employe           ?? "",
    evaluateur:        f.Evaluateur        ?? "",
    periode:           (f.Periode as PeriodeEvaluation) ?? "ANNUELLE",
    annee:             Number(f.Annee)     || new Date().getFullYear(),
    objectifs:         f.Objectifs         ?? "",
    resultats:         f.Resultats         ?? undefined,
    note:              (f.Note as NoteEvaluation) ?? undefined,
    commentaires:      f.Commentaires      ?? undefined,
    planAmelioration:  f.PlanAmelioration  ?? undefined,
    statut:            spVersStatut(f.Statut),
    datePlanification: f.DatePlanification ?? f.Created ?? "",
    dateValidation:    f.DateValidation    ?? undefined,
  }
}

/* ── Récupère toutes les évaluations ── */
export async function getEvaluations(token: string): Promise<Evaluation[]> {
  const items = await getListItems<EvaluationSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => {
      // Tri : année décroissante, puis date de planification décroissante
      if (b.annee !== a.annee) return b.annee - a.annee
      return new Date(b.datePlanification).getTime() - new Date(a.datePlanification).getTime()
    })
}

/* ── Crée une nouvelle évaluation ── */
export async function createEvaluation(
  token: string,
  data:  Omit<Evaluation, "id">,
): Promise<Evaluation> {
  const rawFields: Record<string, unknown> = {
    Title:             `Évaluation ${data.employe} — ${data.annee}`,
    Employe:           data.employe            || undefined,
    Evaluateur:        data.evaluateur         || undefined,
    Periode:           data.periode            || undefined,
    Annee:             data.annee              ?? undefined,
    Objectifs:         data.objectifs          || undefined,
    Statut:            statutVersSP(data.statut ?? "PLANIFIEE"),
    DatePlanification: data.datePlanification  || undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<EvaluationSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour une évaluation (note, statut, commentaires…) ── */
export async function updateEvaluation(
  token: string,
  id:    string,
  patch: Partial<Pick<Evaluation, "statut" | "note" | "resultats" | "commentaires" | "planAmelioration" | "dateValidation">>,
): Promise<void> {
  const rawFields: Record<string, unknown> = {
    Statut:           patch.statut          ? statutVersSP(patch.statut) : undefined,
    Note:             patch.note            ?? undefined,
    Resultats:        patch.resultats       ?? undefined,
    Commentaires:     patch.commentaires    ?? undefined,
    PlanAmelioration: patch.planAmelioration ?? undefined,
    DateValidation:   patch.statut === "VALIDEE" ? new Date().toISOString().split("T")[0] : undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic : affiche les colonnes dans la console ── */
interface SPColumn { displayName: string; name: string }

export async function logEvaluationsColumns(token: string): Promise<void> {
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
