/* ═══════════════════════════════════════════════════════════════════════════
   Types — Module Pipeline Projets Sénégal
   Listes SharePoint : Projets_Pipeline, Pipeline_Tasks,
                       Pipeline_Milestones, Pipeline_Updates, Pipeline_Contacts
   Drive SharePoint  : Pipeline_Documents/{projetCode}/
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Valeurs attendues dans SharePoint (colonnes de type "Choice") ─────────────
// Si vos valeurs SharePoint diffèrent (accents, casse…), ajustez ici uniquement.

export const PHASES_PIPELINE = [
  "Prospect",
  "Étude de faisabilité",
  "Offre soumise",
  "Négociation",
  "Contrat signé",
  "En développement",
  "Construction",
  "En exploitation",
  "Abandonné",
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
  "ERD",
  "Client direct",
  "Institutionnel",
  "PPP",
  "Autre",
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

export type PhaseProjet     = (typeof PHASES_PIPELINE)[number]
export type StatutProjet    = (typeof STATUTS_PROJET)[number]
export type Priorite        = (typeof PRIORITES)[number]
export type StatutTache     = (typeof STATUTS_TACHE)[number]
export type StatutMilestone = (typeof STATUTS_MILESTONE)[number]
export type BusinessModel   = (typeof BUSINESS_MODELS)[number]

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
  puissanceKwp:          number
  batterieIncluse:       boolean
  capaciteBatterieKwh:   number
  financementNecessaire: boolean
  montantFinancement:    number
  sourceFinancement:     string
  revenusAnnuelsPrevus:  number
  dateDebutPrevu:        string
  dateFinPrevu:          string
  dateProchaineEtape:    string
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
  "Prospect":             { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  "Étude de faisabilité": { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "Offre soumise":        { bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", border: "rgba(139,92,246,0.3)"  },
  "Négociation":          { bg: "rgba(245,158,11,0.12)",  text: "#fbbf24", border: "rgba(245,158,11,0.3)"  },
  "Contrat signé":        { bg: "rgba(240,165,0,0.15)",   text: "#f0a500", border: "rgba(240,165,0,0.35)"  },
  "En développement":     { bg: "rgba(45,158,95,0.12)",   text: "#2d9e5f", border: "rgba(45,158,95,0.3)"   },
  "Construction":         { bg: "rgba(16,185,129,0.12)",  text: "#34d399", border: "rgba(16,185,129,0.3)"  },
  "En exploitation":      { bg: "rgba(34,197,94,0.15)",   text: "#22c55e", border: "rgba(34,197,94,0.35)"  },
  "Abandonné":            { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)"   },
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

// PHASES_PIPELINE sans "Abandonné" pour le calcul de progression
const ACTIVE_PHASES: PhaseProjet[] = PHASES_PIPELINE.filter(
  (p) => p !== "Abandonné",
) as PhaseProjet[]

export function getPhaseProgress(phase: PhaseProjet): number {
  if (phase === "Abandonné") return 0
  const idx = ACTIVE_PHASES.indexOf(phase)
  if (idx < 0) return 0
  return Math.round(((idx + 1) / ACTIVE_PHASES.length) * 100)
}

export function isPhaseActive(phase: PhaseProjet): boolean {
  return phase !== "Abandonné" && phase !== "En exploitation"
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
