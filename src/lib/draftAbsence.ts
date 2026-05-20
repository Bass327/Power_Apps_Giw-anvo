/**
 * Sauvegarde automatique du formulaire de demande d'autorisation d'absence.
 *
 * - Clé localStorage unique par email (encodée en base64) → pas de collision entre utilisateurs
 * - Données effacées automatiquement après soumission réussie
 * - Aucune donnée sensible envoyée sur un serveur — stockage 100 % local
 */

export interface DraftAbsenceFormData {
  typeDemande:       string
  typeAbsenceAutre:  string
  evenementFamilial: string
  motifAbsence:      string
  dateDebut:         string
  dateFin:           string
}

export interface DraftAbsence {
  formData: DraftAbsenceFormData
  etape:    "formulaire" | "recapitulatif"
  savedAt:  string   // ISO timestamp
  email:    string   // pour vérification à la restauration
}

/* Clé spécifique à l'utilisateur — encodée pour éviter les caractères spéciaux */
function buildKey(email: string): string {
  try {
    return `giwanvo_draft_abs_${btoa(email.toLowerCase().trim())}`
  } catch {
    return `giwanvo_draft_abs_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
  }
}

export function saveDraftAbsence(
  email:    string,
  formData: DraftAbsenceFormData,
  etape:    "formulaire" | "recapitulatif",
): void {
  if (!email) return
  try {
    const draft: DraftAbsence = {
      formData,
      etape,
      savedAt: new Date().toISOString(),
      email,
    }
    localStorage.setItem(buildKey(email), JSON.stringify(draft))
  } catch {
    /* silencieux — stockage saturé ou désactivé */
  }
}

export function loadDraftAbsence(email: string): DraftAbsence | null {
  if (!email) return null
  try {
    const raw = localStorage.getItem(buildKey(email))
    if (!raw) return null
    const draft = JSON.parse(raw) as DraftAbsence
    /* Vérification de cohérence : le brouillon appartient bien à cet utilisateur */
    if (draft.email !== email) return null
    return draft
  } catch {
    return null
  }
}

export function clearDraftAbsence(email: string): void {
  if (!email) return
  try {
    localStorage.removeItem(buildKey(email))
  } catch { /* silencieux */ }
}

export function hasDraftAbsence(email: string): boolean {
  return loadDraftAbsence(email) !== null
}

/** Formate l'heure de sauvegarde pour l'affichage */
export function formatSavedAt(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return ""
  }
}
