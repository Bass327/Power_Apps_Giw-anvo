import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formate un montant en FCFA — ex : 1500000 → "1 500 000 FCFA" */
export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat("fr-FR").format(montant) + "\u00A0FCFA"
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
