import type { UserRole } from "@/types/user"

/* ════════════════════════════════════════════════
   Permissions centralisées — GIW'ANVO Gestion Interne
   Source de vérité unique pour les droits d'accès.
   ════════════════════════════════════════════════ */

/* ── Niveau d'accès par module ── */
export type AccessLevel = "none" | "read" | "partial" | "full"

/* ── Scope de visibilité des données ── */
export type DataScope = "own" | "department" | "global"

export type Module =
  | "budget"
  | "rh"
  | "achats"
  | "comptabilite"
  | "tresorerie"
  | "suivi"

/* ════════════════════════════════════════════════
   Matrice d'accès par module
   ════════════════════════════════════════════════ */

const MODULE_ACCESS: Record<UserRole, Record<Module, AccessLevel>> = {
  "Employé": {
    budget:       "none",    // pas d'accès au module Budget
    rh:           "partial", // ses propres demandes uniquement
    achats:       "partial", // crée et suit ses propres demandes
    comptabilite: "none",    // accès refusé
    tresorerie:   "none",    // accès refusé
    suivi:        "none",    // pas d'accès au suivi
  },
  "Chef Dept.": {
    budget:       "read",    // lecture — budget de son département
    rh:           "partial", // son équipe + validation N1
    achats:       "partial", // crée + valide N1 + voit son département
    comptabilite: "none",    // accès refusé
    tresorerie:   "none",    // accès refusé
    suivi:        "partial", // reporting ERD + contrôle financier + rapports de son département
  },
  "RAF": {
    budget:       "full",    // prépare, modifie, valide le PAB
    rh:           "full",    // tous les dossiers du personnel
    achats:       "full",    // valide N2, voit tout
    comptabilite: "full",    // supervise les journaux
    tresorerie:   "full",    // gestion complète
    suivi:        "full",    // tous les rapports
  },
  "Comptable": {
    budget:       "read",    // lecture seule pour imputation budgétaire
    rh:           "partial", // ses propres demandes (congés, missions…) comme un employé
    achats:       "partial", // crée ses propres demandes + traitement paiements validés
    comptabilite: "full",    // saisie écritures, journaux, clôtures
    tresorerie:   "full",    // caisse, paiements, rapprochements
    suivi:        "read",    // consultation des rapports financiers
  },
  "Directrice": {
    budget:       "full",    // approuve le PAB, supervise l'exécution
    rh:           "full",    // supervision complète RH
    achats:       "full",    // approbation finale toutes demandes
    comptabilite: "full",    // supervision états financiers
    tresorerie:   "full",    // approuve décaissements > seuil
    suivi:        "full",    // tableau de contrôle global
  },
}

/* ════════════════════════════════════════════════
   Accès spéciaux par email (exceptions individuelles)
   Permet d'accorder un accès à un module précis
   sans changer le rôle de l'utilisateur dans SP.
   ════════════════════════════════════════════════ */

const EMAIL_ACCESS: Record<string, Partial<Record<Module, AccessLevel>>> = {
  /* Astou Dième — accès Reporting Clients ERD sans changer son rôle */
  "astou.dieme@giwa-anvo.energy": { suivi: "read" },
}

/* Niveaux ordonnés du plus faible au plus fort */
const LEVEL_ORDER: AccessLevel[] = ["none", "read", "partial", "full"]

/** Retourne le niveau d'accès d'un rôle pour un module donné */
export function getModuleAccess(role: UserRole, module: Module, email?: string): AccessLevel {
  const roleLevel  = MODULE_ACCESS[role]?.[module] ?? "none"
  const emailLevel = email ? (EMAIL_ACCESS[email.toLowerCase()]?.[module] ?? "none") : "none"
  /* Prendre le niveau le plus élevé entre le rôle et l'exception email */
  return LEVEL_ORDER[Math.max(LEVEL_ORDER.indexOf(roleLevel), LEVEL_ORDER.indexOf(emailLevel))]
}

/** Vérifie si un rôle peut accéder à un module (access != none) */
export function canAccessModule(role: UserRole, module: Module, email?: string): boolean {
  return getModuleAccess(role, module, email) !== "none"
}

/* ════════════════════════════════════════════════
   Scope de visibilité des données
   ════════════════════════════════════════════════ */

const DATA_SCOPE: Record<UserRole, DataScope> = {
  "Employé":   "own",
  "Chef Dept.": "department",
  "RAF":        "global",
  "Comptable":  "global",
  "Directrice": "global",
}

/** Retourne le scope de données pour un rôle donné */
export function getDataScope(role: UserRole): DataScope {
  return DATA_SCOPE[role] ?? "own"
}

/**
 * Filtre une liste d'éléments selon le scope de l'utilisateur.
 * - own       : retourne uniquement les éléments dont `ownerEmail` correspond
 * - department : retourne les éléments du département ou propriété de l'user
 * - global    : retourne tout
 */
export function filterByScope<T extends { demandeur?: string; employe?: string }>(
  items:      T[],
  role:       UserRole,
  userEmail:  string,
  userDept:   string,
  deptField?: keyof T,
): T[] {
  const scope = getDataScope(role)

  if (scope === "global") return items

  if (scope === "department") {
    return items.filter((item) => {
      const owner = item.demandeur ?? item.employe ?? ""
      // Inclure ses propres éléments + ceux du même département si champ fourni
      const ownItem  = owner.toLowerCase() === userEmail.toLowerCase()
      const deptItem = deptField
        ? String(item[deptField] ?? "").toLowerCase() === userDept.toLowerCase()
        : false
      return ownItem || deptItem
    })
  }

  // scope === "own"
  return items.filter((item) => {
    const owner = item.demandeur ?? item.employe ?? ""
    return owner.toLowerCase() === userEmail.toLowerCase()
  })
}

/* ════════════════════════════════════════════════
   Permissions d'actions — circuit complet
   ════════════════════════════════════════════════ */

export const PERMISSIONS = {
  /* ── Achats ── */
  /** Qui peut créer des demandes d'achat */
  canCreateDemande: ["Employé", "Chef Dept.", "RAF", "Comptable", "Directrice"] as UserRole[],

  /** Qui peut valider en N1 (Chef de département) */
  canValidateN1: ["Chef Dept."] as UserRole[],

  /** Qui peut valider en N2 (RAF) */
  canValidateN2: ["RAF"] as UserRole[],

  /** Qui peut approuver en final (Directrice) */
  canApprouverFinal: ["Directrice"] as UserRole[],

  /** Qui peut traiter les paiements (Comptable) */
  canTraiterPaiement: ["Comptable"] as UserRole[],

  /* ── Visibilité ── */
  /** Qui voit toutes les demandes (tous départements) */
  canViewAll: ["RAF", "Directrice", "Comptable"] as UserRole[],

  /** Qui voit uniquement son département */
  canViewDept: ["Chef Dept."] as UserRole[],

  /* ── Trésorerie ── */
  /** Qui peut créer des demandes de décaissement */
  canCreateDecaissement: ["Employé", "Chef Dept.", "RAF", "Comptable", "Directrice"] as UserRole[],

  /** Qui peut valider les décaissements (RAF) */
  canValiderDecaissement: ["RAF"] as UserRole[],

  /** Qui peut approuver les décaissements > seuil (Directrice) */
  canApprouverDecaissement: ["Directrice"] as UserRole[],

  /** Qui peut exécuter les décaissements (Comptable) */
  canExecuterDecaissement: ["Comptable"] as UserRole[],

  /** Qui peut saisir dans le journal de caisse */
  canSaisirCaisse: ["Comptable", "RAF"] as UserRole[],

  /* ── RH ── */
  /** Qui peut soumettre ses propres demandes RH (congés, absences, missions) */
  canSubmitOwnRH: ["Employé", "Chef Dept.", "RAF", "Comptable", "Directrice"] as UserRole[],

  /** Qui peut valider les congés */
  canValiderConge: ["Chef Dept.", "RAF", "Directrice"] as UserRole[],

  /** Qui peut valider les absences */
  canValiderAbsence: ["Chef Dept.", "RAF", "Directrice"] as UserRole[],

  /** Qui peut approuver les ordres de mission */
  canApprouverMission: ["RAF", "Directrice"] as UserRole[],

  /** Qui peut gérer le courrier (enregistrement, dispatch, archivage) */
  canGererCourrier: ["RAF", "Chef Dept.", "Directrice"] as UserRole[],

  /** Qui peut ouvrir un dossier de recrutement */
  canGererRecrutement: ["RAF", "Chef Dept.", "Directrice"] as UserRole[],

  /** Qui peut gérer les sanctions disciplinaires (création, instruction) */
  canGererSanctions: ["RAF", "Directrice"] as UserRole[],

  /** Qui peut faire avancer le circuit d'une sanction disciplinaire */
  canAvancerSanction: ["Directrice"] as UserRole[],

  /** Qui peut créer des évaluations */
  canCreerEvaluation: ["RAF", "Chef Dept.", "Directrice"] as UserRole[],

  /** Qui peut avancer le statut d'une évaluation */
  canAvancerEvaluation: ["RAF", "Chef Dept.", "Directrice"] as UserRole[],

  /* ── Budget ── */
  /** Qui peut créer des lignes budgétaires */
  canCreerLigneBudget: ["RAF", "Directrice"] as UserRole[],

  /** Qui peut valider une ligne budgétaire (RAF) */
  canValiderBudget: ["RAF"] as UserRole[],

  /** Qui peut approuver le budget (Directrice) */
  canApprouverBudget: ["Directrice"] as UserRole[],

  /** Qui peut saisir l'exécution budgétaire */
  canSaisirExecutionBudget: ["RAF", "Comptable"] as UserRole[],

  /* ── Comptabilité ── */
  /** Qui peut saisir des écritures comptables */
  canSaisirEcriture: ["Comptable"] as UserRole[],

  /* ── Suivi & Contrôle ── */
  /** Qui peut générer des rapports */
  canGenererRapport: ["RAF", "Chef Dept.", "Directrice"] as UserRole[],
}

/**
 * Vérifie si un rôle a une permission d'action donnée.
 * Toujours utiliser cette fonction — ne jamais hardcoder un rôle dans un composant.
 */
export const hasPermission = (
  role:       UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean => (PERMISSIONS[permission] as UserRole[]).includes(role)

/* ════════════════════════════════════════════════
   Liste des modules visibles dans la sidebar
   ════════════════════════════════════════════════ */

/** Retourne les modules accessibles pour un rôle (dans l'ordre de la sidebar) */
export function getVisibleModules(role: UserRole, email?: string): Module[] {
  return (["budget", "rh", "achats", "comptabilite", "tresorerie", "suivi"] as Module[])
    .filter((mod) => canAccessModule(role, mod, email))
}

/* ════════════════════════════════════════════════
   Messages d'accès refusé
   ════════════════════════════════════════════════ */

export const ACCESS_DENIED_MESSAGES: Partial<Record<Module, string>> = {
  budget:       "Accès réservé à la direction financière",
  comptabilite: "Accès réservé au service comptable",
  tresorerie:   "Accès réservé au service financier",
  rh:           "Accès réservé aux RH et à la direction",
  suivi:        "Accès réservé aux chefs de département, au RAF et à la direction",
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
