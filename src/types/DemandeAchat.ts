/* ════════════════════════════════════════════════
   Types — Module Achats
   ════════════════════════════════════════════════ */

export type TypeAchat = "ORDINAIRE" | "RESTREINT"

export type StatutDemande =
  | "BROUILLON"
  | "SOUMIS"
  | "VALIDE_CHEF"   // Héritage — plus créé par le nouveau circuit
  | "VALIDE_RAF"    // Héritage — plus créé par le nouveau circuit
  | "APPROUVE"      // Approuvé par la Directrice (finale)
  | "EN_PAIEMENT"   // Pris en charge par le Comptable
  | "SOLDE"         // Paiement effectué
  | "REJETE"        // Rejeté

/* ── Types de demande — formulaire Microsoft Forms style ── */

export type TypeDemande =
  | "DEPART_MISSION"
  | "PIECE_CAISSE"
  | "ACHAT_PRESTATION"
  | "URGENCE_TERRAIN"

export type ModePaiement = "CHEQUE" | "CASH" | "WAVE" | "VIREMENT"

export type TypePaiement = "AVANCE" | "REMBOURSEMENT" | "PAIEMENT_FOURNISSEUR"

export type JustificationOperationnelle =
  | "CONTINUITE"
  | "ENGAGEMENT"
  | "SECURITE"
  | "REVENUS"
  | "RISQUE"

export type CategorieDepense =
  | "TRANSPORT"
  | "HEBERGEMENT"
  | "RESTAURATION"
  | "MATERIEL"
  | "SERVICE"
  | "AUTRE"

export type ModePaiementCaisse =
  | "ESPECES"
  | "CHEQUE"
  | "WAVE"
  | "ORANGE_MONEY"
  | "VIREMENT"

export type TypeMission =
  | "TECHNIQUE"
  | "COMMERCIALE"
  | "INSTITUTIONNELLE"
  | "LOGISTIQUE"
  | "MAINTENANCE"
  | "AUTRE"

export type MoyenTransport =
  | "VEHICULE_SERVICE"
  | "VEHICULE_PERSO"
  | "TRANSPORT_PUBLIC"
  | "AVION"
  | "AUTRE"

export type NatureUrgence =
  | "PANNE_SOLAIRE"
  | "PANNE_EAU"
  | "ACCIDENT_SECURITE"
  | "PROBLEME_ELECTRIQUE"
  | "DOMMAGE_INFRA"
  | "AUTRE_URGENCE"

export type NiveauCriticite = "CRITIQUE" | "ELEVE" | "MODERE"

export type ModePaiementUrgent =
  | "ESPECES"
  | "WAVE"
  | "ORANGE_MONEY"
  | "VIREMENT_URGENT"
  | "CHEQUE"

/* ── Demande d'achat (modèle applicatif) ── */
export interface DemandeAchat {
  id:              string
  titre:           string
  description:     string
  montant:         number
  devise:          "FCFA"
  typeAchat:       TypeAchat
  statut:          StatutDemande
  demandeur:       string           // email de l'auteur
  dateDemande:     string           // ISO date
  dateBesoin:      string           // ISO date
  fournisseur:     string           // peut être vide
  justification:   string
  ligneBudgetaire: string
  /* ── Commentaires par validateur ── */
  commentaireChef:       string
  dateValidationChef:    string
  commentaireRAF:        string
  dateValidationRAF:     string
  commentaireDirectrice: string
  dateApprobation:       string
  /* ── Champs étendus (formulaire 4 étapes) ── */
  typeDemande?:     TypeDemande
  dateDebut?:       string
  dateFin?:         string
  modePaiement?:    ModePaiement
  typePaiement?:    TypePaiement
  urgent?:          boolean
  justificationOp?: JustificationOperationnelle
  categorieDep?:    CategorieDepense
  /* ── Pièce de caisse ── */
  motifCaisse?:         string
  encaissementPar?:     string
  modePaiementCaisse?:  ModePaiementCaisse
  /* ── Départ de mission ── */
  intituleMission?:       string
  typeMission?:           TypeMission
  objectifMission?:       string
  lieuxMission?:          string
  dateDepart?:            string
  dateRetour?:            string
  dureeMission?:          number
  moyenTransport?:        MoyenTransport
  besoinAvance?:          boolean
  montantAvance?:         number
  typeMissionCollective?: "INDIVIDUELLE" | "COLLECTIVE"
  nombreParticipants?:    number
  /* ── Urgence terrain ── */
  siteUrgence?:          string
  natureUrgence?:        NatureUrgence
  descriptionUrgence?:   string
  niveauCriticite?:      NiveauCriticite
  actionImmediate?:      string
  modePaiementUrgent?:   ModePaiementUrgent
  responsableSite?:      string
  dateIncident?:         string
}

/* ── Champs bruts retournés par SharePoint (Graph API expand=fields) ──
   IMPORTANT : utiliser les noms internes exacts, pas les displayName.
   Source : GET /sites/{siteId}/lists/Demandes_Achats/columns
   ──────────────────────────────────────────────────────────────────── */
export interface DemandeAchatSPFields {
  Title:                   string   // Titre
  Demandeur:               string   // Demandeur
  Description_Besoin?:     string   // Description_Besoin  ← "Description" était réservé
  Montant_Estim_x00e9_?:   number   // Montant_Estimé      ← encodage SharePoint des accents
  Ligne_Budg_x00e9_taire?: string   // Ligne_Budgétaire
  Statut:                  string   // Statut
  Date?:                   string   // Date de besoin      ← était "DateBesoin"
  Fournisseur?:            string   // Fournisseur suggéré
  Justification?:          string   // Justification détaillée
  /* ── Commentaires et dates de validation par étape ── */
  Commentaire_RAF?:        string
  Commentaire_DG?:         string
  CommentaireChef?:        string
  DateValidationChef?:     string
  DateValidationRAF?:      string
  DateApprobation?:        string
  Created:                 string   // Créé (date de création SharePoint)
  /* ── Champs étendus ── */
  TypeDemande?:     string
  DateDebut?:       string
  DateFin?:         string
  ModePaiement?:    string
  TypePaiement?:    string
  Urgent?:          string   // "Oui" | "Non"
  JustificationOp?: string
  CategorieDep?:    string
  /* ── Pièce de caisse ── */
  MotifCaisse?:      string
  EncaissementPar?:  string
  ModeEncaissement?: string
  /* ── Départ de mission ── */
  IntituleMission?:    string
  TypeMission?:        string
  ObjectifMission?:    string
  LieuxMission?:       string
  DateDepart?:         string
  DateRetour?:         string
  DureeMission?:       number
  MoyenTransport?:     string
  BesoinAvance?:       string
  MontantAvance?:      number
  Mission?:            string   // Mission collective ← était "MissionCollective"
  NombreParticipants?: number
}

export interface DemandeAchatSPItem {
  id:     string
  fields: DemandeAchatSPFields
}

/* ── Payload création ── */
export type CreateDemandeAchatPayload = Omit<
  DemandeAchat,
  | "id" | "typeAchat" | "statut" | "devise" | "dateDemande"
  | "commentaireChef" | "dateValidationChef"
  | "commentaireRAF"  | "dateValidationRAF"
  | "commentaireDirectrice" | "dateApprobation"
>

/* ── Payload validation ── */
export interface UpdateStatutPayload {
  statut:      StatutDemande
  commentaire: string
}

/* ════════════════════════════════════════════════
   Constantes UI — labels, couleurs, circuits
   ════════════════════════════════════════════════ */

export const STATUT_CONFIG: Record<
  StatutDemande,
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
  VALIDE_CHEF: {
    label:  "Validé Chef",
    color:  "#a78bfa",
    bg:     "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.30)",
  },
  VALIDE_RAF: {
    label:  "Validé RAF",
    color:  "#f59e0b",
    bg:     "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
  },
  APPROUVE: {
    label:  "Approuvé",
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  EN_PAIEMENT: {
    label:  "En paiement",
    color:  "var(--gold-warm)",
    bg:     "rgba(240,165,0,0.12)",
    border: "rgba(240,165,0,0.35)",
  },
  SOLDE: {
    label:  "Soldé",
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

export const TYPE_CONFIG: Record<TypeAchat, { label: string; seuil: string }> = {
  ORDINAIRE: { label: "Ordinaire", seuil: "250 000 – 499 999 FCFA" },
  RESTREINT: { label: "Restreint", seuil: "≥ 500 000 FCFA"         },
}

/* Circuit de validation selon le type — libellés des étapes */
export const CIRCUIT_VALIDATION: Record<TypeAchat, string[]> = {
  ORDINAIRE: ["Demandeur", "Directrice", "Comptable"],
  RESTREINT: ["Demandeur", "Directrice", "Comptable"],
}

/** Ordre des statuts pour afficher la progression dans le circuit */
export const ETAPES_CIRCUIT: StatutDemande[] = [
  "SOUMIS", "VALIDE_CHEF", "VALIDE_RAF", "APPROUVE", "EN_PAIEMENT", "SOLDE",
]

/** Détecte automatiquement le type d'achat selon le montant */
export function detecterTypeAchat(montant: number): TypeAchat {
  return montant >= 500_000 ? "RESTREINT" : "ORDINAIRE"
}

/* ── Labels — types de demande ── */

export const LABEL_TYPE_DEMANDE: Record<TypeDemande, string> = {
  DEPART_MISSION:   "Départ de mission",
  PIECE_CAISSE:     "Pièce de caisse",
  ACHAT_PRESTATION: "Achat-Prestation",
  URGENCE_TERRAIN:  "Urgence terrain",
}

export const LABEL_MODE_PAIEMENT: Record<ModePaiement, string> = {
  CHEQUE:   "Chèque",
  CASH:     "Cash",
  WAVE:     "Wave",
  VIREMENT: "Virement bancaire",
}

export const LABEL_TYPE_PAIEMENT: Record<TypePaiement, string> = {
  AVANCE:               "Avance",
  REMBOURSEMENT:        "Remboursement",
  PAIEMENT_FOURNISSEUR: "Paiement fournisseur",
}

export const LABEL_JUSTIFICATION_OP: Record<JustificationOperationnelle, string> = {
  CONTINUITE: "Continuité des opérations",
  ENGAGEMENT: "Respect d'un engagement",
  SECURITE:   "Sécurité / qualité",
  REVENUS:    "Génération de revenus",
  RISQUE:     "Réduction d'un risque",
}

export const LABEL_CATEGORIE_DEP: Record<CategorieDepense, string> = {
  TRANSPORT:    "Transport",
  HEBERGEMENT:  "Hébergement",
  RESTAURATION: "Restauration",
  MATERIEL:     "Matériel",
  SERVICE:      "Service / prestation",
  AUTRE:        "Autre",
}

export const LABEL_MODE_PAIEMENT_CAISSE: Record<ModePaiementCaisse, string> = {
  ESPECES:      "Espèces",
  CHEQUE:       "Chèque",
  WAVE:         "Wave",
  ORANGE_MONEY: "Orange Money",
  VIREMENT:     "Virement bancaire",
}

export const LABEL_TYPE_MISSION: Record<TypeMission, string> = {
  TECHNIQUE:        "Technique",
  COMMERCIALE:      "Commerciale",
  INSTITUTIONNELLE: "Institutionnelle",
  LOGISTIQUE:       "Logistique",
  MAINTENANCE:      "Maintenance",
  AUTRE:            "Autre",
}

export const LABEL_MOYEN_TRANSPORT: Record<MoyenTransport, string> = {
  VEHICULE_SERVICE: "Véhicule de service",
  VEHICULE_PERSO:   "Véhicule personnel",
  TRANSPORT_PUBLIC: "Transport public",
  AVION:            "Avion",
  AUTRE:            "Autre",
}

export const LABEL_NATURE_URGENCE: Record<NatureUrgence, string> = {
  PANNE_SOLAIRE:       "Panne équipement solaire",
  PANNE_EAU:           "Panne système eau",
  ACCIDENT_SECURITE:   "Accident / Incident sécurité",
  PROBLEME_ELECTRIQUE: "Problème électrique critique",
  DOMMAGE_INFRA:       "Dommage infrastructure",
  AUTRE_URGENCE:       "Autre urgence opérationnelle",
}

export const LABEL_MODE_PAIEMENT_URGENT: Record<ModePaiementUrgent, string> = {
  ESPECES:        "Espèces",
  WAVE:           "Wave",
  ORANGE_MONEY:   "Orange Money",
  VIREMENT_URGENT: "Virement urgent",
  CHEQUE:         "Chèque",
}
