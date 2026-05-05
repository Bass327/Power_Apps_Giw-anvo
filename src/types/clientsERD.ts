/**
 * Types — Reporting Clients ERD Kolda
 * Liste SharePoint : "Paiements_Clients_Kolda_ERD" sur le site GIWA_DTO
 *
 * Structure réelle confirmée via logListFieldsFromSite (avril 2026) :
 * ─────────────────────────────────────────────────────────────────
 * 1 ligne = 1 client
 * field_7 → field_18 = paiements mensuels (Nov 2025 → Oct 2026)
 * Modified = date de dernière saisie — utilisé pour le KPI "mois courant"
 *
 * Mapping champs confirmés :
 * | Nom interne | Champ réel                |
 * |-------------|---------------------------|
 * | Title       | ID_Client                 |
 * | field_1     | Nom complet               |
 * | field_2     | Village                   |
 * | field_6     | Type de service           |
 * | field_7     | Paiement Novembre (FCFA)  |
 * | field_8     | Paiement Décembre (FCFA)  |
 * | field_9     | Paiement Janvier (FCFA)   |
 * | field_10    | Paiement Février (FCFA)   |
 * | field_11    | Paiement Mars (FCFA)      |
 * | field_12    | Paiement Avril (FCFA)     |
 * | field_13    | Paiement Mai (FCFA)       |
 * | field_14    | Paiement Juin (FCFA)      |
 * | field_15    | Paiement Juillet (FCFA)   |
 * | field_16    | Paiement Aout (FCFA)      |
 * | field_17    | Paiement Septembre (FCFA) |
 * | field_18    | Paiement Octobre (FCFA)   |
 * | Modified    | Date dernière modification|
 */

/** Clés internes SharePoint des 12 colonnes de paiement mensuel */
export type MoisKey =
  | "field_7"   // Novembre 2025
  | "field_8"   // Décembre 2025
  | "field_9"   // Janvier 2026
  | "field_10"  // Février 2026
  | "field_11"  // Mars 2026
  | "field_12"  // Avril 2026
  | "field_13"  // Mai 2026
  | "field_14"  // Juin 2026
  | "field_15"  // Juillet 2026
  | "field_16"  // Août 2026
  | "field_17"  // Septembre 2026
  | "field_18"  // Octobre 2026

/** Métadonnées d'affichage pour chaque mois */
export interface MoisConfig {
  label:      string   // "Novembre 2025"
  shortLabel: string   // "Nov"
  isoMonth:   string   // "2025-11" — pour comparer avec modified.slice(0,7)
}

/** Mapping complet field_N → métadonnées — exercice fiscal Nov 2025 → Oct 2026 */
export const MOIS_CONFIG: Record<MoisKey, MoisConfig> = {
  field_7:  { label: "Novembre 2025",  shortLabel: "Nov",  isoMonth: "2025-11" },
  field_8:  { label: "Décembre 2025",  shortLabel: "Déc",  isoMonth: "2025-12" },
  field_9:  { label: "Janvier 2026",   shortLabel: "Jan",  isoMonth: "2026-01" },
  field_10: { label: "Février 2026",   shortLabel: "Fév",  isoMonth: "2026-02" },
  field_11: { label: "Mars 2026",      shortLabel: "Mar",  isoMonth: "2026-03" },
  field_12: { label: "Avril 2026",     shortLabel: "Avr",  isoMonth: "2026-04" },
  field_13: { label: "Mai 2026",       shortLabel: "Mai",  isoMonth: "2026-05" },
  field_14: { label: "Juin 2026",      shortLabel: "Juin", isoMonth: "2026-06" },
  field_15: { label: "Juillet 2026",   shortLabel: "Juil", isoMonth: "2026-07" },
  field_16: { label: "Août 2026",      shortLabel: "Aoû",  isoMonth: "2026-08" },
  field_17: { label: "Septembre 2026", shortLabel: "Sep",  isoMonth: "2026-09" },
  field_18: { label: "Octobre 2026",   shortLabel: "Oct",  isoMonth: "2026-10" },
}

/** Liste ordonnée des clés de mois (Nov → Oct) */
export const MOIS_KEYS: MoisKey[] = [
  "field_7", "field_8", "field_9",  "field_10", "field_11", "field_12",
  "field_13", "field_14", "field_15", "field_16", "field_17", "field_18",
]

/** Un client ERD avec ses paiements mensuels */
export interface ClientERD {
  id:          string                   // ID interne SharePoint
  idClient:    string                   // Title → ID_Client
  nomComplet:  string                   // field_1
  village:     string                   // field_2
  typeService: string                   // field_6
  paiements:   Record<MoisKey, number>  // Montant payé par mois (0 si absent ou non payé)
  totalPaye:   number                   // Σ paiements tous mois confondus
  modified:    string                   // YYYY-MM-DD — dernière modification SP
}
