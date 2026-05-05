/* ════════════════════════════════════════════════
   Types — Module Trésorerie
   ════════════════════════════════════════════════ */

/* ── Demandes de décaissement ── */

export type TypeDecaissement =
  | "CHEQUE"
  | "VIREMENT"
  | "ESPECES"
  | "MOBILE_MONEY"

export type StatutDecaissement =
  | "BROUILLON"
  | "SOUMIS"
  | "VALIDE_RAF"    // validé par le RAF (suffisant si ≤ 100 000 FCFA)
  | "APPROUVE"      // approuvé par la Directrice (requis si > 100 000 FCFA)
  | "EXECUTE"       // décaissement effectivement réalisé par le Comptable
  | "REJETE"

export interface DemandeDecaissement {
  id:                  string
  titre:               string
  montant:             number
  devise:              "FCFA"
  typeDecaissement:    TypeDecaissement
  beneficiaire:        string
  motif:               string
  demandeur:           string        // email
  statut:              StatutDecaissement
  dateDemande:         string        // ISO date
  dateEcheance?:       string        // date souhaitée d'exécution
  commentaireRAF?:     string
  dateValidationRAF?:  string
  commentaireDir?:     string
  dateApprobation?:    string
  dateExecution?:      string
  reference?:          string        // référence chèque / virement
}

/* ── Opérations de caisse ── */

export type TypeOperationCaisse =
  | "ENTREE"
  | "SORTIE"
  | "APPROVISIONNEMENT"
  | "INVENTAIRE"

export interface OperationCaisse {
  id:            string
  typeOperation: TypeOperationCaisse
  montant:       number
  devise:        "FCFA"
  description:   string
  saiseur:       string             // email
  dateSaisie:    string             // ISO date
  reference?:    string
  beneficiaire?: string
  soldeApres?:   number
}

/* ════════════════════════════════════════════════
   Constantes UI
   ════════════════════════════════════════════════ */

export const STATUT_DECAISSEMENT_CONFIG: Record<
  StatutDecaissement,
  { label: string; color: string; bg: string; border: string }
> = {
  BROUILLON:   { label: "Brouillon",      color: "var(--text-secondary)", bg: "rgba(61,102,80,0.20)",  border: "var(--bg-border)" },
  SOUMIS:      { label: "Soumis",          color: "#60a5fa",               bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.30)" },
  VALIDE_RAF:  { label: "Validé RAF",      color: "#a78bfa",               bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)" },
  APPROUVE:    { label: "Approuvé DG",     color: "#22c55e",               bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)" },
  EXECUTE:     { label: "Exécuté",         color: "#34d399",               bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.30)" },
  REJETE:      { label: "Rejeté",          color: "#ef4444",               bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)" },
}

export const TYPE_DECAISSEMENT_CONFIG: Record<
  TypeDecaissement,
  { label: string; icon: string }
> = {
  CHEQUE:       { label: "Chèque",         icon: "📄" },
  VIREMENT:     { label: "Virement",        icon: "🏦" },
  ESPECES:      { label: "Espèces",         icon: "💵" },
  MOBILE_MONEY: { label: "Mobile Money",    icon: "📱" },
}

export const TYPE_OPERATION_CAISSE_CONFIG: Record<
  TypeOperationCaisse,
  { label: string; couleur: string; signe: "+" | "-" }
> = {
  ENTREE:           { label: "Entrée",            couleur: "#22c55e", signe: "+" },
  SORTIE:           { label: "Sortie",             couleur: "#ef4444", signe: "-" },
  APPROVISIONNEMENT:{ label: "Approvisionnement",  couleur: "#f0a500", signe: "+" },
  INVENTAIRE:       { label: "Inventaire",         couleur: "#60a5fa", signe: "+" },
}

/** Seuil au-delà duquel l'approbation de la Directrice est requise */
export const SEUIL_APPROBATION_DG = 100_000
