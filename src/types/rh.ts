/* ════════════════════════════════════════════════
   Types — Module Ressources Humaines
   ════════════════════════════════════════════════ */

/* ── Ordres de mission ── */

export type StatutMission =
  | "BROUILLON"
  | "SOUMIS"
  | "APPROUVE"
  | "EN_COURS"
  | "TERMINE"
  | "REJETE"

export type TypeMission =
  | "TECHNIQUE"
  | "COMMERCIALE"
  | "INSTITUTIONNELLE"
  | "LOGISTIQUE"
  | "MAINTENANCE"
  | "AUTRE"

export type MoyenTransportMission =
  | "VEHICULE_SERVICE"
  | "VEHICULE_PERSO"
  | "TRANSPORT_PUBLIC"
  | "AVION"
  | "AUTRE"

export interface Mission {
  id:               string
  intitule:         string
  typeMission:      TypeMission
  objectif:         string
  lieux:            string
  dateDepart:       string   // ISO date
  dateRetour:       string   // ISO date
  duree:            number   // en jours
  moyenTransport:   MoyenTransportMission
  demandeur:        string   // email
  dateDemande:      string   // ISO date
  statut:           StatutMission
  region?:          string
  collective:       boolean
  participants?:    string[]   // format "Nom, Poste" par entrée
  besoinAvance:              boolean
  montantAvance?:            number
  matricule?:                string
  chargesIncluses?:          string[]
  typeMissionPersonnalisee?: string
  commentaireDir?:           string
  dateApprobation?:          string
}

/* ── Demandes de congé ── */

export type StatutConge =
  | "BROUILLON"
  | "SOUMIS"
  | "APPROUVE"
  | "REJETE"
  | "EN_COURS"
  | "TERMINE"

export type TypeConge =
  | "ANNUEL"
  | "MALADIE"
  | "MATERNITE"
  | "PATERNITE"
  | "SANS_SOLDE"
  | "EXCEPTIONNEL"

export interface DemandeConge {
  id:              string
  typeConge:       TypeConge
  dateDebut:       string   // ISO date
  dateFin:         string   // ISO date
  duree:           number   // en jours ouvrés
  motif:           string
  demandeur:       string   // email
  dateDemande:     string   // ISO date
  statut:          StatutConge
  commentaire?:    string
  valideur?:       string
  dateValidation?: string
}

/* ── Absences ── */

export type StatutAbsence =
  | "JUSTIFIEE"
  | "NON_JUSTIFIEE"
  | "EN_ATTENTE"

export type TypeAbsence =
  | "MALADIE"
  | "PERSONNELLE"
  | "FORMATION"
  | "AUTRE"

export interface Absence {
  id:               string
  typeAbsence:      TypeAbsence
  dateAbsence:      string   // ISO date
  duree:            number   // en jours
  motif:            string
  employe:          string   // email
  dateSignalement:  string   // ISO date
  statut:           StatutAbsence
  justificatif?:    string
  commentaire?:     string
}

/* ════════════════════════════════════════════════
   Constantes UI — labels, couleurs
   ════════════════════════════════════════════════ */

export const STATUT_MISSION_CONFIG: Record<
  StatutMission,
  { label: string; color: string; bg: string; border: string }
> = {
  BROUILLON: {
    label:  "Brouillon",
    color:  "var(--text-secondary)",
    bg:     "rgba(61,102,80,0.20)",
    border: "var(--bg-border)",
  },
  SOUMIS: {
    label:  "Soumis",
    color:  "#60a5fa",
    bg:     "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.30)",
  },
  APPROUVE: {
    label:  "Approuvé",
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  EN_COURS: {
    label:  "En cours",
    color:  "#f0a500",
    bg:     "rgba(240,165,0,0.12)",
    border: "rgba(240,165,0,0.35)",
  },
  TERMINE: {
    label:  "Terminée",
    color:  "#34d399",
    bg:     "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.30)",
  },
  REJETE: {
    label:  "Rejeté",
    color:  "#ef4444",
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
  },
}

export const STATUT_CONGE_CONFIG: Record<
  StatutConge,
  { label: string; color: string; bg: string; border: string }
> = {
  BROUILLON: {
    label:  "Brouillon",
    color:  "var(--text-secondary)",
    bg:     "rgba(61,102,80,0.20)",
    border: "var(--bg-border)",
  },
  SOUMIS: {
    label:  "En attente",
    color:  "#60a5fa",
    bg:     "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.30)",
  },
  APPROUVE: {
    label:  "Approuvé",
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  REJETE: {
    label:  "Refusé",
    color:  "#ef4444",
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
  },
  EN_COURS: {
    label:  "En cours",
    color:  "#f0a500",
    bg:     "rgba(240,165,0,0.12)",
    border: "rgba(240,165,0,0.35)",
  },
  TERMINE: {
    label:  "Terminé",
    color:  "#34d399",
    bg:     "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.30)",
  },
}

export const STATUT_ABSENCE_CONFIG: Record<
  StatutAbsence,
  { label: string; color: string; bg: string; border: string }
> = {
  JUSTIFIEE: {
    label:  "Justifiée",
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  NON_JUSTIFIEE: {
    label:  "Non justifiée",
    color:  "#ef4444",
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
  },
  EN_ATTENTE: {
    label:  "En attente",
    color:  "#f59e0b",
    bg:     "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
  },
}

export const LABEL_TYPE_MISSION: Record<TypeMission, string> = {
  TECHNIQUE:        "Technique",
  COMMERCIALE:      "Commerciale",
  INSTITUTIONNELLE: "Institutionnelle",
  LOGISTIQUE:       "Logistique",
  MAINTENANCE:      "Maintenance",
  AUTRE:            "Autre",
}

export const LABEL_MOYEN_TRANSPORT_MISSION: Record<MoyenTransportMission, string> = {
  VEHICULE_SERVICE: "Véhicule de service",
  VEHICULE_PERSO:   "Véhicule personnel",
  TRANSPORT_PUBLIC: "Transport public",
  AVION:            "Avion",
  AUTRE:            "Autre",
}

export const LABEL_TYPE_CONGE: Record<TypeConge, string> = {
  ANNUEL:       "Congé annuel",
  MALADIE:      "Congé maladie",
  MATERNITE:    "Congé maternité",
  PATERNITE:    "Congé paternité",
  SANS_SOLDE:   "Congé sans solde",
  EXCEPTIONNEL: "Congé exceptionnel",
}

export const LABEL_TYPE_ABSENCE: Record<TypeAbsence, string> = {
  MALADIE:     "Maladie",
  PERSONNELLE: "Raison personnelle",
  FORMATION:   "Formation",
  AUTRE:       "Autre",
}

/* ════════════════════════════════════════════════
   Recrutement
   ════════════════════════════════════════════════ */

export type StatutRecrutement =
  | "BROUILLON"
  | "SOUMIS"
  | "VALIDE"
  | "EN_RECRUTEMENT"
  | "ENTRETIENS"
  | "DECISION"
  | "CLOTURE"

export type TypeContrat =
  | "CDI"
  | "CDD"
  | "STAGE"
  | "FREELANCE"
  | "AUTRE"

export type PrioriteRecrutement = "HAUTE" | "NORMALE" | "BASSE"

export interface Recrutement {
  id:                string
  intitulePoste:     string
  departement:       string
  typeContrat:       TypeContrat
  nbPostes:          number
  lieu:              string
  dateSouhaitee:     string
  managerDemandeur:  string
  priorite:          PrioriteRecrutement
  description:       string
  statut:            StatutRecrutement
  dateDemande:       string
  commentaire?:      string
}

export const STATUT_RECRUTEMENT_CONFIG: Record<
  StatutRecrutement,
  { label: string; color: string; bg: string; border: string }
> = {
  BROUILLON:      { label: "Brouillon",         color: "var(--text-secondary)", bg: "rgba(61,102,80,0.20)",  border: "var(--bg-border)" },
  SOUMIS:         { label: "Soumis",             color: "#60a5fa",               bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.30)" },
  VALIDE:         { label: "Validé",             color: "#22c55e",               bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)" },
  EN_RECRUTEMENT: { label: "En recrutement",     color: "#f0a500",               bg: "rgba(240,165,0,0.12)",  border: "rgba(240,165,0,0.35)" },
  ENTRETIENS:     { label: "Entretiens en cours",color: "#a78bfa",               bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)" },
  DECISION:       { label: "Pour décision",      color: "#f59e0b",               bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  CLOTURE:        { label: "Clôturé",            color: "#34d399",               bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.30)" },
}

export const LABEL_TYPE_CONTRAT: Record<TypeContrat, string> = {
  CDI:       "CDI",
  CDD:       "CDD",
  STAGE:     "Stage",
  FREELANCE: "Freelance / Consultant",
  AUTRE:     "Autre",
}

export const LABEL_PRIORITE_RECRUTEMENT: Record<PrioriteRecrutement, string> = {
  HAUTE:   "Haute priorité",
  NORMALE: "Normale",
  BASSE:   "Basse priorité",
}

/* ════════════════════════════════════════════════
   Sanctions disciplinaires
   ════════════════════════════════════════════════ */

export type StatutSanction =
  | "SIGNALE"
  | "EN_ANALYSE"
  | "EN_INSTRUCTION"
  | "DECISION_PRISE"
  | "NOTIFIE"
  | "CLOTURE"

export type GraviteSanction = "MINEURE" | "MODEREE" | "GRAVE" | "TRES_GRAVE"

export interface DossierSanction {
  id:            string
  employe:       string
  dateIncident:  string
  natureFaits:   string
  description:   string
  gravite:       GraviteSanction
  decision?:     string
  sanction?:     string
  decideur?:     string
  statut:        StatutSanction
  dateOuverture: string
  piecesJointes?: string[]
}

export const STATUT_SANCTION_CONFIG: Record<
  StatutSanction,
  { label: string; color: string; bg: string; border: string }
> = {
  SIGNALE:       { label: "Signalé",         color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  EN_ANALYSE:    { label: "En analyse",      color: "#60a5fa", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.30)" },
  EN_INSTRUCTION:{ label: "En instruction",  color: "#a78bfa", bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)" },
  DECISION_PRISE:{ label: "Décision prise",  color: "#f0a500", bg: "rgba(240,165,0,0.12)",  border: "rgba(240,165,0,0.35)" },
  NOTIFIE:       { label: "Notifié",         color: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.30)" },
  CLOTURE:       { label: "Clôturé",         color: "var(--text-secondary)", bg: "rgba(61,102,80,0.20)", border: "var(--bg-border)" },
}

export const LABEL_GRAVITE_SANCTION: Record<GraviteSanction, string> = {
  MINEURE:    "Mineure",
  MODEREE:    "Modérée",
  GRAVE:      "Grave",
  TRES_GRAVE: "Très grave",
}

/* ════════════════════════════════════════════════
   Évaluations des performances
   ════════════════════════════════════════════════ */

export type StatutEvaluation =
  | "PLANIFIEE"
  | "AUTOEVAL"
  | "EVAL_MANAGER"
  | "EN_REVUE_RH"
  | "VALIDEE"
  | "CLOTUREE"

export type PeriodeEvaluation = "S1" | "S2" | "ANNUELLE"

export type NoteEvaluation = "INSUFFISANT" | "EN_PROGRESSION" | "SATISFAISANT" | "TRES_BON" | "EXCELLENT"

export interface Evaluation {
  id:                string
  employe:           string
  evaluateur:        string
  periode:           PeriodeEvaluation
  annee:             number
  objectifs:         string
  resultats?:        string
  note?:             NoteEvaluation
  commentaires?:     string
  planAmelioration?: string
  statut:            StatutEvaluation
  datePlanification: string
  dateValidation?:   string
}

export const STATUT_EVALUATION_CONFIG: Record<
  StatutEvaluation,
  { label: string; color: string; bg: string; border: string }
> = {
  PLANIFIEE:    { label: "Planifiée",                   color: "#60a5fa", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.30)" },
  AUTOEVAL:     { label: "Autoévaluation en cours",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)" },
  EVAL_MANAGER: { label: "Évaluation manager en cours",  color: "#f0a500", bg: "rgba(240,165,0,0.12)",  border: "rgba(240,165,0,0.35)" },
  EN_REVUE_RH:  { label: "En revue RH",                  color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  VALIDEE:      { label: "Validée",                      color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)" },
  CLOTUREE:     { label: "Clôturée",                     color: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.30)" },
}

export const LABEL_PERIODE_EVALUATION: Record<PeriodeEvaluation, string> = {
  S1:       "Semestre 1",
  S2:       "Semestre 2",
  ANNUELLE: "Évaluation annuelle",
}

export const LABEL_NOTE_EVALUATION: Record<NoteEvaluation, string> = {
  INSUFFISANT:    "Insuffisant",
  EN_PROGRESSION: "En progression",
  SATISFAISANT:   "Satisfaisant",
  TRES_BON:       "Très bon",
  EXCELLENT:      "Excellent",
}

/* ════════════════════════════════════════════════
   Gestion du courrier
   ════════════════════════════════════════════════ */

export type TypeCourrier = "ENTRANT" | "SORTANT"

export type PrioriteCourrier = "NORMALE" | "URGENT" | "CONFIDENTIEL"

export type StatutCourrier =
  | "RECU"
  | "ENREGISTRE"
  | "AFFECTE"
  | "EN_TRAITEMENT"
  | "REPONDU"
  | "ARCHIVE"

export interface Courrier {
  id:               string
  reference:        string
  type:             TypeCourrier
  date:             string
  expediteur:       string
  destinataire:     string
  objet:            string
  serviceConcerne:  string
  priorite:         PrioriteCourrier
  statut:           StatutCourrier
  affecteA?:        string
  pieceJointe?:     string
  dateEnregistrement: string
}

export const STATUT_COURRIER_CONFIG: Record<
  StatutCourrier,
  { label: string; color: string; bg: string; border: string }
> = {
  RECU:         { label: "Reçu",         color: "#60a5fa", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.30)" },
  ENREGISTRE:   { label: "Enregistré",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)" },
  AFFECTE:      { label: "Affecté",      color: "#f0a500", bg: "rgba(240,165,0,0.12)",  border: "rgba(240,165,0,0.35)" },
  EN_TRAITEMENT:{ label: "En traitement",color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  REPONDU:      { label: "Répondu",      color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)" },
  ARCHIVE:      { label: "Archivé",      color: "var(--text-secondary)", bg: "rgba(61,102,80,0.20)", border: "var(--bg-border)" },
}

export const LABEL_TYPE_COURRIER: Record<TypeCourrier, string> = {
  ENTRANT: "Courrier entrant",
  SORTANT: "Courrier sortant",
}

export const LABEL_PRIORITE_COURRIER: Record<PrioriteCourrier, string> = {
  NORMALE:      "Normale",
  URGENT:       "Urgent",
  CONFIDENTIEL: "Confidentiel",
}
