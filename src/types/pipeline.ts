/* ═══════════════════════════════════════════════════════════════════════════
   Types — Module Pipeline Projets Sénégal
   Listes SharePoint : Projets_Pipeline, Pipeline_Tasks,
                       Pipeline_Milestones, Pipeline_Updates, Pipeline_Contacts
   Drive SharePoint  : Pipeline_Documents/{projetCode}/
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Valeurs attendues dans SharePoint (colonnes de type "Choice") ─────────────
// Si vos valeurs SharePoint diffèrent (accents, casse…), ajustez ici uniquement.

export const PHASES_PIPELINE = [
  "01 - Préparation de la proposition",
  "02 - Proposition commerciale soumise",
  "03 - Proposition de financement soumise",
  "04 - Contrat signé",
  "05 - Développement du projet & EPC",
  "06 - En exploitation",
  "07 - Projet terminé",
  "08 - En attente",
  "09 - Annulé par AGT",
  "10 - Annulé par le client",
] as const

export const STATUTS_PROJET = [
  "Actif",
  "En attente",
  "Critique",
  "Terminé",
  "Suspendu",
] as const

export const PRIORITES = ["Critique", "Haute", "Moyenne", "Faible"] as const

export const STATUTS_TACHE = [
  "À faire",
  "En cours",
  "Bloqué",
  "Terminé",
] as const

export const STATUTS_MILESTONE = [
  "En attente",
  "En cours",
  "Atteint",
  "En retard",
] as const

export const BUSINESS_MODELS = [
  "Service à la demande (As a Service)",
  "EPC (Ingénierie, Approvisionnement & Construction)",
  "Consulting / Conseil",
  "O&M (Exploitation & Maintenance)",
] as const

export const BUSINESS_UNITS = [
  "C&I (Commercial & Industriel)",
  "Résidentiel",
  "Services Réseau (Grid Services)",
] as const

export const DIVISIONS = [
  "Énergie",
  "Solaire Thermique & Refroidissement",
  "Irrigation & Purification de l'eau",
] as const

export const SECTEURS_ACTIVITE = [
  "Santé",
  "Commerce / Retail",
  "Automobile",
  "Services financiers",
  "Énergie",
  "Industrie manufacturière",
  "Digital",
  "Technologies vertes",
  "Aide humanitaire",
  "Immobilier",
  "Agriculture",
  "Éducation",
  "Électronique grand public",
  "Divertissement & Médias",
  "Hôtellerie",
  "Transport",
  "Télécommunications",
] as const

export const CAS_UTILISATION = [
  "Indépendance énergétique",
  "Impact environnemental",
  "Réduction des coûts",
  "Accès à l'électricité",
] as const

export const REGIONS_SENEGAL = [
  "Dakar",
  "Thiès",
  "Diourbel",
  "Fatick",
  "Kaolack",
  "Kaffrine",
  "Tambacounda",
  "Kédougou",
  "Kolda",
  "Ziguinchor",
  "Sédhiou",
  "Saint-Louis",
  "Louga",
  "Matam",
  "Multiple régions",
] as const

// ── Types dérivés des constantes ──────────────────────────────────────────────

export type PhaseProjet      = (typeof PHASES_PIPELINE)[number]
export type StatutProjet     = (typeof STATUTS_PROJET)[number]
export type Priorite         = (typeof PRIORITES)[number]
export type StatutTache      = (typeof STATUTS_TACHE)[number]
export type StatutMilestone  = (typeof STATUTS_MILESTONE)[number]
export type BusinessModel    = (typeof BUSINESS_MODELS)[number]
export type BusinessUnit     = (typeof BUSINESS_UNITS)[number]
export type Division         = (typeof DIVISIONS)[number]
export type SecteurActivite  = (typeof SECTEURS_ACTIVITE)[number]
export type CasUtilisation   = (typeof CAS_UTILISATION)[number]

// ── Entités métier ─────────────────────────────────────────────────────────────

export interface ProjetPipeline {
  id:                    string
  codeProjet:            string
  titre:                 string
  description:           string
  region:                string
  phase:                 PhaseProjet
  statut:                StatutProjet
  priorite:              Priorite
  chefProjet:            string
  businessModel:         BusinessModel
  // Champs de classification étendus (colonnes à créer dans SharePoint si absentes)
  division?:             string
  businessUnit?:         string
  secteurActivite?:      string
  casUtilisation?:       string
  // Équipe projet
  responsableCommercial?: string
  responsableFinance?:    string
  responsableTechnique?:  string
  autresIntervenants?:    string
  // Technique
  puissanceKwp:          number
  batterieIncluse:       boolean
  capaciteBatterieKwh:   number
  financementNecessaire: boolean
  montantFinancement:    number
  sourceFinancement:     string
  revenusAnnuelsPrevus:  number
  // Échéances
  dateDebutPrevu:        string
  dateFinPrevu:          string
  dateProchaineEtape:    string
  prochaineEtapeLabel?:  string
  commentaireEcheance?:  string
  dateSignatureContrat:  string
  partenaire:            string
  notes:                 string
  progression:           number
  created:               string
  modified:              string
}

export interface PipelineTask {
  id:          string
  titre:       string
  projetId:    string
  projetCode:  string
  assignee:    string
  priorite:    Priorite
  statut:      StatutTache
  dateLimite:  string
  description: string
  created:     string
  modified:    string
}

export interface PipelineMilestone {
  id:          string
  titre:       string
  projetId:    string
  projetCode:  string
  datePrevue:  string
  dateReelle:  string
  statut:      StatutMilestone
  description: string
  created:     string
}

export interface PipelineUpdate {
  id:             string
  projetId:       string
  champModifie:   string
  ancienneValeur: string
  nouvelleValeur: string
  auteur:         string
  description:    string
  created:        string
}

export interface PipelineContact {
  id:           string
  nomComplet:   string
  projetId:     string
  role:         string
  email:        string
  telephone:    string
  organisation: string
  created:      string
}

// ── Couleurs du design system GIW'ANVO par phase ──────────────────────────────

export const PHASE_COLORS: Record<PhaseProjet, { bg: string; text: string; border: string }> = {
  "01 - Préparation de la proposition":      { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  "02 - Proposition commerciale soumise":    { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "03 - Proposition de financement soumise": { bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", border: "rgba(139,92,246,0.3)"  },
  "04 - Contrat signé":                      { bg: "rgba(240,165,0,0.15)",   text: "#f0a500", border: "rgba(240,165,0,0.35)"  },
  "05 - Développement du projet & EPC":      { bg: "rgba(45,158,95,0.12)",   text: "#2d9e5f", border: "rgba(45,158,95,0.3)"   },
  "06 - En exploitation":                    { bg: "rgba(34,197,94,0.15)",   text: "#22c55e", border: "rgba(34,197,94,0.35)"  },
  "07 - Projet terminé":                     { bg: "rgba(16,185,129,0.15)",  text: "#34d399", border: "rgba(16,185,129,0.35)" },
  "08 - En attente":                         { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  "09 - Annulé par AGT":                     { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)"   },
  "10 - Annulé par le client":               { bg: "rgba(239,68,68,0.08)",   text: "#fca5a5", border: "rgba(239,68,68,0.2)"   },
}

export const PRIORITE_COLORS: Record<Priorite, { bg: string; text: string; border: string }> = {
  "Critique": { bg: "rgba(239,68,68,0.15)",   text: "#f87171", border: "rgba(239,68,68,0.35)"  },
  "Haute":    { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24", border: "rgba(245,158,11,0.35)" },
  "Moyenne":  { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "Faible":   { bg: "rgba(107,114,128,0.12)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
}

export const STATUT_PROJET_COLORS: Record<StatutProjet, { bg: string; text: string; border: string }> = {
  "Actif":      { bg: "rgba(45,158,95,0.12)",   text: "#2d9e5f", border: "rgba(45,158,95,0.3)"   },
  "En attente": { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  "Critique":   { bg: "rgba(239,68,68,0.15)",   text: "#ef4444", border: "rgba(239,68,68,0.35)"  },
  "Terminé":    { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "Suspendu":   { bg: "rgba(107,114,128,0.12)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
}

export const STATUT_TACHE_COLORS: Record<StatutTache, { bg: string; text: string; border: string }> = {
  "À faire":  { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  "En cours": { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "Bloqué":   { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)"   },
  "Terminé":  { bg: "rgba(34,197,94,0.12)",   text: "#22c55e", border: "rgba(34,197,94,0.3)"   },
}

// ── Utilitaires de progression pipeline ──────────────────────────────────────

// Phases hors service (annulé / en attente) — exclues du calcul de progression
export const PHASES_CANCELLED: PhaseProjet[] = [
  "09 - Annulé par AGT",
  "10 - Annulé par le client",
]

// Phases qui représentent un avancement linéaire du projet (01 → 07)
const PROGRESSION_PHASES: PhaseProjet[] = [
  "01 - Préparation de la proposition",
  "02 - Proposition commerciale soumise",
  "03 - Proposition de financement soumise",
  "04 - Contrat signé",
  "05 - Développement du projet & EPC",
  "06 - En exploitation",
  "07 - Projet terminé",
]

export function getPhaseProgress(phase: PhaseProjet): number {
  if (PHASES_CANCELLED.includes(phase)) return 0
  if (phase === "08 - En attente") return 0
  const idx = PROGRESSION_PHASES.indexOf(phase)
  if (idx < 0) return 0
  return Math.round(((idx + 1) / PROGRESSION_PHASES.length) * 100)
}

export function isPhaseActive(phase: PhaseProjet): boolean {
  return !PHASES_CANCELLED.includes(phase) && phase !== "07 - Projet terminé"
}

// ── Formatage devise FCFA ─────────────────────────────────────────────────────

export function formatFCFA(montant: number): string {
  if (!montant) return "—"
  return (
    montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " FCFA"
  )
}

export function formatKwp(kWp: number): string {
  if (!kWp) return "—"
  return kWp.toLocaleString("fr-FR") + " kWp"
}

// ── Types de documents ────────────────────────────────────────────────────────

export const TYPES_DOCUMENT = [
  "Contrat",
  "Rapport",
  "Plan",
  "Facture",
  "Présentation",
  "Photo",
  "Autre",
] as const

export type TypeDocument = (typeof TYPES_DOCUMENT)[number]

// ── Entité document (Drive SharePoint) ───────────────────────────────────────

export interface PipelineDocument {
  id:          string
  projetCode:  string
  name:        string
  size:        number
  mimeType:    string
  downloadUrl: string
  webUrl:      string
  auteur:      string
  created:     string
  modified:    string
}
