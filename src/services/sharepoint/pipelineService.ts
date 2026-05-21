/**
 * Service — Pipeline Projets Sénégal
 * Listes SharePoint (site principal GiwanvoPowerApps) :
 *   Projets_Pipeline | Pipeline_Tasks | Pipeline_Milestones
 *   Pipeline_Updates | Pipeline_Contacts
 *
 * Noms internes SharePoint confirmés via diagnostic console (F12).
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
  return s.length >= 10 ? s.slice(0, 10) : ""
}

// ─── Mapping Projets_Pipeline ─────────────────────────────────────────────────
// Noms internes confirmés :
//   Region          → R_x00e9_gion
//   Description     → DescriptionProjet
//   ResponsableComm → CommercialLead
//   ResponsableFin  → FinanceLead
//   ResponsableTech → TechniqueLead
//   Notes           → CommentaireManagement
//   ProchaineEtap.  → ProchaineAction
// Colonnes inexistantes sur SP (valeurs par défaut) :
//   CasUtilisation, AutresIntervenants, Progression,
//   DateDebutPrevu, DateFinPrevu, Partenaire,
//   CommentaireEcheance, RevenusAnnuelsPrevus

function mapProjet(item: SPRawItem): ProjetPipeline {
  const f = item.fields
  return {
    id:                    item.id,
    codeProjet:            str(f["CodeProjet"]),
    titre:                 str(f["Title"]),
    description:           str(f["DescriptionProjet"]),
    region:                str(f["R_x00e9_gion"]),
    phase:                 str(f["PhaseProjet"], "01 - Préparation de la proposition") as PhaseProjet,
    statut:                str(f["StatutProjet"], "Actif")        as StatutProjet,
    priorite:              str(f["Priorite"], "Moyenne")          as Priorite,
    chefProjet:            str(f["ChefProjet"]),
    businessModel:         str(f["BusinessModel"], "Consulting / Conseil") as BusinessModel,
    division:              str(f["Division"])       || undefined,
    businessUnit:          str(f["BusinessUnit"])   || undefined,
    secteurActivite:       str(f["SecteurActivite"]) || undefined,
    casUtilisation:        undefined,
    responsableCommercial: str(f["CommercialLead"]) || undefined,
    responsableFinance:    str(f["FinanceLead"])     || undefined,
    responsableTechnique:  str(f["TechniqueLead"])   || undefined,
    autresIntervenants:    undefined,
    puissanceKwp:          num(f["Puissance_kWp"]),
    batterieIncluse:       bool(f["BatterieIncluse"]),
    capaciteBatterieKwh:   num(f["CapaciteBatterie_kWh"]),
    financementNecessaire: bool(f["FinancementNecessaire"]),
    montantFinancement:    num(f["MontantFinancement"]),
    sourceFinancement:     str(f["SourceFinancement"]),
    revenusAnnuelsPrevus:  0,
    dateDebutPrevu:        "",
    dateFinPrevu:          "",
    dateProchaineEtape:    toDate(f["DateProchaineEtape"]),
    prochaineEtapeLabel:   str(f["ProchaineAction"]) || undefined,
    commentaireEcheance:   undefined,
    dateSignatureContrat:  toDate(f["DateSignatureContrat"]),
    partenaire:            "",
    notes:                 str(f["CommentaireManagement"]),
    progression:           0,
    created:               toDate(f["Created"]),
    modified:              toDate(f["Modified"]),
  }
}

// ─── Mapping Pipeline_Tasks ───────────────────────────────────────────────────
// Noms internes confirmés :
//   ProjetId   → ProjetLie
//   Assignee   → Responsable
//   Description → Description (fonctionne sur Tasks, pas sur Projets_Pipeline)
// ProjetCode n'existe pas sur SP — retourne toujours ""

function mapTask(item: SPRawItem): PipelineTask {
  const f = item.fields
  return {
    id:                    item.id,
    titre:                 str(f["Title"]),
    projetId:              str(f["ProjetLie"]),
    projetCode:            "",
    assignee:              str(f["Responsable"]),
    priorite:              str(f["Priorite"], "Moyenne")    as Priorite,
    statut:                str(f["StatutTache"], "À faire") as StatutTache,
    dateLimite:            toDate(f["DateLimite"]),
    description:           str(f["Description"]),
    commentaire:           str(f["Commentaire"])            || undefined,
    responsableCommercial: str(f["ResponsableCommercial"])  || undefined,
    responsableFinance:    str(f["ResponsableFinance"])      || undefined,
    responsableTechnique:  str(f["ResponsableTechnique"])   || undefined,
    autresIntervenants:    str(f["AutresIntervenants"])      || undefined,
    created:               toDate(f["Created"]),
    modified:              toDate(f["Modified"]),
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

// ─── Helper : supprime les clés null / undefined / "" du payload SP ──────────
// Évite les 500 "generalException" quand SP reçoit null sur un champ non-nullable.
// Les booléens false et les nombres 0 sont conservés intentionnellement.

function buildPayload(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  )
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
  return items.map(mapProjet)
}

export async function createProjet(
  token: string,
  data:  Omit<ProjetPipeline, "id" | "created" | "modified">,
): Promise<ProjetPipeline> {
  const payload = buildPayload({
    Title:                 data.titre,
    CodeProjet:            data.codeProjet             || null,
    // R_x00e9_gion (Région) : SP accepte ce nom en lecture mais le rejette en écriture POST
    // → à écrire via un PATCH séparé après création si nécessaire
    DescriptionProjet:     data.description            || null,
    PhaseProjet:           data.phase,
    StatutProjet:          data.statut,
    Priorite:              data.priorite,
    ChefProjet:            data.chefProjet             || null,
    BusinessModel:         data.businessModel,
    Division:              data.division               || null,
    BusinessUnit:          data.businessUnit           || null,
    SecteurActivite:       data.secteurActivite        || null,
    CommercialLead:        data.responsableCommercial  || null,
    FinanceLead:           data.responsableFinance     || null,
    TechniqueLead:         data.responsableTechnique   || null,
    Puissance_kWp:         data.puissanceKwp           || null,
    BatterieIncluse:       data.batterieIncluse        || null,
    CapaciteBatterie_kWh:  data.capaciteBatterieKwh    || null,
    FinancementNecessaire: data.financementNecessaire  || null,
    MontantFinancement:    data.montantFinancement     || null,
    SourceFinancement:     data.sourceFinancement      || null,
    DateProchaineEtape:    data.dateProchaineEtape     || null,
    ProchaineAction:       data.prochaineEtapeLabel    || null,
    DateSignatureContrat:  data.dateSignatureContrat   || null,
    CommentaireManagement: data.notes                  || null,
  })
  console.group("📤 createProjet — payload envoyé à SharePoint")
  console.table(Object.entries(payload).map(([k, v]) => ({ Champ: k, Valeur: String(v) })))
  console.groupEnd()
  const result = await createListItem<SPRawItem>(token, "Projets_Pipeline", payload)
  return mapProjet(result)
}

export async function updateProjet(
  token:  string,
  id:     string,
  fields: Partial<Omit<ProjetPipeline, "id" | "created" | "modified">>,
): Promise<void> {
  const sp: Record<string, unknown> = {}
  if (fields.titre                !== undefined) sp["Title"]                 = fields.titre
  if (fields.codeProjet           !== undefined) sp["CodeProjet"]            = fields.codeProjet
  // R_x00e9_gion ignoré en écriture (voir commentaire createProjet)
  if (fields.description          !== undefined) sp["DescriptionProjet"]      = fields.description || null
  if (fields.phase                !== undefined) sp["PhaseProjet"]            = fields.phase
  if (fields.statut               !== undefined) sp["StatutProjet"]           = fields.statut
  if (fields.priorite             !== undefined) sp["Priorite"]               = fields.priorite
  if (fields.chefProjet           !== undefined) sp["ChefProjet"]             = fields.chefProjet
  if (fields.businessModel        !== undefined) sp["BusinessModel"]          = fields.businessModel
  if (fields.division             !== undefined) sp["Division"]               = fields.division || null
  if (fields.businessUnit         !== undefined) sp["BusinessUnit"]           = fields.businessUnit || null
  if (fields.secteurActivite      !== undefined) sp["SecteurActivite"]        = fields.secteurActivite || null
  if (fields.responsableCommercial !== undefined) sp["CommercialLead"]        = fields.responsableCommercial || null
  if (fields.responsableFinance   !== undefined) sp["FinanceLead"]            = fields.responsableFinance || null
  if (fields.responsableTechnique !== undefined) sp["TechniqueLead"]          = fields.responsableTechnique || null
  if (fields.puissanceKwp         !== undefined) sp["Puissance_kWp"]          = fields.puissanceKwp || null
  if (fields.batterieIncluse      !== undefined) sp["BatterieIncluse"]        = fields.batterieIncluse
  if (fields.capaciteBatterieKwh  !== undefined) sp["CapaciteBatterie_kWh"]   = fields.capaciteBatterieKwh || null
  if (fields.financementNecessaire !== undefined) sp["FinancementNecessaire"] = fields.financementNecessaire
  if (fields.montantFinancement   !== undefined) sp["MontantFinancement"]     = fields.montantFinancement || null
  if (fields.sourceFinancement    !== undefined) sp["SourceFinancement"]      = fields.sourceFinancement
  if (fields.dateProchaineEtape   !== undefined) sp["DateProchaineEtape"]     = fields.dateProchaineEtape || null
  if (fields.prochaineEtapeLabel  !== undefined) sp["ProchaineAction"]        = fields.prochaineEtapeLabel || null
  if (fields.dateSignatureContrat !== undefined) sp["DateSignatureContrat"]   = fields.dateSignatureContrat || null
  if (fields.notes                !== undefined) sp["CommentaireManagement"]  = fields.notes || null

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
    ? `&$filter=fields/ProjetLie eq '${encodeURIComponent(projetId)}'`
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
    ProjetLie:   data.projetId,
    Responsable: data.assignee,
    Priorite:    data.priorite,
    StatutTache: data.statut,
    DateLimite:  data.dateLimite  || null,
    Description: data.description || null,
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
  if (fields.assignee    !== undefined) sp["Responsable"]  = fields.assignee
  if (fields.dateLimite  !== undefined) sp["DateLimite"]   = fields.dateLimite || null
  if (fields.description !== undefined) sp["Description"]  = fields.description
  if (fields.priorite    !== undefined) sp["Priorite"]     = fields.priorite
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
  token:           string,
  projetId:        string,
  description:     string,
  auteur:          string,
  champModifie?:   string,
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
