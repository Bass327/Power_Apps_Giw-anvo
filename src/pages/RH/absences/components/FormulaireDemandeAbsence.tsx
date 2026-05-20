import { useState, useMemo, useEffect, useCallback } from "react"
import {
  X, Loader2, AlertTriangle, ChevronRight, ChevronLeft,
  User, Calendar, FileText, Info, Save, CheckCircle,
} from "lucide-react"
import type { GiwAnvoUser } from "@/types/user"
import type { TypeDemandeAbsence, EvenementFamilial } from "@/types/rh"
import {
  LABEL_TYPE_DEMANDE_ABSENCE,
  LABEL_EVENEMENT_FAMILIAL,
  JOURS_EVENEMENT_FAMILIAL,
} from "@/types/rh"
import { useCreateDemandeAbsence } from "@/hooks/useDemandesAbsences"
import {
  saveDraftAbsence,
  clearDraftAbsence,
  loadDraftAbsence,
  formatSavedAt,
  type DraftAbsenceFormData,
} from "@/lib/draftAbsence"

/* ── Styles partagés ── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
}

const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: "rgba(13,26,16,0.4)",
  color: "var(--text-secondary)",
  cursor: "default",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11,
  color: "var(--text-secondary)", fontFamily: "var(--font-body)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
}

const errorStyle: React.CSSProperties = {
  fontSize: 11, color: "#ef4444",
  fontFamily: "var(--font-body)", marginTop: 5,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-display)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: 14, display: "flex", alignItems: "center", gap: 6,
}

/* ── État initial du formulaire ── */
interface FormData {
  typeDemande:       TypeDemandeAbsence
  typeAbsenceAutre:  string
  evenementFamilial: EvenementFamilial | ""
  motifAbsence:      string
  dateDebut:         string
  dateFin:           string
}

const FORM_INIT: FormData = {
  typeDemande:       "AUTORISATION_SIMPLE",
  typeAbsenceAutre:  "",
  evenementFamilial: "",
  motifAbsence:      "",
  dateDebut:         "",
  dateFin:           "",
}

/* ── Conversion brouillon → FormData ── */
function draftToForm(draft: DraftAbsenceFormData): FormData {
  return {
    typeDemande:       (draft.typeDemande as TypeDemandeAbsence)     || "AUTORISATION_SIMPLE",
    typeAbsenceAutre:  draft.typeAbsenceAutre                         || "",
    evenementFamilial: (draft.evenementFamilial as EvenementFamilial) || "",
    motifAbsence:      draft.motifAbsence                            || "",
    dateDebut:         draft.dateDebut                               || "",
    dateFin:           draft.dateFin                                 || "",
  }
}

/* ════════════════════════════════════════════════
   Composant principal
   ════════════════════════════════════════════════ */

interface Props {
  user:        GiwAnvoUser | null
  onClose:     () => void
  /* Si true, le formulaire s'ouvre avec le brouillon existant */
  restoreDraft?: boolean
}

export function FormulaireDemandeAbsence({ user, onClose, restoreDraft = false }: Props) {
  const email = user?.email ?? ""

  /* ── Initialisation : restaurer le brouillon si demandé ── */
  const initialState = useMemo((): { form: FormData; etape: "formulaire" | "recapitulatif" } => {
    if (restoreDraft && email) {
      const draft = loadDraftAbsence(email)
      if (draft) {
        return { form: draftToForm(draft.formData), etape: draft.etape }
      }
    }
    return { form: FORM_INIT, etape: "formulaire" }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm]   = useState<FormData>(initialState.form)
  const [etape, setEtape] = useState<"formulaire" | "recapitulatif">(initialState.etape)

  /* Indicateur de sauvegarde : "idle" | "saving" | "saved" */
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string>("")

  const { mutate: soumettre, isPending } = useCreateDemandeAbsence()

  /* ── Sauvegarde automatique debounced (600ms) ── */
  useEffect(() => {
    if (!email) return

    setSaveStatus("saving")
    const timer = setTimeout(() => {
      saveDraftAbsence(email, form, etape)
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
      /* Repasse en idle après 2s */
      const reset = setTimeout(() => setSaveStatus("idle"), 2000)
      return () => clearTimeout(reset)
    }, 600)

    return () => clearTimeout(timer)
  }, [form, etape, email])

  /* ── Calculs automatiques ── */
  const nbJoursDemandes = useMemo(() => {
    if (!form.dateDebut || !form.dateFin) return 0
    const debut = new Date(form.dateDebut)
    const fin   = new Date(form.dateFin)
    if (fin < debut) return 0
    return Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [form.dateDebut, form.dateFin])

  const nbJoursAutorises = useMemo(() => {
    if (form.typeDemande !== "EVENEMENT_FAMILIAL" || !form.evenementFamilial) return undefined
    return JOURS_EVENEMENT_FAMILIAL[form.evenementFamilial as EvenementFamilial]
  }, [form.typeDemande, form.evenementFamilial])

  const depassementJours =
    form.typeDemande === "EVENEMENT_FAMILIAL" &&
    nbJoursAutorises !== undefined &&
    nbJoursDemandes > nbJoursAutorises

  /* ── Validation ── */
  const errors = useMemo(() => {
    const errs: Record<string, string> = {}
    if (!form.motifAbsence.trim())
      errs.motifAbsence = "Le motif est obligatoire."
    if (!form.dateDebut)
      errs.dateDebut = "La date de début est obligatoire."
    if (!form.dateFin)
      errs.dateFin = "La date de fin est obligatoire."
    if (form.dateDebut && form.dateFin && form.dateFin < form.dateDebut)
      errs.dates = "La date de fin ne peut pas être antérieure à la date de début."
    if (form.typeDemande === "EVENEMENT_FAMILIAL" && !form.evenementFamilial)
      errs.evenementFamilial = "Veuillez sélectionner l'événement familial."
    if (form.typeDemande === "AUTRE" && !form.typeAbsenceAutre.trim())
      errs.typeAbsenceAutre = "Veuillez préciser le type d'absence."
    return errs
  }, [form])

  const formulaireValide =
    Object.keys(errors).length === 0 &&
    !!form.dateDebut &&
    !!form.dateFin &&
    !!form.motifAbsence.trim()

  /* ── Handlers ── */
  const champ = useCallback(
    <K extends keyof FormData>(key: K) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }))
      },
    [],
  )

  function allerAuRecapitulatif(e: React.FormEvent) {
    e.preventDefault()
    if (formulaireValide) setEtape("recapitulatif")
  }

  function handleSoumettre() {
    soumettre(
      {
        demandeur:         email,
        nomDemandeur:      (user?.nomComplet || user?.displayName)  ?? "",
        departement:       user?.departement                        ?? "",
        poste:             user?.poste      || user?.jobTitle       || undefined,
        typeDemande:       form.typeDemande,
        typeAbsenceAutre:  form.typeAbsenceAutre.trim() || undefined,
        evenementFamilial: form.evenementFamilial
          ? (form.evenementFamilial as EvenementFamilial)
          : undefined,
        motifAbsence:      form.motifAbsence.trim(),
        dateDebut:         form.dateDebut,
        dateFin:           form.dateFin,
        nbJoursDemandes,
        nbJoursAutorises,
      },
      {
        onSuccess: () => {
          /* Effacer le brouillon après soumission réussie */
          clearDraftAbsence(email)
          onClose()
        },
      },
    )
  }

  /* Abandonner le brouillon et fermer */
  function handleAbandonner() {
    clearDraftAbsence(email)
    onClose()
  }

  const dateAujourdHui = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  })

  /* ── Indicateur de sauvegarde automatique ── */
  function SaveIndicator() {
    if (saveStatus === "saving") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
          Enregistrement…
        </div>
      )
    }
    if (saveStatus === "saved") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e", fontFamily: "var(--font-body)" }}>
          <CheckCircle size={11} />
          Brouillon enregistré
        </div>
      )
    }
    if (lastSavedAt) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          <Save size={11} />
          Sauvegardé à {formatSavedAt(lastSavedAt)}
        </div>
      )
    }
    return null
  }

  /* ════ ÉTAPE 1 — FORMULAIRE ════ */
  if (etape === "formulaire") {
    return (
      <ModalWrapper onClose={onClose} fermerDesactive={isPending}>
        {/* En-tête avec indicateur de sauvegarde */}
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              Demande d'autorisation d'absence
            </h2>
            <div style={{ marginTop: 4 }}>
              <SaveIndicator />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <form onSubmit={allerAuRecapitulatif} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>

          {/* ── Section 1 : Informations demandeur ── */}
          <section>
            <p style={sectionTitleStyle}>
              <User size={13} />
              Informations demandeur
            </p>
            <div style={{ background: "rgba(45,158,95,0.06)", border: "1px solid rgba(45,158,95,0.18)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Nom complet</label>
                  <input readOnly value={user?.nomComplet || user?.displayName || "—"} style={inputReadonlyStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Département</label>
                  <input readOnly value={user?.departement || "—"} style={inputReadonlyStyle} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Poste / Fonction</label>
                  <input readOnly value={user?.poste || user?.jobTitle || "—"} style={inputReadonlyStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date de la demande</label>
                  <input readOnly value={dateAujourdHui} style={inputReadonlyStyle} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
                <Info size={11} />
                Informations récupérées automatiquement depuis votre profil GIW'ANVO.
              </p>
            </div>
          </section>

          {/* ── Section 2 : Type d'absence ── */}
          <section>
            <p style={sectionTitleStyle}>
              <FileText size={13} />
              Type d'absence
            </p>
            <div>
              <label style={labelStyle}>Type de demande *</label>
              <select value={form.typeDemande} onChange={champ("typeDemande")} style={inputStyle} required>
                {(Object.entries(LABEL_TYPE_DEMANDE_ABSENCE) as [TypeDemandeAbsence, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {form.typeDemande === "AUTRE" && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Précisez le type d'absence *</label>
                <input
                  type="text"
                  value={form.typeAbsenceAutre}
                  onChange={champ("typeAbsenceAutre")}
                  placeholder="Veuillez préciser votre type d'absence."
                  maxLength={200}
                  style={{ ...inputStyle, borderColor: errors.typeAbsenceAutre ? "#ef4444" : "var(--bg-border)" }}
                />
                {errors.typeAbsenceAutre && <p style={errorStyle}>{errors.typeAbsenceAutre}</p>}
              </div>
            )}
          </section>

          {/* ── Section 3 : Événement familial (conditionnel) ── */}
          {form.typeDemande === "EVENEMENT_FAMILIAL" && (
            <section>
              <p style={sectionTitleStyle}>Événement familial</p>
              <div>
                <label style={labelStyle}>Type d'événement *</label>
                <select
                  value={form.evenementFamilial}
                  onChange={champ("evenementFamilial")}
                  style={{ ...inputStyle, borderColor: errors.evenementFamilial ? "#ef4444" : "var(--bg-border)" }}
                  required
                >
                  <option value="">— Sélectionner l'événement —</option>
                  {(Object.entries(LABEL_EVENEMENT_FAMILIAL) as [EvenementFamilial, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {errors.evenementFamilial && <p style={errorStyle}>{errors.evenementFamilial}</p>}
              </div>

              {nbJoursAutorises !== undefined && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Info size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    Jours autorisés pour cet événement :{" "}
                    <strong style={{ color: "#22c55e", fontFamily: "var(--font-display)" }}>
                      {nbJoursAutorises} jour{nbJoursAutorises > 1 ? "s" : ""}
                    </strong>
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Section 4 : Motif ── */}
          <section>
            <p style={sectionTitleStyle}>
              <FileText size={13} />
              Motif
            </p>
            <div>
              <label style={labelStyle}>Motif de l'absence *</label>
              <textarea
                rows={3}
                value={form.motifAbsence}
                onChange={champ("motifAbsence")}
                placeholder="Veuillez préciser brièvement le motif de votre absence."
                style={{ ...inputStyle, resize: "vertical", borderColor: errors.motifAbsence ? "#ef4444" : "var(--bg-border)" }}
                required
              />
              {errors.motifAbsence && <p style={errorStyle}>{errors.motifAbsence}</p>}
            </div>
          </section>

          {/* ── Section 5 : Période d'absence ── */}
          <section>
            <p style={sectionTitleStyle}>
              <Calendar size={13} />
              Période d'absence
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Date de début *</label>
                <input
                  type="date"
                  value={form.dateDebut}
                  onChange={champ("dateDebut")}
                  style={{ ...inputStyle, borderColor: errors.dateDebut ? "#ef4444" : "var(--bg-border)" }}
                  required
                />
                {errors.dateDebut && <p style={errorStyle}>{errors.dateDebut}</p>}
              </div>
              <div>
                <label style={labelStyle}>Date de fin *</label>
                <input
                  type="date"
                  value={form.dateFin}
                  onChange={champ("dateFin")}
                  min={form.dateDebut || undefined}
                  style={{ ...inputStyle, borderColor: (errors.dateFin || errors.dates) ? "#ef4444" : "var(--bg-border)" }}
                  required
                />
                {(errors.dateFin || errors.dates) && (
                  <p style={errorStyle}>{errors.dates ?? errors.dateFin}</p>
                )}
              </div>
            </div>

            {nbJoursDemandes > 0 && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Durée calculée :{" "}
                  <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {nbJoursDemandes} jour{nbJoursDemandes > 1 ? "s" : ""}
                  </strong>
                </p>
              </div>
            )}

            {depassementJours && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#f59e0b", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                  Attention : le nombre de jours demandés ({nbJoursDemandes}) dépasse le nombre de jours autorisés ({nbJoursAutorises}) pour cet événement. La Direction Générale pourra ajuster ou refuser la demande.
                </p>
              </div>
            )}
          </section>

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleAbandonner}
              style={{ all: "unset", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)", color: "var(--text-muted)", textDecoration: "underline", textDecorationStyle: "dotted" }}
            >
              Abandonner le brouillon
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ all: "unset", cursor: "pointer", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={!formulaireValide}
                style={{ all: "unset", cursor: formulaireValide ? "pointer" : "not-allowed", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: formulaireValide ? "linear-gradient(135deg,#f0a500,#ffc235)" : "var(--bg-elevated)", opacity: formulaireValide ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6, transition: "all 150ms" }}
              >
                Vérifier et soumettre
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </form>
      </ModalWrapper>
    )
  }

  /* ════ ÉTAPE 2 — RÉCAPITULATIF ════ */
  return (
    <ModalWrapper onClose={onClose} fermerDesactive={isPending}>
      <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Récapitulatif de la demande
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Vérifiez avant d'envoyer à la Direction Générale
          </p>
        </div>
        <button onClick={onClose} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={15} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>

        <div style={{ padding: "14px 16px", background: "rgba(45,158,95,0.06)", border: "1px solid rgba(45,158,95,0.18)", borderRadius: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Nom complet",      value: user?.nomComplet || user?.displayName || "—" },
              { label: "Département",      value: user?.departement || "—" },
              { label: "Poste / Fonction", value: user?.poste || user?.jobTitle || "—" },
              { label: "Type d'absence",   value: LABEL_TYPE_DEMANDE_ABSENCE[form.typeDemande] },
              ...(form.typeDemande === "AUTRE" && form.typeAbsenceAutre
                ? [{ label: "Précision", value: form.typeAbsenceAutre }]
                : []),
              ...(form.typeDemande === "EVENEMENT_FAMILIAL" && form.evenementFamilial
                ? [{ label: "Événement familial", value: LABEL_EVENEMENT_FAMILIAL[form.evenementFamilial as EvenementFamilial] }]
                : []),
              { label: "Motif",            value: form.motifAbsence },
              { label: "Date de début",    value: formatDate(form.dateDebut) },
              { label: "Date de fin",      value: formatDate(form.dateFin) },
              { label: "Jours demandés",   value: `${nbJoursDemandes} jour${nbJoursDemandes > 1 ? "s" : ""}` },
              ...(nbJoursAutorises !== undefined
                ? [{ label: "Jours autorisés", value: `${nbJoursAutorises} jour${nbJoursAutorises > 1 ? "s" : ""}` }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ minWidth: 165, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)", fontWeight: 500, wordBreak: "break-word" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {depassementJours && (
          <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: "#f59e0b", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
              Attention : le nombre de jours demandés ({nbJoursDemandes}) dépasse le nombre de jours autorisés ({nbJoursAutorises}) pour cet événement.
            </p>
          </div>
        )}

        {/* Notice notifications */}
        <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.20)", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Info size={14} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#60a5fa", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
            La Direction Générale recevra une notification Teams. Vous serez notifié(e) dès qu'une décision sera prise.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setEtape("formulaire")}
            disabled={isPending}
            style={{ all: "unset", cursor: "pointer", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", display: "flex", alignItems: "center", gap: 6 }}
          >
            <ChevronLeft size={14} />
            Modifier
          </button>
          <button
            type="button"
            onClick={handleSoumettre}
            disabled={isPending}
            style={{ all: "unset", cursor: isPending ? "default" : "pointer", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", display: "flex", alignItems: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}
          >
            {isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            Soumettre à la Direction Générale
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}

/* ── Sous-composants ── */

function ModalWrapper({
  children,
  onClose,
  fermerDesactive,
}: {
  children:         React.ReactNode
  onClose:          () => void
  fermerDesactive?: boolean
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget && !fermerDesactive) onClose() }}
    >
      <div style={{ width: "100%", maxWidth: 580, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16, display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        {children}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  })
}
