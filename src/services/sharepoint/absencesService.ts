import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { Absence, StatutAbsence, TypeAbsence } from "@/types/rh"

const LIST_NAME = "Absences"  // à créer dans SharePoint si inexistante

/* ── Mapping statuts ── */
function statutVersSP(statut: StatutAbsence): string {
  const MAP: Record<StatutAbsence, string> = {
    EN_ATTENTE:    "En attente",
    JUSTIFIEE:     "Justifiée",
    NON_JUSTIFIEE: "Non justifiée",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutAbsence {
  const MAP: Record<string, StatutAbsence> = {
    "En attente":    "EN_ATTENTE",
    "Justifiée":     "JUSTIFIEE",
    "Non justifiée": "NON_JUSTIFIEE",
  }
  return MAP[sp ?? ""] ?? "EN_ATTENTE"
}

/* ── Interface brute SharePoint ── */
interface AbsenceSPFields {
  Title?:           string   // objet / description courte
  TypeAbsence?:     string
  DateAbsence?:     string
  DureeJours?:      number
  Motif?:           string
  Employe?:         string   // email
  Statut?:          string
  Commentaire?:     string
  Justificatif?:    string
  DateSignalement?: string
  Created?:         string
}

interface AbsenceSPItem {
  id:     string
  fields: AbsenceSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: AbsenceSPItem): Absence {
  const f = item.fields
  return {
    id:              item.id,
    typeAbsence:     (f.TypeAbsence as TypeAbsence) ?? "AUTRE",
    dateAbsence:     f.DateAbsence    ?? "",
    duree:           Number(f.DureeJours) || 1,
    motif:           f.Motif          ?? "",
    employe:         f.Employe        ?? "",
    dateSignalement: f.Created        ?? "",
    statut:          spVersStatut(f.Statut),
    justificatif:    f.Justificatif   ?? undefined,
    commentaire:     f.Commentaire    ?? undefined,
  }
}

/* ── Récupère toutes les absences ── */
export async function getAbsences(token: string): Promise<Absence[]> {
  const items = await getListItems<AbsenceSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateSignalement).getTime() - new Date(a.dateSignalement).getTime())
}

/* ── Signale une nouvelle absence ── */
export async function createAbsence(
  token: string,
  data:  Omit<Absence, "id" | "dateSignalement">,
): Promise<Absence> {
  const rawFields: Record<string, unknown> = {
    Title:        data.motif         || LABEL_TYPE_ABSENCE_SP[data.typeAbsence],
    TypeAbsence:  data.typeAbsence   || undefined,
    DateAbsence:  data.dateAbsence   || undefined,
    DureeJours:   data.duree         ?? undefined,
    Motif:        data.motif         || undefined,
    Employe:      data.employe       || undefined,
    Statut:       statutVersSP("EN_ATTENTE"),
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<AbsenceSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut d'une absence ── */
export async function updateStatutAbsence(
  token:       string,
  id:          string,
  statut:      StatutAbsence,
  commentaire?: string,
): Promise<void> {
  const rawFields: Record<string, unknown> = {
    Statut:      statutVersSP(statut),
    Commentaire: commentaire || undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* Labels utilisés pour le Title SP */
const LABEL_TYPE_ABSENCE_SP: Record<string, string> = {
  MALADIE:     "Maladie",
  PERSONNELLE: "Raison personnelle",
  FORMATION:   "Formation",
  AUTRE:       "Autre",
}

/* ── Diagnostic colonnes ── */
interface SPColumn { displayName: string; name: string }

export async function logAbsencesColumns(token: string): Promise<void> {
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
