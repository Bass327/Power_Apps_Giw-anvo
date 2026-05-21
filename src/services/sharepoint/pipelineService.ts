/**
 * Service — Pipeline Projets Sénégal
 * Listes SharePoint (site principal GiwanvoPowerApps) :
 *   Projets_Pipeline | Pipeline_Tasks | Pipeline_Milestones
 *   Pipeline_Updates | Pipeline_Contacts
 *
 * ⚠️  Si un champ retourne une valeur vide, vérifier le nom interne
 *     via logAllLists() + logListFieldsFromSite() depuis graphClient.ts.
 */

import {
  getListItems,
  createListItem,
  updateListItem,
} from "@/lib/graphClient"
import type {
  ProjetPipeline,
  PipelineTask,
  PipelineMilestone,
  PipelineUpdate,
  PipelineContact,
  PhaseProjet,
  StatutProjet,
  Priorite,
  StatutTache,
  StatutMilestone,
  BusinessModel,
} from "@/types/pipeline"

// ⚠️ Colonnes SharePoint à créer manuellement dans la liste Projets_Pipeline :
//   Division            (type: Choice ou Text)
//   BusinessUnit        (type: Choice ou Text)
//   SecteurActivite     (type: Text)
//   CasUtilisation      (type: Text)
//   ResponsableCommercial (type: Text)
//   ResponsableFinance    (type: Text)
//   ResponsableTechnique  (type: Text)
//   AutresIntervenants    (type: Text — note multiligne)
//   ProchaineEtapeLabel   (type: Text)
//   CommentaireEcheance   (type: Note)

// ─── Types bruts retournés par Graph API ─────────────────────────────────────

interface SPRawItem {
  id:     string
  fields: Record<string, unknown>
}

// ─── Helpers de conversion ────────────────────────────────────────────────────

function str(raw: unknown, fallback = ""): string {
  if (raw === null || raw === undefined) return fallback
  const s = String(raw).trim()
  return s || fallback
}

function num(raw: unknown, fallback = 0): number {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === "number") return isNaN(raw) ? fallback : raw
  const n = parseFloat(String(raw).replace(/\s/g, "").replace(",", "."))
  return isNaN(n) ? fallback : n
}

function bool(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw
  if (raw === "Oui" || raw === "Yes" || raw === true || raw === 1) return true
  return false
}

function toDate(raw: unknown): string {
  if (!raw) return ""
  const s = String(raw)
  // Graph API renvoie "2026-05-20T10:00:00Z" — on garde YYYY-MM-DD
  return s.length >= 10 ? s.slice(0, 10) : ""
}

// ─── Mapping Projets_Pipeline ─────────────────────────────────────────────────

function mapProjet(item: SPRawItem): ProjetPipeline {
  const f = item.fields
  return {
    id:                    item.id,
    codeProjet:            str(f["CodeProjet"]),
    titre:                 str(f["Title"]),
    // "Description" peut être encodé "Description0" selon la config du site
    description:           str(f["Description"] ?? f["Description0"]),
    region:                str(f["Region"]),
    phase:                 str(f["PhaseProjet"], "01 - Préparation de la proposition") as PhaseProjet,
    statut:                str(f["StatutProjet"], "Actif")        as StatutProjet,
    priorite:              str(f["Priorite"], "Moyenne")          as Priorite,
    chefProjet:            str(f["ChefProjet"]),
    businessModel:         str(f["BusinessModel"], "Consulting / Conseil") as BusinessModel,
    // Champs étendus (colonnes optionnelles — retournent "" si absentes)
    division:              str(f["Division"])              || undefined,
    businessUnit:          str(f["BusinessUnit"])          || undefined,
    secteurActivite:       str(f["SecteurActivite"])       || undefined,
    casUtilisation:        str(f["CasUtilisation"])        || undefined,
    responsableCommercial: str(f["ResponsableCommercial"]) || undefined,
    responsableFinance:    str(f["ResponsableFinance"])    || undefined,
    responsableTechnique:  str(f["ResponsableTechnique"])  || undefined,
    autresIntervenants:    str(f["AutresIntervenants"])    || undefined,
    // Technique
    puissanceKwp:          num(f["Puissance_kWp"]),
    batterieIncluse:       bool(f["BatterieIncluse"]),
    capaciteBatterieKwh:   num(f["CapaciteBatterie_kWh"]),
    financementNecessaire: bool(f["FinancementNecessaire"]),
    montantFinancement:    num(f["MontantFinancement"]),
    sourceFinancement:     str(f["SourceFinancement"]),
    revenusAnnuelsPrevus:  num(f["RevenusAnnuelsPrevus"]),
    // Échéances
    dateDebutPrevu:        toDate(f["DateDebutPrevu"]),
    dateFinPrevu:          toDate(f["DateFinPrevu"]),
    dateProchaineEtape:    toDate(f["DateProchaineEtape"]),
    prochaineEtapeLabel:   str(f["ProchaineEtapeLabel"])   || undefined,
    commentaireEcheance:   str(f["CommentaireEcheance"])   || undefined,
    dateSignatureContrat:  toDate(f["DateSignatureContrat"]),
    partenaire:            str(f["Partenaire"]),
    notes:                 str(f["Notes"]),
    progression:           num(f["Progression"]),
    created:               toDate(f["Created"]),
    modified:              toDate(f["Modified"]),
  }
}

// ─── Mapping Pipeline_Tasks ───────────────────────────────────────────────────

function mapTask(item: SPRawItem): PipelineTask {
  const f = item.fields
  return {
    id:          item.id,
    titre:       str(f["Title"]),
    projetId:    str(f["ProjetId"]),
    projetCode:  str(f["ProjetCode"]),
    assignee:    str(f["Assignee"]),
    priorite:    str(f["Priorite"], "Moyenne")    as Priorite,
    statut:      str(f["StatutTache"], "À faire") as StatutTache,
    dateLimite:  toDate(f["DateLimite"]),
    description: str(f["Description"] ?? f["Description0"]),
    created:     toDate(f["Created"]),
    modified:    toDate(f["Modified"]),
  }
}

// ─── Mapping Pipeline_Milestones ──────────────────────────────────────────────

function mapMilestone(item: SPRawItem): PipelineMilestone {
  const f = item.fields
  return {
    id:          item.id,
    titre:       str(f["Title"]),
    projetId:    str(f["ProjetId"]),
    projetCode:  str(f["ProjetCode"]),
    datePrevue:  toDate(f["DatePrevue"]),
    dateReelle:  toDate(f["DateReelle"]),
    statut:      str(f["Statut"], "En attente") as StatutMilestone,
    description: str(f["Description"] ?? f["Description0"]),
    created:     toDate(f["Created"]),
  }
}

// ─── Mapping Pipeline_Updates ─────────────────────────────────────────────────

function mapUpdate(item: SPRawItem): PipelineUpdate {
  const f = item.fields
  return {
    id:             item.id,
    projetId:       str(f["ProjetId"]),
    champModifie:   str(f["ChampModifie"]),
    ancienneValeur: str(f["AncienneValeur"]),
    nouvelleValeur: str(f["NouvelleValeur"]),
    auteur:         str(f["Auteur"]),
    description:    str(f["Title"]),
    created:        toDate(f["Created"]),
  }
}

// ─── Mapping Pipeline_Contacts ────────────────────────────────────────────────

function mapContact(item: SPRawItem): PipelineContact {
  const f = item.fields
  return {
    id:           item.id,
    nomComplet:   str(f["Title"]),
    projetId:     str(f["ProjetId"]),
    role:         str(f["Role"]),
    email:        str(f["Email"]),
    telephone:    str(f["Telephone"]),
    organisation: str(f["Organisation"]),
    created:      toDate(f["Created"]),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API publique — Projets
// ═══════════════════════════════════════════════════════════════════════════════

export async function getProjets(token: string): Promise<ProjetPipeline[]> {
  const items = await getListItems<SPRawItem>(
    token,
    "Projets_Pipeline",
    "&$orderby=createdDateTime desc&$top=500",
  )

  // Diagnostic — affiche les vrais noms internes si des items existent
  if (items.length > 0) {
    console.log(
      "[Pipeline] Noms internes des champs disponibles :",
      Object.keys(items[0].fields),
    )
  }

  return items.map(mapProjet)
}

export async function createProjet(
  token: string,
  data:  Omit<ProjetPipeline, "id" | "created" | "modified">,
): Promise<ProjetPipeline> {
  const result = await createListItem<SPRawItem>(token, "Projets_Pipeline", {
    Title:                 data.titre,
    CodeProjet:            data.codeProjet,
    // ⚠️ Champ Description désactivé — nom interne SP non confirmé (ni "Description" ni "Description0")
    // À réactiver une fois le vrai nom interne identifié via logListFieldsFromSite()
    Region:                data.region,
    PhaseProjet:           data.phase,
    StatutProjet:          data.statut,
    Priorite:              data.priorite,
    ChefProjet:            data.chefProjet,
    BusinessModel:         data.businessModel,
    // Champs de classification (colonnes sur Projets_Pipeline)
    Division:              data.division              || null,
    BusinessUnit:          data.businessUnit          || null,
    SecteurActivite:       data.secteurActivite       || null,
    CasUtilisation:        data.casUtilisation        || null,
    // ⚠️ Ces colonnes existent sur Pipeline_Tasks, pas sur Projets_Pipeline
    // ResponsableCommercial, ResponsableFinance, ResponsableTechnique, AutresIntervenants
    // → À créer sur Projets_Pipeline pour les activer ici
    // Technique
    Puissance_kWp:         data.puissanceKwp        || null,
    BatterieIncluse:       data.batterieIncluse,
    CapaciteBatterie_kWh:  data.capaciteBatterieKwh || null,
    FinancementNecessaire: data.financementNecessaire,
    MontantFinancement:    data.montantFinancement   || null,
    SourceFinancement:     data.sourceFinancement,
    RevenusAnnuelsPrevus:  data.revenusAnnuelsPrevus || null,
    // Échéances
    DateDebutPrevu:        data.dateDebutPrevu        || null,
    DateFinPrevu:          data.dateFinPrevu          || null,
    DateProchaineEtape:    data.dateProchaineEtape    || null,
    ProchaineEtapeLabel:   data.prochaineEtapeLabel   || null,
    CommentaireEcheance:   data.commentaireEcheance   || null,
    DateSignatureContrat:  data.dateSignatureContrat  || null,
    Partenaire:            data.partenaire,
    Notes:                 data.notes,
    Progression:           data.progression          || 0,
  })
  return mapProjet(result)
}

export async function updateProjet(
  token:  string,
  id:     string,
  fields: Partial<Omit<ProjetPipeline, "id" | "created" | "modified">>,
): Promise<void> {
  const sp: Record<string, unknown> = {}
  if (fields.titre                !== undefined) sp["Title"]                = fields.titre
  if (fields.codeProjet           !== undefined) sp["CodeProjet"]           = fields.codeProjet
  // ⚠️ Champ Description désactivé — nom interne SP non confirmé
  // if (fields.description !== undefined) sp["Description0"] = fields.description
  if (fields.region               !== undefined) sp["Region"]               = fields.region
  if (fields.phase                !== undefined) sp["PhaseProjet"]          = fields.phase
  if (fields.statut               !== undefined) sp["StatutProjet"]         = fields.statut
  if (fields.priorite             !== undefined) sp["Priorite"]             = fields.priorite
  if (fields.chefProjet           !== undefined) sp["ChefProjet"]           = fields.chefProjet
  if (fields.businessModel        !== undefined) sp["BusinessModel"]        = fields.businessModel
  // Champs étendus
  if (fields.division             !== undefined) sp["Division"]             = fields.division || null
  if (fields.businessUnit         !== undefined) sp["BusinessUnit"]         = fields.businessUnit || null
  if (fields.secteurActivite      !== undefined) sp["SecteurActivite"]      = fields.secteurActivite || null
  if (fields.casUtilisation       !== undefined) sp["CasUtilisation"]       = fields.casUtilisation || null
  // ⚠️ ResponsableCommercial, ResponsableFinance, ResponsableTechnique, AutresIntervenants
  // sont sur Pipeline_Tasks, pas Projets_Pipeline → désactivés jusqu'à création sur la bonne liste
  // Technique
  if (fields.puissanceKwp         !== undefined) sp["Puissance_kWp"]        = fields.puissanceKwp || null
  if (fields.batterieIncluse      !== undefined) sp["BatterieIncluse"]      = fields.batterieIncluse
  if (fields.capaciteBatterieKwh  !== undefined) sp["CapaciteBatterie_kWh"] = fields.capaciteBatterieKwh || null
  if (fields.financementNecessaire !== undefined) sp["FinancementNecessaire"] = fields.financementNecessaire
  if (fields.montantFinancement   !== undefined) sp["MontantFinancement"]   = fields.montantFinancement || null
  if (fields.sourceFinancement    !== undefined) sp["SourceFinancement"]    = fields.sourceFinancement
  if (fields.revenusAnnuelsPrevus !== undefined) sp["RevenusAnnuelsPrevus"] = fields.revenusAnnuelsPrevus || null
  // Échéances
  if (fields.dateDebutPrevu       !== undefined) sp["DateDebutPrevu"]       = fields.dateDebutPrevu || null
  if (fields.dateFinPrevu         !== undefined) sp["DateFinPrevu"]         = fields.dateFinPrevu   || null
  if (fields.dateProchaineEtape   !== undefined) sp["DateProchaineEtape"]   = fields.dateProchaineEtape || null
  if (fields.prochaineEtapeLabel  !== undefined) sp["ProchaineEtapeLabel"]  = fields.prochaineEtapeLabel || null
  if (fields.commentaireEcheance  !== undefined) sp["CommentaireEcheance"]  = fields.commentaireEcheance || null
  if (fields.dateSignatureContrat !== undefined) sp["DateSignatureContrat"] = fields.dateSignatureContrat || null
  if (fields.partenaire           !== undefined) sp["Partenaire"]           = fields.partenaire
  if (fields.notes                !== undefined) sp["Notes"]                = fields.notes
  if (fields.progression          !== undefined) sp["Progression"]          = fields.progression

  await updateListItem(token, "Projets_Pipeline", id, sp)
}

// ═══════════════════════════════════════════════════════════════════════════════
// API publique — Tâches
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTasks(
  token:     string,
  projetId?: string,
): Promise<PipelineTask[]> {
  const filter = projetId
    ? `&$filter=fields/ProjetId eq '${encodeURIComponent(projetId)}'`
    : ""
  const items = await getListItems<SPRawItem>(
    token,
    "Pipeline_Tasks",
    `${filter}&$orderby=createdDateTime desc&$top=1000`,
  )
  return items.map(mapTask)
}

export async function createTask(
  token: string,
  data:  Omit<PipelineTask, "id" | "created" | "modified">,
): Promise<PipelineTask> {
  const result = await createListItem<SPRawItem>(token, "Pipeline_Tasks", {
    Title:       data.titre,
    ProjetId:    data.projetId,
    ProjetCode:  data.projetCode,
    Assignee:    data.assignee,
    Priorite:    data.priorite,
    StatutTache: data.statut,
    DateLimite:   data.dateLimite  || null,
    Description0: data.description,
  })
  return mapTask(result)
}

export async function updateTask(
  token:  string,
  id:     string,
  fields: Partial<Pick<PipelineTask, "statut" | "assignee" | "dateLimite" | "description" | "priorite">>,
): Promise<void> {
  const sp: Record<string, unknown> = {}
  if (fields.statut      !== undefined) sp["StatutTache"]  = fields.statut
  if (fields.assignee    !== undefined) sp["Assignee"]     = fields.assignee
  if (fields.dateLimite  !== undefined) sp["DateLimite"]   = fields.dateLimite || null
  if (fields.description !== undefined) sp["Description0"] = fields.description
  if (fields.priorite    !== undefined) sp["Priorite"]    = fields.priorite
  await updateListItem(token, "Pipeline_Tasks", id, sp)
}

// ═══════════════════════════════════════════════════════════════════════════════
// API publique — Jalons
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMilestones(
  token:     string,
  projetId?: string,
): Promise<PipelineMilestone[]> {
  const filter = projetId
    ? `&$filter=fields/ProjetId eq '${encodeURIComponent(projetId)}'`
    : ""
  const items = await getListItems<SPRawItem>(
    token,
    "Pipeline_Milestones",
    `${filter}&$top=500`,
  )
  return items.map(mapMilestone).sort((a, b) => a.datePrevue.localeCompare(b.datePrevue))
}

// ═══════════════════════════════════════════════════════════════════════════════
// API publique — Historique
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPipelineUpdates(
  token:     string,
  projetId?: string,
): Promise<PipelineUpdate[]> {
  const filter = projetId
    ? `&$filter=fields/ProjetId eq '${encodeURIComponent(projetId)}'`
    : ""
  const items = await getListItems<SPRawItem>(
    token,
    "Pipeline_Updates",
    `${filter}&$orderby=createdDateTime desc&$top=500`,
  )
  return items.map(mapUpdate)
}

export async function createPipelineUpdate(
  token:          string,
  projetId:       string,
  description:    string,
  auteur:         string,
  champModifie?:  string,
  ancienneValeur?: string,
  nouvelleValeur?: string,
): Promise<void> {
  await createListItem(token, "Pipeline_Updates", {
    Title:          description,
    ProjetId:       projetId,
    Auteur:         auteur,
    ChampModifie:   champModifie   ?? "",
    AncienneValeur: ancienneValeur ?? "",
    NouvelleValeur: nouvelleValeur ?? "",
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// API publique — Contacts
// ═══════════════════════════════════════════════════════════════════════════════

export async function getContacts(
  token:     string,
  projetId?: string,
): Promise<PipelineContact[]> {
  const filter = projetId
    ? `&$filter=fields/ProjetId eq '${encodeURIComponent(projetId)}'`
    : ""
  const items = await getListItems<SPRawItem>(
    token,
    "Pipeline_Contacts",
    `${filter}&$top=200`,
  )
  return items.map(mapContact)
}
