/* ════════════════════════════════════════════════
   Types — Module Budget
   ════════════════════════════════════════════════ */

export type StatutBudget =
  | "BROUILLON"
  | "SOUMIS"
  | "VALIDE_RAF"
  | "APPROUVE"
  | "REJETE"

export type TypeBudget =
  | "INITIAL"       // PAB initial de l'année
  | "REVISE"        // Révision en cours d'année
  | "COMPLEMENTAIRE" // Rallonge budgétaire

export type CategorieBudget =
  | "PERSONNEL"
  | "FONCTIONNEMENT"
  | "INVESTISSEMENT"
  | "PROJETS"

export type Trimestre = "T1" | "T2" | "T3" | "T4"

export interface LigneBudgetaire {
  id:               string
  titre:            string        // intitulé du poste budgétaire
  code:             string        // ex: "B-2026-001"
  departement:      string
  annee:            number
  categorie:        CategorieBudget
  type:             TypeBudget
  montantPAB:       number        // montant initial prévu
  montantRevise:    number        // montant révisé (= montantPAB si non révisé)
  montantEngage:    number        // commandes passées / engagements
  montantRealise:   number        // paiements effectués
  statut:           StatutBudget
  trimestre?:       Trimestre     // pour suivi trimestriel
  demandeur:        string        // email
  commentaire?:     string
  commentaireRAF?:  string
  dateCreation:     string
  dateValidation?:  string
}

/* ── Constantes ── */

/** Année courante par défaut */
export const ANNEE_COURANTE = new Date().getFullYear()

/* ════════════════════════════════════════════════
   Config UI
   ════════════════════════════════════════════════ */

export const STATUT_BUDGET_CONFIG: Record<
  StatutBudget,
  { label: string; color: string; bg: string; border: string }
> = {
  BROUILLON: {
    label:  "Brouillon",
    color:  "var(--text-secondary)",
    bg:     "rgba(61,102,80,0.20)",
    border: "var(--bg-border)",
  },
  SOUMIS: {
    label:  "Soumis au RAF",
    color:  "#60a5fa",
    bg:     "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.30)",
  },
  VALIDE_RAF: {
    label:  "Validé RAF",
    color:  "#f0a500",
    bg:     "rgba(240,165,0,0.12)",
    border: "rgba(240,165,0,0.35)",
  },
  APPROUVE: {
    label:  "Approuvé DG",
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  REJETE: {
    label:  "Rejeté",
    color:  "#ef4444",
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
  },
}

export const LABEL_CATEGORIE_BUDGET: Record<CategorieBudget, string> = {
  PERSONNEL:      "Personnel",
  FONCTIONNEMENT: "Fonctionnement",
  INVESTISSEMENT: "Investissement",
  PROJETS:        "Projets",
}

export const LABEL_TYPE_BUDGET: Record<TypeBudget, string> = {
  INITIAL:        "PAB Initial",
  REVISE:         "Révision",
  COMPLEMENTAIRE: "Complémentaire",
}

export const LABEL_TRIMESTRE: Record<Trimestre, string> = {
  T1: "1er trimestre (Jan–Mar)",
  T2: "2ème trimestre (Avr–Jun)",
  T3: "3ème trimestre (Jul–Sep)",
  T4: "4ème trimestre (Oct–Déc)",
}
