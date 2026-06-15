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

/* ── Mapping événements familiaux (conservé pour usage futur quand la colonne SP sera ajoutée) ── */
export const EVENEMENT_VERS_SP: Record<EvenementFamilial, string> = {
  MARIAGE_MEMBRE_PERSONNEL:    "Mariage d'un membre du personnel",
  MARIAGE_ENFANT:              "Mariage d'un enfant",
  MARIAGE_FRERE_SOEUR:         "Mariage d'un frère ou d'une sœur",
  NAISSANCE_ENFANT:            "Naissance d'un enfant",
  DECES_CONJOINT:              "Décès du conjoint",
  DECES_ASCENDANT_FRERE_SOEUR: "Décès d'un ascendant / frère / sœur",
  DECES_ENFANT:                "Décès d'un enfant",
}

/* ════════════════════════════════════════════════
   Interface brute SharePoint — noms internes confirmés
   via logDemandesAbsencesColumns() le 2026-05-21.

   Colonnes ABSENTES de la liste SP (à ajouter si besoin) :
   - Poste, EvenementFamilial, TypeAbsenceAutre
   - CommentaireChef, DateValidationChef, ValideParChef
   ════════════════════════════════════════════════ */
interface DemandeAbsenceSPFields {
  Title?:                           string   // Code demande (ex: ABS-202605-7423)
  Demandeur?:                       string   // Email demandeur
  NomDemandeur?:                    string   // Nom complet du demandeur
  D_x00e9_partement?:               string   // Département
  Typed_x2019_absence?:             string   // Type d'absence
  Motif?:                           string   // Motif
  Dated_x00e9_but?:                 string   // Date début
  Datefin?:                         string   // Date fin
  Nombrejoursdemand_x00e9_s?:       number   // Nombre jours demandés
  Nombrejoursautoris_x00e9_s?:      number   // Nombre jours autorisés
  Statut?:                          string
  /* Décision Direction Générale */
  CommentaireDG?:                   string
  Dated_x00e9_cisionDG?:            string   // Date décision DG
  Valid_x00e9_parDG?:               string   // Validé par DG
  Documentg_x00e9_n_x00e9_r_x00e9_?: boolean | string  // Document généré
  Created?:                         string
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
    codeDemande:      f.Title                    ?? "",
    demandeur:        f.Demandeur                ?? "",
    nomDemandeur:     f.NomDemandeur ?? f.Demandeur?.split("@")[0] ?? "",
    departement:      f.D_x00e9_partement        ?? "",
    poste:            undefined,
    dateDemande:      f.Created                  ?? "",
    typeDemande:      spVersType(f.Typed_x2019_absence),
    typeAbsenceAutre:  undefined,
    evenementFamilial: undefined,
    motifAbsence:     f.Motif                    ?? "",
    dateDebut:        f.Dated_x00e9_but          ?? "",
    dateFin:          f.Datefin                  ?? "",
    nbJoursDemandes:  Number(f.Nombrejoursdemand_x00e9_s)  || 0,
    nbJoursAutorises: f.Nombrejoursautoris_x00e9_s != null
      ? Number(f.Nombrejoursautoris_x00e9_s)
      : undefined,
    statut:             spVersStatut(f.Statut),
    commentaireChef:    undefined,
    dateValidationChef: undefined,
    valideParChef:      undefined,
    commentaireDG:      f.CommentaireDG                    ?? undefined,
    dateDecisionDG:     f.Dated_x00e9_cisionDG             ?? undefined,
    validePar:          f.Valid_x00e9_parDG                ?? undefined,
    documentGenere:
      f.Documentg_x00e9_n_x00e9_r_x00e9_ === true  ||
      f.Documentg_x00e9_n_x00e9_r_x00e9_ === "true" ||
      f.Documentg_x00e9_n_x00e9_r_x00e9_ === "1",
  }
}

/* Noms internes SP confirmés — seuls ceux-ci sont demandés dans le $select
   pour éviter un 400 sur les colonnes système incompatibles. */
const SP_FIELDS_SELECT = [
  "Title", "Demandeur", "NomDemandeur", "D_x00e9_partement",
  "Typed_x2019_absence", "Motif",
  "Dated_x00e9_but", "Datefin",
  "Nombrejoursdemand_x00e9_s", "Nombrejoursautoris_x00e9_s",
  "Statut", "CommentaireDG", "Dated_x00e9_cisionDG",
  "Valid_x00e9_parDG", "Documentg_x00e9_n_x00e9_r_x00e9_",
  "Created",
].join(",")

/* ── Récupère les demandes d'autorisation d'absence ──
   filterEmail : si fourni, filtre côté serveur sur le champ Demandeur.
   Utilisé pour le scope "own" afin que chaque employé ne voit que ses demandes.
   La DG et le RAF passent filterEmail = undefined → récupère tout. */
let _columnsDiagDone = false

export async function getDemandesAbsences(
  token:        string,
  filterEmail?: string,
): Promise<DemandeAbsence[]> {
  if (!_columnsDiagDone) {
    _columnsDiagDone = true
    logDemandesAbsencesColumns(token).catch(() => {/* silencieux */})
  }

  /* Échapper les apostrophes OData avant d'injecter dans le $filter */
  const filterClause = filterEmail
    ? `&$filter=fields/Demandeur eq '${filterEmail.replace(/'/g, "''")}'`
    : ""

  const items = await getListItems<DemandeAbsenceSPItem>(
    token,
    LIST_NAME,
    `($select=${SP_FIELDS_SELECT})${filterClause}`,
  )
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
    Title:                      code,
    Demandeur:                  data.demandeur       || undefined,
    NomDemandeur:               data.nomDemandeur    || undefined,
    D_x00e9_partement:          data.departement     || undefined,
    Typed_x2019_absence:        TYPE_VERS_SP[data.typeDemande],
    Motif:                      data.motifAbsence    || undefined,
    Dated_x00e9_but:            data.dateDebut       || undefined,
    Datefin:                    data.dateFin         || undefined,
    Nombrejoursdemand_x00e9_s:  data.nbJoursDemandes ?? undefined,
    Statut:                     "Soumis",
    Documentg_x00e9_n_x00e9_r_x00e9_: false,
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
  role?:        string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]

  const rawFields: Record<string, unknown> = {
    Statut: STATUT_VERS_SP[statut],
  }

  if (role === "Chef Dept." || statut === "VALIDE_CHEF" || statut === "REJETE_CHEF") {
    /* Les colonnes Chef n'existent pas encore dans SP — seul le statut est mis à jour.
       Ajouter CommentaireChef, ValideParChef, DateValidationChef dans SP pour activer. */
  } else {
    rawFields.CommentaireDG         = commentaire || undefined
    rawFields.Valid_x00e9_parDG     = validePar   || undefined
    if (statut === "APPROUVE_DG" || statut === "REFUSE_DG") {
      rawFields.Dated_x00e9_cisionDG = today
    }
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic colonnes SharePoint ── */
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
