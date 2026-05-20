import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type {
  DemandeAbsence,
  StatutDemandeAbsence,
  TypeDemandeAbsence,
  EvenementFamilial,
} from "@/types/rh"

const LIST_NAME = "Demandes_Absences"

/* ── Génère un code unique de demande  ex: ABS-202605-7423 ── */
export function genererCodeDemande(): string {
  const now  = new Date()
  const ym   = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ABS-${ym}-${rand}`
}

/* ════════════════════════════════════════════════
   Mapping statuts TypeScript ↔ valeurs SharePoint
   ════════════════════════════════════════════════ */

const STATUT_VERS_SP: Record<StatutDemandeAbsence, string> = {
  SOUMIS:          "Soumis",
  VALIDE_CHEF:     "Validé Chef",
  REJETE_CHEF:     "Rejeté Chef",
  APPROUVE_DG:     "Approuvé DG",
  REFUSE_DG:       "Refusé DG",
  DOCUMENT_GENERE: "Document généré",
}

function spVersStatut(sp: string | undefined): StatutDemandeAbsence {
  const MAP: Record<string, StatutDemandeAbsence> = {
    "Soumis":          "SOUMIS",
    "Validé Chef":     "VALIDE_CHEF",
    "Rejeté Chef":     "REJETE_CHEF",
    "Approuvé DG":     "APPROUVE_DG",
    "Refusé DG":       "REFUSE_DG",
    "Document généré": "DOCUMENT_GENERE",
    /* rétrocompatibilité anciens enregistrements */
    "En attente DG":   "SOUMIS",
  }
  return MAP[sp ?? ""] ?? "SOUMIS"
}

/* ── Mapping types de demande ── */
const TYPE_VERS_SP: Record<TypeDemandeAbsence, string> = {
  AUTORISATION_SIMPLE:       "Autorisation d'absence simple",
  PERMISSION_EXCEPTIONNELLE: "Permission exceptionnelle",
  EVENEMENT_FAMILIAL:        "Événement familial",
  AUTRE:                     "Autre",
}

function spVersType(sp: string | undefined): TypeDemandeAbsence {
  const MAP: Record<string, TypeDemandeAbsence> = {
    "Autorisation d'absence simple": "AUTORISATION_SIMPLE",
    "Permission exceptionnelle":     "PERMISSION_EXCEPTIONNELLE",
    "Événement familial":            "EVENEMENT_FAMILIAL",
    "Autre":                         "AUTRE",
  }
  return MAP[sp ?? ""] ?? "AUTORISATION_SIMPLE"
}

/* ── Mapping événements familiaux ── */
const EVENEMENT_VERS_SP: Record<EvenementFamilial, string> = {
  MARIAGE_MEMBRE_PERSONNEL:    "Mariage d'un membre du personnel",
  MARIAGE_ENFANT:              "Mariage d'un enfant",
  MARIAGE_FRERE_SOEUR:         "Mariage d'un frère ou d'une sœur",
  NAISSANCE_ENFANT:            "Naissance d'un enfant",
  DECES_CONJOINT:              "Décès du conjoint",
  DECES_ASCENDANT_FRERE_SOEUR: "Décès d'un ascendant / frère / sœur",
  DECES_ENFANT:                "Décès d'un enfant",
}

const SP_VERS_EVENEMENT: Record<string, EvenementFamilial> = Object.fromEntries(
  Object.entries(EVENEMENT_VERS_SP).map(([k, v]) => [v, k as EvenementFamilial]),
)

/* ════════════════════════════════════════════════
   Interface brute SharePoint
   Noms internes à vérifier via logDemandesAbsencesColumns()
   si les données n'apparaissent pas en console.
   ════════════════════════════════════════════════ */
interface DemandeAbsenceSPFields {
  Title?:               string
  Code_Demande?:        string
  Demandeur?:           string
  NomDemandeur?:        string
  Departement?:         string
  Poste?:               string
  Type_Demande?:        string
  Evenement_Familial?:  string
  Type_Absence_Autre?:  string
  Motif_Absence?:       string
  Date_Debut?:          string
  Date_Fin?:            string
  Nb_Jours_Demandes?:   number
  Nb_Jours_Autorises?:  number
  Statut?:              string
  /* Validation Chef de département */
  CommentaireChef?:     string
  DateValidationChef?:  string
  ValideParChef?:       string
  /* Décision Direction Générale */
  Commentaire_DG?:      string
  Date_Decision_DG?:    string
  Valide_Par_DG?:       string
  Document_Genere?:     boolean | string
  Created?:             string
}

interface DemandeAbsenceSPItem {
  id:     string
  fields: DemandeAbsenceSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: DemandeAbsenceSPItem): DemandeAbsence {
  const f = item.fields
  return {
    id:               item.id,
    codeDemande:      f.Code_Demande    ?? "",
    demandeur:        f.Demandeur       ?? "",
    nomDemandeur:     f.NomDemandeur    ?? (f.Demandeur?.split("@")[0] ?? ""),
    departement:      f.Departement     ?? "",
    poste:            f.Poste           ?? undefined,
    dateDemande:      f.Created         ?? "",
    typeDemande:      spVersType(f.Type_Demande),
    typeAbsenceAutre: f.Type_Absence_Autre ?? undefined,
    evenementFamilial: f.Evenement_Familial
      ? SP_VERS_EVENEMENT[f.Evenement_Familial]
      : undefined,
    motifAbsence:     f.Motif_Absence   ?? "",
    dateDebut:        f.Date_Debut      ?? "",
    dateFin:          f.Date_Fin        ?? "",
    nbJoursDemandes:  Number(f.Nb_Jours_Demandes)  || 0,
    nbJoursAutorises: f.Nb_Jours_Autorises != null
      ? Number(f.Nb_Jours_Autorises)
      : undefined,
    statut:             spVersStatut(f.Statut),
    commentaireChef:    f.CommentaireChef    ?? undefined,
    dateValidationChef: f.DateValidationChef ?? undefined,
    valideParChef:      f.ValideParChef      ?? undefined,
    commentaireDG:      f.Commentaire_DG     ?? undefined,
    dateDecisionDG:     f.Date_Decision_DG   ?? undefined,
    validePar:          f.Valide_Par_DG      ?? undefined,
    documentGenere:
      f.Document_Genere === true ||
      f.Document_Genere === "true" ||
      f.Document_Genere === "1",
  }
}

/* ── Récupère toutes les demandes d'autorisation d'absence ── */
let _columnsDiagDone = false

export async function getDemandesAbsences(token: string): Promise<DemandeAbsence[]> {
  if (import.meta.env.DEV && !_columnsDiagDone) {
    _columnsDiagDone = true
    logDemandesAbsencesColumns(token).catch(() => {/* silencieux */})
  }

  const items = await getListItems<DemandeAbsenceSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime())
}

/* ── Crée une nouvelle demande d'autorisation d'absence ── */
export async function createDemandeAbsence(
  token: string,
  data:  Omit<DemandeAbsence, "id" | "dateDemande" | "codeDemande" | "statut" | "documentGenere">,
): Promise<DemandeAbsence> {
  const code = genererCodeDemande()

  const rawFields: Record<string, unknown> = {
    Title:               code,
    Code_Demande:        code,
    Demandeur:           data.demandeur          || undefined,
    NomDemandeur:        data.nomDemandeur        || undefined,
    Departement:         data.departement         || undefined,
    Poste:               data.poste               || undefined,
    Type_Demande:        TYPE_VERS_SP[data.typeDemande],
    Evenement_Familial:  data.evenementFamilial
      ? EVENEMENT_VERS_SP[data.evenementFamilial]
      : undefined,
    Type_Absence_Autre:  data.typeAbsenceAutre    || undefined,
    Motif_Absence:       data.motifAbsence        || undefined,
    Date_Debut:          data.dateDebut           || undefined,
    Date_Fin:            data.dateFin             || undefined,
    Nb_Jours_Demandes:   data.nbJoursDemandes     ?? undefined,
    Nb_Jours_Autorises:  data.nbJoursAutorises    ?? undefined,
    Statut:              "Soumis",
    Document_Genere:     false,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined && v !== null),
  )

  const created = await createListItem<DemandeAbsenceSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut — Chef Dept. ou Directrice ── */
export async function updateStatutDemandeAbsence(
  token:        string,
  id:           string,
  statut:       StatutDemandeAbsence,
  commentaire?: string,
  validePar?:   string,
  role?:        string,  // "Chef Dept." | "Directrice" | undefined
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]

  const rawFields: Record<string, unknown> = {
    Statut: STATUT_VERS_SP[statut],
  }

  /* Le Chef de département écrit ses propres champs */
  if (role === "Chef Dept." || statut === "VALIDE_CHEF" || statut === "REJETE_CHEF") {
    rawFields.CommentaireChef    = commentaire || undefined
    rawFields.ValideParChef      = validePar   || undefined
    rawFields.DateValidationChef = today
  } else {
    /* La Directrice écrit les champs DG */
    rawFields.Commentaire_DG = commentaire || undefined
    rawFields.Valide_Par_DG  = validePar   || undefined
    if (statut === "APPROUVE_DG" || statut === "REFUSE_DG") {
      rawFields.Date_Decision_DG = today
    }
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic colonnes SharePoint (dev uniquement) ── */
interface SPColumn { displayName: string; name: string }

export async function logDemandesAbsencesColumns(token: string): Promise<void> {
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
