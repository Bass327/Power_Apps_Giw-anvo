/* ════════════════════════════════════════════════
   Types — Nouvelles listes Trésorerie (analytique)
   Tresorerie_Projects, Tresorerie_TypesDepenses,
   Tresorerie_Transactions, Tresorerie_BudgetsMensuels
   ════════════════════════════════════════════════ */

/* ── Valeurs métier — doivent correspondre exactement aux valeurs SharePoint ── */

export type TypeFlux = "Cash In" | "Cash Out"

export type CategorieGlobale = "General" | "Project Specific" | "Production"

export type StatutTransaction = "Prévision" | "Réel" | "Validé"

export type StatutBudget = "Brouillon" | "Validé"

/* ── Référentiel Projets (Tresorerie_Projects) ── */

export interface TresorerieProject {
  id:               string
  nom:              string
  codeProjet:       string
  categorieGlobale: CategorieGlobale
  localisation:     string
  responsable:      string
  actif:            boolean
}

/* ── Référentiel Types de dépenses (Tresorerie_TypesDepenses) ── */

export interface TresorerieTypeDepense {
  id:               string
  nom:              string
  codeTypeDepense:  string
  categorieParente: CategorieGlobale | null
  actif:            boolean
}

/** Alias court utilisé dans les hooks */
export type TypeDepense = TresorerieTypeDepense

/* ── Transactions (Tresorerie_Transactions) ── */

export interface Transaction {
  id:                     string
  referenceTransaction:   string
  dateTransaction:        string            // ISO date (YYYY-MM-DD)
  mois:                   number            // 1–12
  annee:                  number
  typeFlux:               TypeFlux
  categorieGlobale:       CategorieGlobale
  projetId?:              string            // ID lookup → Tresorerie_Projects
  projetNom?:             string            // résolu côté client via référentiel
  typeDepenseId?:         string            // ID lookup → Tresorerie_TypesDepenses
  typeDepenseNom?:        string            // résolu côté client via référentiel
  partenaire:             string
  montantLocal:           number
  deviseCode:             string
  tauxChange:             number            // nb d'unités de devise pour 1 EUR
  montantConvertiEUR:     number
  statutTransaction:      StatutTransaction
  commentaire?:           string
  pieceJustificativeURL?: string
  saisiPar:               string            // email utilisateur
  dateSaisie:             string            // ISO datetime
}

/** Données saisies par l'utilisateur dans le formulaire — le reste est calculé */
export type TransactionFormData = Pick<
  Transaction,
  | "dateTransaction"
  | "typeFlux"
  | "categorieGlobale"
  | "partenaire"
  | "montantLocal"
  | "deviseCode"
  | "commentaire"
  | "pieceJustificativeURL"
> & {
  projetId?:      string
  typeDepenseId?: string
  statutTransaction?: StatutTransaction
}

/* ── Budgets mensuels (Tresorerie_BudgetsMensuels) ── */

export interface BudgetMensuel {
  id:               string
  libelle:          string
  mois:             number
  annee:            number
  categorieGlobale: CategorieGlobale
  projetId?:        string
  projetNom?:       string
  typeDepenseId?:   string
  typeDepenseNom?:  string
  montantBudgete:   number
  commentaire?:     string
  versionBudget?:   string
  statutBudget:     StatutBudget
}

/** Données saisies pour créer une ligne de budget */
export type BudgetFormData = Omit<BudgetMensuel, "id" | "libelle">

/* ── Budget vs Réel — calculé côté client ── */

export type AlerteBudget = "ok" | "attention" | "dépassement" | "critique"

export interface LigneBudgetReel {
  /** Clé de regroupement : "${projetNom|'Général'}-${typeDepenseNom|'—'}-${categorieGlobale}" */
  cle:              string
  categorieGlobale: CategorieGlobale
  projetNom?:       string
  typeDepenseNom?:  string
  montantBudgete:   number
  montantReel:      number
  /** Positif = sous budget, négatif = dépassement */
  ecart:            number
  /** (montantReel / montantBudgete) × 100 */
  pourcent:         number
  alerte:           AlerteBudget
}

/* ════════════════════════════════════════════════
   Référentiel devises et taux de change
   Convention : tauxChange = nb d'unités de devise pour 1 EUR
   MontantConvertiEUR = MontantLocal / tauxChange
   ════════════════════════════════════════════════ */

export const DEVISES: { code: string; label: string; tauxChange: number }[] = [
  { code: "XOF", label: "XOF — Franc CFA",     tauxChange: 655.957 }, // taux fixe BCEAO
  { code: "EUR", label: "EUR — Euro",            tauxChange: 1 },
  { code: "USD", label: "USD — Dollar US",       tauxChange: 1.10 },   // approximatif
  { code: "GBP", label: "GBP — Livre sterling",  tauxChange: 0.86 },   // approximatif
]

/** Retourne le taux de change d'une devise (nb d'unités pour 1 EUR) */
export function getTauxChange(deviseCode: string): number {
  return DEVISES.find((d) => d.code === deviseCode)?.tauxChange ?? 655.957
}

/** Convertit un montant local en EUR */
export function toEUR(montantLocal: number, deviseCode: string): number {
  return montantLocal / getTauxChange(deviseCode)
}

/** Dérive mois (1–12) et année depuis une date ISO */
export function getMoisAnnee(dateISO: string): { mois: number; annee: number } {
  const d = new Date(dateISO)
  return { mois: d.getMonth() + 1, annee: d.getFullYear() }
}

/** Détermine le statut automatique selon la date */
export function getStatutAuto(dateISO: string): StatutTransaction {
  return new Date(dateISO) <= new Date() ? "Réel" : "Prévision"
}

/** Génère une référence de transaction unique */
export function genererReference(mois: number, annee: number): string {
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `TRX-${annee}${String(mois).padStart(2, "0")}-${suffix}`
}

/** Calcule l'alerte budgétaire selon le % de réalisation */
export function getAlerteBudget(pourcent: number): AlerteBudget {
  if (pourcent > 130) return "critique"
  if (pourcent > 100) return "dépassement"
  if (pourcent >  80) return "attention"
  return "ok"
}

/* ════════════════════════════════════════════════
   Constantes UI
   ════════════════════════════════════════════════ */

export const TYPE_FLUX_CONFIG: Record<
  TypeFlux,
  { label: string; couleur: string; bg: string; border: string; signe: "+" | "-" }
> = {
  "Cash In":  { label: "Cash In",  couleur: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)",  signe: "+" },
  "Cash Out": { label: "Cash Out", couleur: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)",  signe: "-" },
}

export const STATUT_TRANSACTION_CONFIG: Record<
  StatutTransaction,
  { label: string; couleur: string; bg: string; border: string }
> = {
  "Prévision": { label: "Prévision", couleur: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)" },
  "Réel":      { label: "Réel",      couleur: "#60a5fa", bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.30)" },
  "Validé":    { label: "Validé",    couleur: "#22c55e", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.30)" },
}

export const STATUT_BUDGET_CONFIG: Record<
  StatutBudget,
  { label: string; couleur: string; bg: string; border: string }
> = {
  "Brouillon": { label: "Brouillon", couleur: "var(--text-secondary)", bg: "rgba(61,102,80,0.20)", border: "var(--bg-border)" },
  "Validé":    { label: "Validé",    couleur: "#22c55e",                bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)" },
}

export const ALERTE_BUDGET_CONFIG: Record<
  AlerteBudget,
  { couleur: string; bg: string; border: string; label: string }
> = {
  ok:          { couleur: "#22c55e", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.20)",   label: "OK" },
  attention:   { couleur: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)",  label: "Attention" },
  dépassement: { couleur: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)",   label: "Dépassement" },
  critique:    { couleur: "#dc2626", bg: "rgba(220,38,38,0.15)",   border: "rgba(220,38,38,0.40)",   label: "Critique" },
}

export const CATEGORIES_GLOBALES: CategorieGlobale[] = [
  "General",
  "Project Specific",
  "Production",
]
