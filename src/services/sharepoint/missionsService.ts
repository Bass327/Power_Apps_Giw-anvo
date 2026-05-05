import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { Mission, StatutMission, TypeMission, MoyenTransportMission } from "@/types/rh"

const LIST_NAME = "Ordres_Mission"

/* ════════════════════════════════════════════════
   Mapping statuts : valeurs TypeScript ↔ valeurs SharePoint
   ════════════════════════════════════════════════ */

function statutVersSP(statut: StatutMission): string {
  const MAP: Record<StatutMission, string> = {
    BROUILLON: "Brouillon",
    SOUMIS:    "Soumis",
    APPROUVE:  "Approuvé",
    EN_COURS:  "En cours",
    TERMINE:   "Terminé",
    REJETE:    "Rejeté",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutMission {
  const MAP: Record<string, StatutMission> = {
    "Brouillon": "BROUILLON",
    "Soumis":    "SOUMIS",
    "Approuvé":  "APPROUVE",
    "En cours":  "EN_COURS",
    "Terminé":   "TERMINE",
    "Rejeté":    "REJETE",
  }
  return MAP[sp ?? ""] ?? "BROUILLON"
}

/* ── Interface brute SharePoint ── */
interface MissionSPFields {
  Title?:             string   // intitulé de la mission
  TypeMission?:       string
  Objectif?:          string
  Lieu?:              string
  DateDepart?:        string
  DateRetour?:        string
  DureeJours?:        number
  MoyenTransport?:    string
  Demandeur?:         string   // email
  Statut?:            string
  Collective?:        boolean
  NombreParticipants?: number
  BesoinAvance?:      boolean
  MontantAvance?:     number
  CommentaireDir?:    string
  DateApprobation?:   string
  Created?:           string
}

interface MissionSPItem {
  id:     string
  fields: MissionSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: MissionSPItem): Mission {
  const f = item.fields
  return {
    id:                  item.id,
    intitule:            f.Title              ?? "",
    typeMission:         (f.TypeMission as TypeMission) ?? "AUTRE",
    objectif:            f.Objectif           ?? "",
    lieux:               f.Lieu               ?? "",
    dateDepart:          f.DateDepart         ?? "",
    dateRetour:          f.DateRetour         ?? "",
    duree:               Number(f.DureeJours) || 1,
    moyenTransport:      (f.MoyenTransport as MoyenTransportMission) ?? "TRANSPORT_PUBLIC",
    demandeur:           f.Demandeur          ?? "",
    dateDemande:         f.Created            ?? "",
    statut:              spVersStatut(f.Statut),
    collective:          f.Collective         ?? false,
    nombreParticipants:  f.NombreParticipants ?? undefined,
    besoinAvance:        f.BesoinAvance       ?? false,
    montantAvance:       f.MontantAvance      ?? undefined,
    commentaireDir:      f.CommentaireDir     ?? undefined,
    dateApprobation:     f.DateApprobation    ?? undefined,
  }
}

/* ── Récupère toutes les missions ── */
export async function getMissions(token: string): Promise<Mission[]> {
  const items = await getListItems<MissionSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime())
}

/* ── Crée un nouvel ordre de mission ── */
export async function createMission(
  token:     string,
  data:      Omit<Mission, "id" | "dateDemande">,
  soumettre: boolean,
): Promise<Mission> {
  const statut: StatutMission = soumettre ? "SOUMIS" : "BROUILLON"

  const rawFields: Record<string, unknown> = {
    Title:             data.intitule          || undefined,
    TypeMission:       data.typeMission       || undefined,
    Objectif:          data.objectif          || undefined,
    Lieu:              data.lieux             || undefined,
    DateDepart:        data.dateDepart        || undefined,
    DateRetour:        data.dateRetour        || undefined,
    DureeJours:        data.duree             ?? undefined,
    MoyenTransport:    data.moyenTransport    || undefined,
    Demandeur:         data.demandeur         || undefined,
    Statut:            statutVersSP(statut),
    Collective:        data.collective        ?? undefined,
    NombreParticipants: data.collective ? (data.nombreParticipants ?? undefined) : undefined,
    BesoinAvance:      data.besoinAvance      ?? undefined,
    MontantAvance:     data.besoinAvance ? (data.montantAvance ?? undefined) : undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<MissionSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut d'une mission (approbation / rejet) ── */
export async function updateStatutMission(
  token:         string,
  id:            string,
  statut:        StatutMission,
  commentaire?:  string,
): Promise<void> {
  const rawFields: Record<string, unknown> = {
    Statut:           statutVersSP(statut),
    CommentaireDir:   commentaire || undefined,
    DateApprobation:  statut === "APPROUVE" ? new Date().toISOString().split("T")[0] : undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic : affiche les colonnes dans la console ── */
interface SPColumn { displayName: string; name: string }

export async function logMissionsColumns(token: string): Promise<void> {
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
