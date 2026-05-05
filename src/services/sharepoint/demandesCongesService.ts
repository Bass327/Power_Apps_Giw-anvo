import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { DemandeConge, StatutConge, TypeConge } from "@/types/rh"

const LIST_NAME = "Demandes_Congs"  // nom interne SharePoint (sans accent)

/* ════════════════════════════════════════════════
   Mapping statuts : valeurs TypeScript ↔ valeurs SharePoint
   ════════════════════════════════════════════════ */

function statutVersSP(statut: StatutConge): string {
  const MAP: Record<StatutConge, string> = {
    BROUILLON:  "Brouillon",
    SOUMIS:     "Soumis",
    APPROUVE:   "Approuvé",
    REJETE:     "Refusé",
    EN_COURS:   "En cours",
    TERMINE:    "Terminé",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutConge {
  const MAP: Record<string, StatutConge> = {
    "Brouillon": "BROUILLON",
    "Soumis":    "SOUMIS",
    "Approuvé":  "APPROUVE",
    "Refusé":    "REJETE",
    "En cours":  "EN_COURS",
    "Terminé":   "TERMINE",
  }
  return MAP[sp ?? ""] ?? (sp as StatutConge) ?? "BROUILLON"
}

/* ── Interface brute SharePoint ── */
interface CongesSPFields {
  Title?:          string   // motif / objet de la demande
  TypeConge?:      string
  DateDebut?:      string
  DateFin?:        string
  DureeJours?:     number
  Demandeur?:      string   // email
  Statut?:         string
  Commentaire?:    string
  Valideur?:       string
  DateValidation?: string
  Created?:        string
}

interface CongesSPItem {
  id:     string
  fields: CongesSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: CongesSPItem): DemandeConge {
  const f = item.fields
  return {
    id:              item.id,
    typeConge:       (f.TypeConge as TypeConge) ?? "ANNUEL",
    dateDebut:       f.DateDebut      ?? "",
    dateFin:         f.DateFin        ?? "",
    duree:           Number(f.DureeJours) || 1,
    motif:           f.Title          ?? "",
    demandeur:       f.Demandeur      ?? "",
    dateDemande:     f.Created        ?? "",
    statut:          spVersStatut(f.Statut),
    commentaire:     f.Commentaire    ?? undefined,
    valideur:        f.Valideur       ?? undefined,
    dateValidation:  f.DateValidation ?? undefined,
  }
}

/* ── Récupère toutes les demandes de congé ── */
export async function getDemandesConges(token: string): Promise<DemandeConge[]> {
  const items = await getListItems<CongesSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime())
}

/* ── Crée une nouvelle demande de congé ── */
export async function createDemandeConge(
  token:     string,
  data:      Omit<DemandeConge, "id" | "dateDemande">,
  soumettre: boolean,
): Promise<DemandeConge> {
  const statut: StatutConge = soumettre ? "SOUMIS" : "BROUILLON"

  const rawFields: Record<string, unknown> = {
    Title:      data.motif      || undefined,
    TypeConge:  data.typeConge  || undefined,
    DateDebut:  data.dateDebut  || undefined,
    DateFin:    data.dateFin    || undefined,
    DureeJours: data.duree      ?? undefined,
    Demandeur:  data.demandeur  || undefined,
    Statut:     statutVersSP(statut),
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<CongesSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut d'une demande (validation / rejet) ── */
export async function updateStatutConge(
  token:      string,
  id:         string,
  statut:     StatutConge,
  commentaire?: string,
  valideur?:  string,
): Promise<void> {
  const rawFields: Record<string, unknown> = {
    Statut:         statutVersSP(statut),
    Commentaire:    commentaire || undefined,
    Valideur:       valideur    || undefined,
    DateValidation: statut !== "REJETE" ? new Date().toISOString().split("T")[0] : undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic : affiche les colonnes dans la console ── */
interface SPColumn { displayName: string; name: string }

export async function logCongesColumns(token: string): Promise<void> {
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
