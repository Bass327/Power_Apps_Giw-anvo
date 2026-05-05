import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formate un montant en FCFA — ex : 1500000 → "1 500 000 FCFA" */
export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat("fr-FR").format(montant) + "\u00A0FCFA"
}

/**
 * Formate un montant en FCFA version courte pour les KPIs.
 * Exemples : 1 500 000 → "1,5 M FCFA" | 150 000 → "150 K FCFA" | 500 → "500 FCFA"
 */
export function formatFCFAShort(montant: number): string {
  if (montant >= 1_000_000) {
    const val = montant / 1_000_000
    return (Number.isInteger(val) ? val.toString() : val.toFixed(1).replace(".", ",")) + "\u00A0M FCFA"
  }
  if (montant >= 1_000) {
    const val = montant / 1_000
    return (Number.isInteger(val) ? val.toString() : val.toFixed(1).replace(".", ",")) + "\u00A0K FCFA"
  }
  return montant.toString() + "\u00A0FCFA"
}

/** Formate une date ISO en français — ex : "2026-03-18" → "18 mars 2026" */
export function formatDateFr(dateStr: string): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day:   "numeric",
      month: "long",
      year:  "numeric",
    })
  } catch {
    return dateStr
  }
}
