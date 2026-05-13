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

/* ── Interface brute SharePoint — noms internes réels ── */
interface MissionSPFields {
  Title?:                 string   // intitulé de la mission
  Agent?:                 string   // demandeur (email)
  TypeMission?:           string   // type de mission
  Objet?:                 string   // objectif de la mission
  Region?:                string   // région
  Lieu_Mission?:          string   // lieu(x)
  Date_D_x00e9_part?:     string   // date de départ
  Date_Retour?:           string   // date de retour
  Mode_Transport?:        string   // moyen de transport
  Frais_Perdiem?:         number   // montant avance sur frais
  Statut?:                string   // statut de la mission
  Participants?:          string   // JSON : ["Nom, Poste", ...]
  DG_Commentaire?:        string   // commentaire de la DG
  Date_Decision?:         string   // date d'approbation/rejet
  Created?:               string   // date de création
}

interface MissionSPItem {
  id:     string
  fields: MissionSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: MissionSPItem): Mission {
  const f = item.fields

  const participants: string[] | undefined = (() => {
    if (!f.Participants) return undefined
    try { return JSON.parse(f.Participants) as string[] } catch { return undefined }
  })()

  /* Durée calculée depuis les dates */
  const duree = (() => {
    if (!f.Date_D_x00e9_part || !f.Date_Retour) return 1
    const diff = new Date(f.Date_Retour).getTime() - new Date(f.Date_D_x00e9_part).getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  })()

  return {
    id:               item.id,
    intitule:         f.Title            ?? "",
    typeMission:      (f.TypeMission as TypeMission) ?? "AUTRE",
    objectif:         f.Objet            ?? "",
    region:           f.Region           ?? undefined,
    lieux:            f.Lieu_Mission     ?? "",
    dateDepart:       f.Date_D_x00e9_part ?? "",
    dateRetour:       f.Date_Retour      ?? "",
    duree,
    moyenTransport:   (f.Mode_Transport as MoyenTransportMission) ?? "TRANSPORT_PUBLIC",
    demandeur:        f.Agent            ?? "",
    dateDemande:      f.Created          ?? "",
    statut:           spVersStatut(f.Statut),
    /* collective déduit : true si plusieurs participants */
    collective:       (participants?.length ?? 0) > 1,
    participants,
    /* besoinAvance déduit : true si Frais_Perdiem renseigné */
    besoinAvance:     (f.Frais_Perdiem ?? 0) > 0,
    montantAvance:    f.Frais_Perdiem   ?? undefined,
    commentaireDir:   f.DG_Commentaire ?? undefined,
    dateApprobation:  f.Date_Decision  ?? undefined,
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
    Title:              data.intitule        || undefined,
    Agent:              data.demandeur       || undefined,
    TypeMission:        data.typeMission     || undefined,
    Objet:              data.objectif        || undefined,
    Region:             data.region          || undefined,
    Lieu_Mission:       data.lieux           || undefined,
    Date_D_x00e9_part:  data.dateDepart      || undefined,
    Date_Retour:        data.dateRetour      || undefined,
    Mode_Transport:     data.moyenTransport  || undefined,
    Statut:             statutVersSP(statut),
    Participants:       data.participants?.length
      ? JSON.stringify(data.participants)
      : undefined,
    Frais_Perdiem:      data.besoinAvance ? (data.montantAvance ?? undefined) : undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<MissionSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut d'une mission (approbation / rejet) ── */
export async function updateStatutMission(
  token:        string,
  id:           string,
  statut:       StatutMission,
  commentaire?: string,
): Promise<void> {
  const rawFields: Record<string, unknown> = {
    Statut:         statutVersSP(statut),
    DG_Commentaire: commentaire || undefined,
    Date_Decision:  statut === "APPROUVE" ? new Date().toISOString().split("T")[0] : undefined,
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
