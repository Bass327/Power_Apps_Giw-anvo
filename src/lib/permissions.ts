import type { UserRole } from "@/types/user"

/* ════════════════════════════════════════════════
   Permissions centralisées — GIW'ANVO Gestion Interne
   Source de vérité unique pour les droits d'accès.
   Source : ROLES_PERMISSIONS.md
   ════════════════════════════════════════════════ */

/* ── Niveau d'accès par module ── */
export type AccessLevel = "none" | "read" | "partial" | "full"

export type Module =
  | "budget"
  | "rh"
  | "achats"
  | "comptabilite"
  | "tresorerie"
  | "suivi"

/** Matrice complète des accès par rôle et par module */
const MODULE_ACCESS: Record<UserRole, Record<Module, AccessLevel>> = {
  "Employé": {
    budget:       "read",    // lecture seule — son département
    rh:           "partial", // ses propres demandes uniquement
    achats:       "partial", // crée et suit ses propres demandes
    comptabilite: "none",    // accès refusé
    tresorerie:   "none",    // accès refusé
    suivi:        "read",    // lecture seule — le concernant
  },
  "Chef Dept.": {
    budget:       "read",    // lecture seule — son département
    rh:           "partial", // son équipe uniquement
    achats:       "partial", // valide N1, voit son département
    comptabilite: "none",    // accès refusé
    tresorerie:   "read",    // lecture seule — son département
    suivi:        "partial", // rapports de son département
  },
  "RAF": {
    budget:       "full",    // prépare, modifie, soumet le PAB
    rh:           "full",    // tous les dossiers du personnel
    achats:       "full",    // valide N2, voit tout
    comptabilite: "full",    // supervise les journaux
    tresorerie:   "full",    // gestion complète
    suivi:        "full",    // tous les rapports
  },
  "Comptable": {
    budget:       "read",    // lecture seule pour imputation
    rh:           "none",    // accès refusé
    achats:       "partial", // traitement paiements uniquement
    comptabilite: "full",    // saisie des écritures, journaux
    tresorerie:   "full",    // caisse, paiements, rapprochements
    suivi:        "read",    // consultation des rapports
  },
  "Directrice": {
    budget:       "full",    // approuve le PAB, supervise
    rh:           "full",    // supervision complète
    achats:       "full",    // approbation finale
    comptabilite: "full",    // supervision des états financiers
    tresorerie:   "full",    // approuve décaissements > 100K
    suivi:        "full",    // tableau de contrôle global
  },
}

/** Retourne le niveau d'accès d'un rôle pour un module donné */
export function getModuleAccess(role: UserRole, module: Module): AccessLevel {
  return MODULE_ACCESS[role]?.[module] ?? "none"
}

/** Vérifie si un rôle peut accéder à un module (access != none) */
export function canAccessModule(role: UserRole, module: Module): boolean {
  return getModuleAccess(role, module) !== "none"
}

/* ── Messages d'accès refusé par module ── */
export const ACCESS_DENIED_MESSAGES: Partial<Record<Module, string>> = {
  comptabilite: "Accès réservé au service comptable",
  tresorerie:   "Accès réservé au service financier",
  rh:           "Accès réservé aux RH et à la direction",
}

/* ── Labels des niveaux d'accès ── */
export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  none:    "Accès refusé",
  read:    "Lecture seule",
  partial: "Accès partiel",
  full:    "Accès complet",
}

export const ACCESS_LEVEL_COLORS: Record<Exclude<AccessLevel, "none">, { color: string; bg: string; border: string }> = {
  read:    { color: "#60a5fa", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)" },
  partial: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" },
  full:    { color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)"  },
}

/* ── Permissions d'actions (circuit Achats) ── */
export const PERMISSIONS = {
  /** Qui peut créer des demandes d'achat */
  canCreateDemande: ["Employé", "RAF", "Chef Dept."] as UserRole[],

  /** Qui peut valider en N1 (Chef de département) */
  canValidateN1: ["Chef Dept."] as UserRole[],

  /** Qui peut valider en N2 (RAF) */
  canValidateN2: ["RAF"] as UserRole[],

  /** Qui peut approuver en final (Directrice) */
  canApprouverFinal: ["Directrice"] as UserRole[],

  /** Qui peut traiter les paiements (Comptable) */
  canTraiterPaiement: ["Comptable"] as UserRole[],

  /** Qui voit toutes les demandes (tous départements) */
  canViewAll: ["RAF", "Directrice"] as UserRole[],

  /** Qui voit uniquement son département */
  canViewDept: ["Chef Dept."] as UserRole[],

  /** Qui peut approuver les décaissements > 100K (Trésorerie) */
  canApprouverDecaissement: ["Directrice", "RAF"] as UserRole[],

  /** Qui peut valider les congés RH */
  canValiderConge: ["Chef Dept.", "RAF", "Directrice"] as UserRole[],

  /** Qui peut gérer les sanctions disciplinaires */
  canGererSanctions: ["RAF", "Directrice"] as UserRole[],

  /** Qui peut approuver les ordres de mission */
  canApprouverMission: ["RAF", "Directrice"] as UserRole[],
}

/**
 * Vérifie si un rôle a une permission d'action donnée.
 * Toujours utiliser cette fonction — ne jamais hardcoder un rôle dans un composant.
 */
export const hasPermission = (
  role: UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean => {
  return (PERMISSIONS[permission] as UserRole[]).includes(role)
}
