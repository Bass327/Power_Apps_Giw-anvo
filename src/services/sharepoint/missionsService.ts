import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type { Mission, StatutMission, TypeMission, MoyenTransportMission } from "@/types/rh"
import { LABEL_MOYEN_TRANSPORT_MISSION } from "@/types/rh"

const LIST_NAME = "Ordres_Mission"

/* ════════════════════════════════════════════════
   Mapping statuts : valeurs TypeScript ↔ valeurs SharePoint
   ════════════════════════════════════════════════ */

function statutVersSP(statut: StatutMission): string {
  const MAP: Record<StatutMission, string> = {
    BROUILLON: "Brouillon",
    SOUMIS:    "Soumis",
    APPROUVE:  "Approuvé DG",
    EN_COURS:  "En cours",
    TERMINE:   "Terminé",
    REJETE:    "Rejeté",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutMission {
  const MAP: Record<string, StatutMission> = {
    "Brouillon":   "BROUILLON",
    "Soumis":      "SOUMIS",
    "Approuvé":    "APPROUVE",
    "Approuvé DG": "APPROUVE",
    "En cours":    "EN_COURS",
    "Terminé":     "TERMINE",
    "Rejeté":      "REJETE",
  }
  return MAP[sp ?? ""] ?? "BROUILLON"
}

/* Reverse-map : label français SharePoint → clé TypeScript */
const SP_VERS_MOYEN_TRANSPORT: Record<string, MoyenTransportMission> = Object.fromEntries(
  Object.entries(LABEL_MOYEN_TRANSPORT_MISSION).map(([key, label]) => [label, key as MoyenTransportMission])
)

/* ── Noms internes SharePoint pour les colonnes créées manuellement ──
   À VÉRIFIER via logMissionsColumns() si les données n'apparaissent pas.
   Ouvrir la console navigateur et chercher le tableau "Colonnes SharePoint — Ordres_Mission".
*/
const COL_MATRICULE   = "Matricule"    // nom interne réel de la colonne matricule
const COL_CHARGES     = "Charges"      // nom interne réel de la colonne prises en charge
const COL_DEPARTEMENT = "Departement"  // nom interne réel de la colonne département

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
  Mode_Transport?:        string   // moyen de transport (label français)
  Frais_Perdiem?:         number   // montant avance sur frais
  Statut?:                string   // statut de la mission
  Participants?:          string   // JSON : ["Nom, Poste", ...]
  DG_Commentaire?:        string   // commentaire de la DG
  Date_Decision?:         string   // date d'approbation/rejet
  Created?:               string   // date de création
  [key: string]:          unknown  // champs dynamiques (Matricule, Charges, Departement…)
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

  /* TypeMission : valeur reconnue ou texte personnalisé → AUTRE */
  const TYPE_MISSION_KEYS: TypeMission[] = [
    "TECHNIQUE", "COMMERCIALE", "INSTITUTIONNELLE", "LOGISTIQUE", "MAINTENANCE", "AUTRE",
  ]
  const rawType = f.TypeMission ?? ""
  const typeMission: TypeMission = TYPE_MISSION_KEYS.includes(rawType as TypeMission)
    ? (rawType as TypeMission)
    : "AUTRE"
  const typeMissionPersonnalisee = !TYPE_MISSION_KEYS.includes(rawType as TypeMission) && rawType
    ? rawType
    : undefined

  /* Prises en charge : CSV → tableau (via constante COL_CHARGES) */
  const rawCharges = f[COL_CHARGES] as string | undefined
  const chargesIncluses = rawCharges
    ? rawCharges.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined

  return {
    id:               item.id,
    intitule:         f.Title            ?? "",
    typeMission,
    typeMissionPersonnalisee,
    objectif:         f.Objet            ?? "",
    departement:      (f[COL_DEPARTEMENT] as string | undefined) ?? undefined,
    region:           f.Region           ?? undefined,
    lieux:            f.Lieu_Mission     ?? "",
    dateDepart:       f.Date_D_x00e9_part ?? "",
    dateRetour:       f.Date_Retour      ?? "",
    duree,
    moyenTransport:   (() => {
      const labels = (f.Mode_Transport ?? "").split(",").map(s => s.trim()).filter(Boolean)
      const keys = labels
        .map(label => SP_VERS_MOYEN_TRANSPORT[label] ?? null)
        .filter((k): k is MoyenTransportMission => k !== null)
      return keys.length > 0 ? keys : ["TRANSPORT_PUBLIC" as MoyenTransportMission]
    })(),
    matricule:        (f[COL_MATRICULE] as string | undefined) ?? undefined,
    chargesIncluses,
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

/* ── Diagnostic colonnes — déclenché une seule fois au premier chargement (dev) ── */
let _columnsDiagDone = false

/* ── Récupère toutes les missions ── */
export async function getMissions(token: string): Promise<Mission[]> {
  if (import.meta.env.DEV && !_columnsDiagDone) {
    _columnsDiagDone = true
    logMissionsColumns(token).catch(() => {/* silencieux */})
  }

  const items = await getListItems<MissionSPItem>(token, LIST_NAME)

  /* Avertissement si les colonnes clés sont absentes du premier élément */
  if (import.meta.env.DEV && items.length > 0) {
    const firstFields = items[0].fields as Record<string, unknown>
    if (!(COL_MATRICULE in firstFields))
      console.warn(`[Missions] Colonne introuvable : "${COL_MATRICULE}". Vérifier le nom interne dans logMissionsColumns.`)
    if (!(COL_CHARGES in firstFields))
      console.warn(`[Missions] Colonne introuvable : "${COL_CHARGES}". Vérifier le nom interne dans logMissionsColumns.`)
    if (!(COL_DEPARTEMENT in firstFields))
      console.warn(`[Missions] Colonne introuvable : "${COL_DEPARTEMENT}". À créer dans SharePoint si absente.`)
  }

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
    Title:                data.intitule        || undefined,
    Agent:                data.demandeur       || undefined,
    /* Si type personnalisé fourni (AUTRE + texte libre), on l'enregistre directement */
    TypeMission:          data.typeMissionPersonnalisee || data.typeMission || undefined,
    Objet:                data.objectif        || undefined,
    [COL_DEPARTEMENT]:    data.departement     || undefined,
    Region:               data.region          || undefined,
    Lieu_Mission:         data.lieux           || undefined,
    Date_D_x00e9_part:    data.dateDepart      || undefined,
    Date_Retour:          data.dateRetour      || undefined,
    Mode_Transport:       data.moyenTransport.length > 0
      ? data.moyenTransport.map(k => LABEL_MOYEN_TRANSPORT_MISSION[k]).join(", ")
      : undefined,
    [COL_MATRICULE]:      data.matricule       || undefined,
    [COL_CHARGES]:        data.chargesIncluses?.length
      ? data.chargesIncluses.join(", ")
      : undefined,
    Statut:               statutVersSP(statut),
    Participants:         data.participants?.length
      ? JSON.stringify(data.participants)
      : undefined,
    Frais_Perdiem:        data.besoinAvance ? (data.montantAvance ?? undefined) : undefined,
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
