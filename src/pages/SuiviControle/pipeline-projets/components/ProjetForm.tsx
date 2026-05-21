import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft, Save, ChevronRight, ChevronLeft,
  FileText, Briefcase, Zap, DollarSign, Users, Calendar,
  Check, Loader2, AlertCircle, MapPin, Hash, Building2,
  TrendingUp, BatteryCharging, AlertTriangle, User,
  StickyNote, Milestone, RotateCcw, Clock, Flame,
  CircleDot, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { useProjets, useCreateProjet, useUpdateProjet } from "@/hooks/usePipeline"
import {
  PHASES_PIPELINE, STATUTS_PROJET, PRIORITES,
  BUSINESS_MODELS, BUSINESS_UNITS, DIVISIONS,
  SECTEURS_ACTIVITE, CAS_UTILISATION,
  REGIONS_SENEGAL,
  PHASE_COLORS, PRIORITE_COLORS,
  PHASES_CANCELLED,
  formatFCFA, formatKwp,
} from "@/types/pipeline"
import type { PhaseProjet, StatutProjet, Priorite, BusinessModel, ProjetPipeline } from "@/types/pipeline"

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface FormData {
  // Étape 1 — Général
  titre:                 string
  codeProjet:            string
  region:                string
  description:           string
  partenaire:            string
  // Étape 2 — Business
  phase:                 PhaseProjet | ""
  statut:                StatutProjet | ""
  priorite:              Priorite | ""
  businessModel:         BusinessModel | ""
  division:              string
  businessUnit:          string
  secteurActivite:       string
  casUtilisation:        string
  // Étape 3 — Technique
  puissanceKwp:          string
  batterieIncluse:       boolean
  capaciteBatterieKwh:   string
  // Étape 4 — Financement
  financementNecessaire: boolean
  montantFinancement:    string
  sourceFinancement:     string
  revenusAnnuelsPrevus:  string
  // Étape 5 — Responsables
  chefProjet:            string
  responsableCommercial: string
  responsableFinance:    string
  responsableTechnique:  string
  autresIntervenants:    string
  notes:                 string
  // Étape 6 — Échéances
  dateDebutPrevu:        string
  dateFinPrevu:          string
  dateProchaineEtape:    string
  prochaineEtapeLabel:   string
  commentaireEcheance:   string
  dateSignatureContrat:  string
  progression:           number
}

type FieldErrors = Partial<Record<keyof FormData, string>>

/* ═══════════════════════════════════════════════════════════════════
   Constantes
   ═══════════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, label: "Général",      icon: FileText,   desc: "Identité du projet"    },
  { id: 2, label: "Business",     icon: Briefcase,  desc: "Phase & modèle"        },
  { id: 3, label: "Technique",    icon: Zap,        desc: "Puissance & stockage"  },
  { id: 4, label: "Financement",  icon: DollarSign, desc: "Budget & revenus"      },
  { id: 5, label: "Responsables", icon: Users,      desc: "Équipe & notes"        },
  { id: 6, label: "Récapitulatif",icon: Calendar,   desc: "Dates & validation"    },
] as const

const EMPTY_FORM: FormData = {
  titre: "", codeProjet: "", region: "", description: "", partenaire: "",
  phase: "", statut: "Actif", priorite: "", businessModel: "",
  division: "", businessUnit: "", secteurActivite: "", casUtilisation: "",
  puissanceKwp: "", batterieIncluse: false, capaciteBatterieKwh: "",
  financementNecessaire: false, montantFinancement: "", sourceFinancement: "",
  revenusAnnuelsPrevus: "",
  chefProjet: "", responsableCommercial: "", responsableFinance: "",
  responsableTechnique: "", autresIntervenants: "", notes: "",
  dateDebutPrevu: "", dateFinPrevu: "", dateProchaineEtape: "",
  prochaineEtapeLabel: "", commentaireEcheance: "",
  dateSignatureContrat: "", progression: 0,
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function projetToForm(p: ProjetPipeline): FormData {
  return {
    titre: p.titre, codeProjet: p.codeProjet, region: p.region,
    description: p.description, partenaire: p.partenaire,
    phase: p.phase, statut: p.statut, priorite: p.priorite,
    businessModel: p.businessModel,
    division:        p.division        ?? "",
    businessUnit:    p.businessUnit    ?? "",
    secteurActivite: p.secteurActivite ?? "",
    casUtilisation:  p.casUtilisation  ?? "",
    puissanceKwp:        p.puissanceKwp        ? String(p.puissanceKwp)        : "",
    batterieIncluse:     p.batterieIncluse,
    capaciteBatterieKwh: p.capaciteBatterieKwh ? String(p.capaciteBatterieKwh) : "",
    financementNecessaire: p.financementNecessaire,
    montantFinancement:  p.montantFinancement   ? String(p.montantFinancement)   : "",
    sourceFinancement:   p.sourceFinancement,
    revenusAnnuelsPrevus:p.revenusAnnuelsPrevus ? String(p.revenusAnnuelsPrevus) : "",
    chefProjet:            p.chefProjet,
    responsableCommercial: p.responsableCommercial ?? "",
    responsableFinance:    p.responsableFinance    ?? "",
    responsableTechnique:  p.responsableTechnique  ?? "",
    autresIntervenants:    p.autresIntervenants    ?? "",
    notes:                 p.notes,
    dateDebutPrevu:      p.dateDebutPrevu,
    dateFinPrevu:        p.dateFinPrevu,
    dateProchaineEtape:  p.dateProchaineEtape,
    prochaineEtapeLabel: p.prochaineEtapeLabel  ?? "",
    commentaireEcheance: p.commentaireEcheance  ?? "",
    dateSignatureContrat: p.dateSignatureContrat,
    progression: p.progression,
  }
}

function validateStep(step: number, d: FormData): FieldErrors {
  const e: FieldErrors = {}
  if (step === 1) {
    if (!d.titre.trim())      e.titre      = "Le titre est obligatoire"
    if (!d.codeProjet.trim()) e.codeProjet = "Le code projet est obligatoire"
    if (!d.region)            e.region     = "La région est obligatoire"
  }
  if (step === 2) {
    if (!d.phase)    e.phase    = "La phase est obligatoire"
    if (!d.priorite) e.priorite = "La priorité est obligatoire"
  }
  return e
}

function getCompletionPct(d: FormData): number {
  const checks = [
    !!d.titre, !!d.codeProjet, !!d.region, !!d.phase, !!d.priorite,
    !!d.businessModel, !!d.puissanceKwp, !!d.chefProjet,
    !!d.dateDebutPrevu, !!d.dateFinPrevu,
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function isPastDate(iso: string): boolean {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function getKwpCategory(kwp: number): { label: string; color: string } | null {
  if (!kwp) return null
  if (kwp < 50)  return { label: "Petite installation (< 50 kWp)",    color: "#60a5fa" }
  if (kwp <= 500) return { label: "Installation moyenne (50–500 kWp)", color: "#f0a500" }
  return { label: "Grande installation (> 500 kWp)", color: "#34d399" }
}

/* ═══════════════════════════════════════════════════════════════════
   Composants UI partagés
   ═══════════════════════════════════════════════════════════════════ */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
      style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}>
      {children}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>{children}</p>
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#f87171", fontFamily: "'DM Sans', sans-serif" }}>
      <AlertCircle size={10} />{msg}
    </p>
  )
}

interface InputProps {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        string
  error?:       string
  disabled?:    boolean
  icon?:        React.ElementType
  suffix?:      string
}

function TextInput({ value, onChange, placeholder, type = "text", error, disabled, icon: Icon, suffix }: InputProps) {
  const [focused, setFocused] = useState(false)
  const borderColor = error ? "rgba(239,68,68,0.6)" : focused ? "#2d9e5f" : "var(--bg-border)"

  return (
    <div>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 pointer-events-none">
            <Icon size={14} style={{ color: focused ? "#2d9e5f" : "var(--text-muted)" }} />
          </div>
        )}
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-xl py-2.5 text-sm transition-all duration-150"
          style={{
            paddingLeft:  Icon ? "2.25rem" : "1rem",
            paddingRight: suffix ? "3.5rem" : "1rem",
            background:   "var(--bg-elevated)",
            border:       `1px solid ${borderColor}`,
            color:        "var(--text-primary)",
            outline:      "none",
            opacity:      disabled ? 0.5 : 1,
            boxShadow:    focused ? `0 0 0 3px ${error ? "rgba(239,68,68,0.08)" : "rgba(45,158,95,0.08)"}` : "none",
            fontFamily:   "'DM Sans', sans-serif",
          }}
        />
        {suffix && (
          <span className="absolute right-3 text-xs pointer-events-none"
            style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            {suffix}
          </span>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  )
}

function TextareaInput({ value, onChange, placeholder, rows = 3 }:
  { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [focused, setFocused] = useState(false)

  return (
    <textarea
      value={value} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-150 resize-none"
      style={{
        background:  "var(--bg-elevated)",
        border:      `1px solid ${focused ? "#2d9e5f" : "var(--bg-border)"}`,
        color:       "var(--text-primary)",
        outline:     "none",
        boxShadow:   focused ? "0 0 0 3px rgba(45,158,95,0.08)" : "none",
        fontFamily:  "'DM Sans', sans-serif",
      }}
    />
  )
}

function SelectInput({ value, onChange, options, placeholder, error, icon: Icon }:
  { value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
    placeholder?: string; error?: string; icon?: React.ElementType }) {
  const [focused, setFocused] = useState(false)
  const borderColor = error ? "rgba(239,68,68,0.6)" : focused ? "#2d9e5f" : "var(--bg-border)"

  return (
    <div>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon size={14} style={{ color: focused ? "#2d9e5f" : "var(--text-muted)" }} />
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-xl py-2.5 text-sm transition-all duration-150 appearance-none"
          style={{
            paddingLeft:  Icon ? "2.25rem" : "1rem",
            paddingRight: "2rem",
            background:   "var(--bg-elevated)",
            border:       `1px solid ${borderColor}`,
            color:        value ? "var(--text-primary)" : "var(--text-muted)",
            outline:      "none",
            cursor:       "pointer",
            boxShadow:    focused ? `0 0 0 3px ${error ? "rgba(239,68,68,0.08)" : "rgba(45,158,95,0.08)"}` : "none",
            fontFamily:   "'DM Sans', sans-serif",
          }}
        >
          {placeholder && <option value="" style={{ color: "var(--text-muted)" }}>{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>
      <FieldError msg={error} />
    </div>
  )
}

function ToggleField({ label, checked, onChange, description }:
  { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left transition-all duration-150"
      style={{
        background: checked ? "rgba(240,165,0,0.08)" : "var(--bg-elevated)",
        border:     checked ? "1px solid rgba(240,165,0,0.35)" : "1px solid var(--bg-border)",
      }}>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: checked ? "#f0a500" : "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
          {label}
        </p>
        {description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>{description}</p>}
      </div>
      <div className="w-11 h-6 rounded-full flex-shrink-0 transition-all duration-200 relative"
        style={{ background: checked ? "#f0a500" : "rgba(107,114,128,0.3)" }}>
        <div className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
          style={{ background: "#fff", left: checked ? "calc(100% - 1.25rem)" : "0.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Pipeline Timeline visuelle
   ═══════════════════════════════════════════════════════════════════ */

function PipelineTimeline({ currentPhase, onSelect }:
  { currentPhase: PhaseProjet | ""; onSelect: (p: PhaseProjet) => void }) {
  const currentIdx = currentPhase ? PHASES_PIPELINE.indexOf(currentPhase as PhaseProjet) : -1

  return (
    <div className="space-y-1.5">
      {PHASES_PIPELINE.map((phase, idx) => {
        const isActive    = phase === currentPhase
        const isDone      = currentIdx > -1 && idx < currentIdx && !PHASES_CANCELLED.includes(phase)
        const isCancelled = PHASES_CANCELLED.includes(phase)
        const colors      = PHASE_COLORS[phase as PhaseProjet]

        return (
          <button
            key={phase}
            type="button"
            onClick={() => onSelect(phase as PhaseProjet)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
            style={{
              background: isActive ? colors.bg : isDone ? "rgba(45,158,95,0.05)" : "transparent",
              border:     isActive ? `1px solid ${colors.border}` : "1px solid transparent",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent" }}
          >
            {/* Node */}
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                background: isActive ? colors.bg : isDone ? "rgba(45,158,95,0.15)" : "var(--bg-elevated)",
                border:     isActive ? `2px solid ${colors.text}` : isDone ? "2px solid #2d9e5f" : "1px solid var(--bg-border)",
              }}>
              {isDone
                ? <Check size={10} style={{ color: "#2d9e5f" }} />
                : isCancelled
                  ? <span style={{ fontSize: 9, color: isActive ? colors.text : "var(--text-muted)" }}>✕</span>
                  : <CircleDot size={8} style={{ color: isActive ? colors.text : "var(--text-muted)" }} />
              }
            </div>

            {/* Numéro + label (affiché tel quel — il contient déjà le numéro dans le nom) */}
            <div className="flex items-center min-w-0 flex-1">
              <span className="text-sm truncate"
                style={{ color: isActive ? colors.text : isDone ? "var(--text-secondary)" : "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                {phase}
              </span>
            </div>

            {isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
                style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontFamily: "'Syne', sans-serif" }}>
                Actuelle
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Carte récapitulative latérale
   ═══════════════════════════════════════════════════════════════════ */

function SummaryCard({ formData, currentStep }: { formData: FormData; currentStep: number }) {
  const pct        = getCompletionPct(formData)
  const kwp        = parseFloat(formData.puissanceKwp) || 0
  const kwpCat     = getKwpCategory(kwp)
  const phaseColor = formData.phase ? PHASE_COLORS[formData.phase as PhaseProjet] : null
  const prioColor  = formData.priorite ? PRIORITE_COLORS[formData.priorite as Priorite] : null
  const montant    = parseFloat(formData.montantFinancement) || 0

  return (
    <div className="rounded-2xl overflow-hidden sticky top-6"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
            Résumé projet
          </span>
          {/* Completion ring */}
          <div className="relative w-9 h-9">
            <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" style={{ stroke: "var(--bg-border)" }} />
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                strokeLinecap="round"
                style={{
                  stroke: pct === 100 ? "#22c55e" : "#f0a500",
                  strokeDasharray: `${2 * Math.PI * 14}`,
                  strokeDashoffset: `${2 * Math.PI * 14 * (1 - pct / 100)}`,
                  transition: "stroke-dashoffset 0.4s ease",
                }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: pct === 100 ? "#22c55e" : "#f0a500", fontFamily: "'Syne', sans-serif", fontSize: 9 }}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Badges intelligents */}
        <div className="flex flex-wrap gap-1.5">
          {formData.priorite === "Critique" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)", fontFamily: "'Syne', sans-serif" }}>
              <Flame size={9} /> Projet critique
            </span>
          )}
          {formData.financementNecessaire && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.3)", fontFamily: "'Syne', sans-serif" }}>
              <DollarSign size={9} /> Financement requis
            </span>
          )}
          {formData.batterieIncluse && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", fontFamily: "'Syne', sans-serif" }}>
              <BatteryCharging size={9} /> Batterie
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3">

        {/* Nom */}
        <div>
          <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Titre</p>
          <p className="text-sm font-semibold leading-tight" style={{ color: formData.titre ? "var(--text-primary)" : "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
            {formData.titre || "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Code */}
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Code</p>
            <p className="text-xs font-mono font-bold" style={{ color: formData.codeProjet ? "#f0a500" : "var(--text-muted)" }}>
              {formData.codeProjet || "—"}
            </p>
          </div>
          {/* Région */}
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Région</p>
            <p className="text-xs" style={{ color: formData.region ? "var(--text-secondary)" : "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
              {formData.region || "—"}
            </p>
          </div>
        </div>

        {/* Phase */}
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Phase</p>
          {phaseColor && formData.phase ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: phaseColor.bg, color: phaseColor.text, border: `1px solid ${phaseColor.border}`, fontFamily: "'Syne', sans-serif" }}>
              <CircleDot size={9} />{formData.phase}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>—</span>
          )}
        </div>

        {/* Priorité */}
        {prioColor && formData.priorite && (
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Priorité</p>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: prioColor.bg, color: prioColor.text, border: `1px solid ${prioColor.border}`, fontFamily: "'Syne', sans-serif" }}>
              {formData.priorite}
            </span>
          </div>
        )}

        {/* Puissance */}
        {kwp > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Puissance</p>
            <p className="text-sm font-bold" style={{ color: "#3dbf72", fontFamily: "'Syne', sans-serif" }}>{formatKwp(kwp)}</p>
            {kwpCat && (
              <span className="text-xs" style={{ color: kwpCat.color, fontFamily: "'DM Sans', sans-serif" }}>{kwpCat.label}</span>
            )}
          </div>
        )}

        {/* Financement */}
        {formData.financementNecessaire && montant > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Financement</p>
            <p className="text-sm font-bold" style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}>{formatFCFA(montant)}</p>
          </div>
        )}

        {/* Chef de projet */}
        {formData.chefProjet && (
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Chef de projet</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(45,158,95,0.2)", border: "1px solid rgba(45,158,95,0.35)" }}>
                <User size={9} style={{ color: "#2d9e5f" }} />
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>{formData.chefProjet}</p>
            </div>
          </div>
        )}

        {/* Alerte date passée */}
        {isPastDate(formData.dateProchaineEtape) && formData.dateProchaineEtape && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
            <p className="text-xs" style={{ color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
              Prochaine étape dépassée
            </p>
          </div>
        )}
      </div>

      {/* Progression étape */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            Étape {currentStep}/{STEPS.length}
          </span>
          <span className="text-xs font-semibold" style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}>{pct}% complété</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : "linear-gradient(90deg, #f0a500, #ffc235)" }} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Récapitulatif final (étape 6)
   ═══════════════════════════════════════════════════════════════════ */

function RecapField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: color ?? "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>{value || "—"}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Composant principal
   ═══════════════════════════════════════════════════════════════════ */

export default function ProjetFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id?: string }>()
  const isEdit   = !!id

  const { data: projets = [] } = useProjets()
  const projetExistant = isEdit ? projets.find((p) => p.id === id) : undefined

  const DRAFT_KEY = isEdit ? `pipeline-draft-${id}` : "pipeline-draft-nouveau"

  const [step,          setStep]          = useState(1)
  const [formData,      setFormData]      = useState<FormData>(EMPTY_FORM)
  const [errors,        setErrors]        = useState<FieldErrors>({})
  const [isDirty,       setIsDirty]       = useState(false)
  const [lastSaved,     setLastSaved]     = useState<string | null>(null)
  const [summaryOpen,   setSummaryOpen]   = useState(false) // mobile toggle
  const [isTransitioning, setIsTransitioning] = useState(false)

  const createMutation = useCreateProjet()
  const updateMutation = useUpdateProjet()
  const isSubmitting   = createMutation.isPending || updateMutation.isPending

  // Init depuis projet existant ou brouillon
  useEffect(() => {
    if (projetExistant) { setFormData(projetToForm(projetExistant)); return }
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try { setFormData(JSON.parse(draft) as FormData); setLastSaved("Brouillon restauré") }
      catch { /* corrompu */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, projetExistant])

  // Autosave 1.5s
  useEffect(() => {
    if (!isDirty) return
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
      const n = new Date()
      setLastSaved(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`)
    }, 1500)
    return () => clearTimeout(t)
  }, [formData, isDirty, DRAFT_KEY])

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((p) => ({ ...p, [key]: value }))
    setErrors((p)   => ({ ...p, [key]: undefined }))
    setIsDirty(true)
  }, [])

  function animateAndGo(newStep: number) {
    setIsTransitioning(true)
    setTimeout(() => { setStep(newStep); setIsTransitioning(false) }, 180)
  }

  function goNext() {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); return }
    setErrors({})
    animateAndGo(Math.min(6, step + 1))
  }

  function goBack() {
    setErrors({})
    animateAndGo(Math.max(1, step - 1))
  }

  function resetDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setFormData(EMPTY_FORM)
    setLastSaved(null)
    setIsDirty(false)
    setStep(1)
    toast.success("Brouillon réinitialisé")
  }

  async function handleSubmit() {
    const allErrors = { ...validateStep(1, formData), ...validateStep(2, formData) }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      if (allErrors.titre || allErrors.codeProjet || allErrors.region) setStep(1)
      else if (allErrors.phase || allErrors.priorite) setStep(2)
      toast.error("Veuillez corriger les champs obligatoires")
      return
    }

    const payload: Omit<ProjetPipeline, "id" | "created" | "modified"> = {
      titre:                 formData.titre.trim(),
      codeProjet:            formData.codeProjet.trim(),
      region:                formData.region,
      description:           formData.description,
      partenaire:            formData.partenaire,
      phase:                 formData.phase as PhaseProjet,
      statut:                (formData.statut as StatutProjet) || "Actif",
      priorite:              formData.priorite as Priorite,
      businessModel:         (formData.businessModel as BusinessModel) || "Consulting / Conseil",
      division:              formData.division  || undefined,
      businessUnit:          formData.businessUnit || undefined,
      secteurActivite:       formData.secteurActivite || undefined,
      casUtilisation:        formData.casUtilisation || undefined,
      puissanceKwp:          parseFloat(formData.puissanceKwp)         || 0,
      batterieIncluse:       formData.batterieIncluse,
      capaciteBatterieKwh:   parseFloat(formData.capaciteBatterieKwh)  || 0,
      financementNecessaire: formData.financementNecessaire,
      montantFinancement:    parseFloat(formData.montantFinancement)    || 0,
      sourceFinancement:     formData.sourceFinancement,
      revenusAnnuelsPrevus:  parseFloat(formData.revenusAnnuelsPrevus) || 0,
      chefProjet:            formData.chefProjet,
      responsableCommercial: formData.responsableCommercial || undefined,
      responsableFinance:    formData.responsableFinance    || undefined,
      responsableTechnique:  formData.responsableTechnique  || undefined,
      autresIntervenants:    formData.autresIntervenants    || undefined,
      notes:                 formData.notes,
      dateDebutPrevu:        formData.dateDebutPrevu,
      dateFinPrevu:          formData.dateFinPrevu,
      dateProchaineEtape:    formData.dateProchaineEtape,
      prochaineEtapeLabel:   formData.prochaineEtapeLabel   || undefined,
      commentaireEcheance:   formData.commentaireEcheance   || undefined,
      dateSignatureContrat:  formData.dateSignatureContrat,
      progression:           formData.progression,
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, fields: payload, logMessage: `Projet modifié — ${payload.phase}` })
        localStorage.removeItem(DRAFT_KEY)
        navigate(`/suivi/pipeline-projets/projets/${id}`)
      } else {
        const created = await createMutation.mutateAsync(payload)
        localStorage.removeItem(DRAFT_KEY)
        navigate(`/suivi/pipeline-projets/projets/${created.id}`)
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement. Veuillez réessayer.")
    }
  }

  /* ─── Rendu des étapes ────────────────────────────────────────── */

  function renderStep() {
    switch (step) {

      /* ── Étape 1 : Général ─────────────────────────────────────── */
      case 1: return (
        <div className="space-y-5">
          <div>
            <Label required>Titre du projet</Label>
            <TextInput value={formData.titre} onChange={(v) => update("titre", v)}
              placeholder="ex : Centrale solaire Kolda — Phase 1"
              error={errors.titre} icon={FileText} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Code projet</Label>
              <TextInput value={formData.codeProjet}
                onChange={(v) => update("codeProjet", v.toUpperCase())}
                placeholder="KLD-2026-001" error={errors.codeProjet} icon={Hash} />
              <FieldHint>Identifiant unique · majuscules</FieldHint>
            </div>
            <div>
              <Label required>Région</Label>
              <SelectInput value={formData.region}
                onChange={(v) => update("region", v)}
                placeholder="Sélectionner" error={errors.region} icon={MapPin}
                options={REGIONS_SENEGAL.map((r) => ({ label: r, value: r }))} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <TextareaInput value={formData.description}
              onChange={(v) => update("description", v)}
              placeholder="Contexte, objectifs et portée du projet…" rows={3} />
          </div>
          <div>
            <Label>Partenaire / Client</Label>
            <TextInput value={formData.partenaire}
              onChange={(v) => update("partenaire", v)}
              placeholder="ex : Mairie de Kolda, ONG Énergie+" icon={Building2} />
          </div>
        </div>
      )

      /* ── Étape 2 : Business ────────────────────────────────────── */
      case 2: return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Priorité</Label>
              <SelectInput value={formData.priorite}
                onChange={(v) => update("priorite", v as Priorite)}
                placeholder="Sélectionner" error={errors.priorite}
                options={PRIORITES.map((p) => ({ label: p, value: p }))} />
              {formData.priorite === "Critique" && (
                <p className="text-xs mt-1.5 flex items-center gap-1 font-semibold"
                  style={{ color: "#f87171", fontFamily: "'Syne', sans-serif" }}>
                  <Flame size={11} /> Ce projet sera marqué critique
                </p>
              )}
            </div>
            <div>
              <Label>Statut</Label>
              <SelectInput value={formData.statut}
                onChange={(v) => update("statut", v as StatutProjet)}
                options={STATUTS_PROJET.map((s) => ({ label: s, value: s }))} />
            </div>
          </div>

          <div>
            <Label>Business model</Label>
            <SelectInput value={formData.businessModel}
              onChange={(v) => update("businessModel", v as BusinessModel)}
              placeholder="Sélectionner le modèle" icon={Briefcase}
              options={BUSINESS_MODELS.map((b) => ({ label: b, value: b }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Division</Label>
              <SelectInput value={formData.division}
                onChange={(v) => update("division", v)}
                placeholder="Sélectionner"
                options={DIVISIONS.map((d) => ({ label: d, value: d }))} />
            </div>
            <div>
              <Label>Business Unit</Label>
              <SelectInput value={formData.businessUnit}
                onChange={(v) => update("businessUnit", v)}
                placeholder="Sélectionner"
                options={BUSINESS_UNITS.map((b) => ({ label: b, value: b }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Secteur d'activité</Label>
              <SelectInput value={formData.secteurActivite}
                onChange={(v) => update("secteurActivite", v)}
                placeholder="Sélectionner"
                options={SECTEURS_ACTIVITE.map((s) => ({ label: s, value: s }))} />
            </div>
            <div>
              <Label>Cas d'utilisation</Label>
              <SelectInput value={formData.casUtilisation}
                onChange={(v) => update("casUtilisation", v)}
                placeholder="Sélectionner"
                options={CAS_UTILISATION.map((c) => ({ label: c, value: c }))} />
            </div>
          </div>

          {/* Timeline phases */}
          <div>
            <Label required>Phase du pipeline</Label>
            {errors.phase && <FieldError msg={errors.phase} />}
            <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)", background: "var(--bg-elevated)" }}>
              <PipelineTimeline
                currentPhase={formData.phase}
                onSelect={(p) => { update("phase", p); setErrors((e) => ({ ...e, phase: undefined })) }}
              />
            </div>
          </div>
        </div>
      )

      /* ── Étape 3 : Technique ───────────────────────────────────── */
      case 3: {
        const kwp    = parseFloat(formData.puissanceKwp) || 0
        const kwpCat = getKwpCategory(kwp)
        return (
          <div className="space-y-5">
            <div>
              <Label>Puissance solaire (kWp)</Label>
              <TextInput value={formData.puissanceKwp}
                onChange={(v) => update("puissanceKwp", v)}
                type="number" placeholder="ex : 250" icon={Zap} suffix="kWp" />
              {kwpCat && (
                <p className="text-xs mt-1.5 font-semibold flex items-center gap-1"
                  style={{ color: kwpCat.color, fontFamily: "'Syne', sans-serif" }}>
                  <TrendingUp size={11} /> {kwpCat.label}
                </p>
              )}
              <FieldHint>Puissance crête installée en kilowatts-pic</FieldHint>
            </div>

            <ToggleField label="Batterie incluse" checked={formData.batterieIncluse}
              onChange={(v) => update("batterieIncluse", v)}
              description="Système de stockage par batterie prévu dans le projet" />

            {formData.batterieIncluse && (
              <div>
                <Label>Capacité batterie (kWh)</Label>
                <TextInput value={formData.capaciteBatterieKwh}
                  onChange={(v) => update("capaciteBatterieKwh", v)}
                  type="number" placeholder="ex : 500" icon={BatteryCharging} suffix="kWh" />
              </div>
            )}

            {/* Indicateur surface nécessaire */}
            {kwp > 0 && (
              <div className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: "rgba(45,158,95,0.06)", border: "1px solid rgba(45,158,95,0.2)" }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>Surface approximative requise</p>
                  <p className="text-lg font-bold" style={{ color: "#3dbf72", fontFamily: "'Syne', sans-serif" }}>
                    ~{Math.round(kwp * 6).toLocaleString("fr-FR")} m²
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                    Estimation basée sur 6 m² par kWp installé
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      }

      /* ── Étape 4 : Financement ─────────────────────────────────── */
      case 4: return (
        <div className="space-y-5">
          <ToggleField label="Financement externe nécessaire" checked={formData.financementNecessaire}
            onChange={(v) => update("financementNecessaire", v)}
            description="Le projet nécessite un financement externe ou une levée de fonds" />

          {formData.financementNecessaire && (
            <div className="space-y-4 pl-2" style={{ borderLeft: "2px solid rgba(240,165,0,0.3)" }}>
              <div>
                <Label>Montant du financement (FCFA)</Label>
                <TextInput value={formData.montantFinancement}
                  onChange={(v) => update("montantFinancement", v)}
                  type="number" placeholder="ex : 150 000 000" icon={DollarSign} suffix="FCFA" />
                {parseFloat(formData.montantFinancement) > 0 && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}>
                    = {formatFCFA(parseFloat(formData.montantFinancement))}
                  </p>
                )}
              </div>
              <div>
                <Label>Source de financement</Label>
                <TextInput value={formData.sourceFinancement}
                  onChange={(v) => update("sourceFinancement", v)}
                  placeholder="ex : BEI, AFD, Fonds propres, Banque locale…" />
              </div>
            </div>
          )}

          <div>
            <Label>Revenus annuels prévus (FCFA)</Label>
            <TextInput value={formData.revenusAnnuelsPrevus}
              onChange={(v) => update("revenusAnnuelsPrevus", v)}
              type="number" placeholder="ex : 12 000 000" icon={TrendingUp} suffix="FCFA" />
            {parseFloat(formData.revenusAnnuelsPrevus) > 0 && (
              <p className="text-xs mt-1 font-semibold" style={{ color: "#22c55e", fontFamily: "'Syne', sans-serif" }}>
                = {formatFCFA(parseFloat(formData.revenusAnnuelsPrevus))} / an
              </p>
            )}
            <FieldHint>Estimation des revenus en année pleine d'exploitation</FieldHint>
          </div>

        </div>
      )

      /* ── Étape 5 : Responsables ────────────────────────────────── */
      case 5: return (
        <div className="space-y-5">
          <div>
            <Label>Chef de projet</Label>
            <TextInput value={formData.chefProjet}
              onChange={(v) => update("chefProjet", v)}
              placeholder="Prénom Nom" icon={User} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Responsable commercial</Label>
              <TextInput value={formData.responsableCommercial}
                onChange={(v) => update("responsableCommercial", v)}
                placeholder="Prénom Nom" icon={User} />
            </div>
            <div>
              <Label>Responsable finance</Label>
              <TextInput value={formData.responsableFinance}
                onChange={(v) => update("responsableFinance", v)}
                placeholder="Prénom Nom" icon={User} />
            </div>
          </div>
          <div>
            <Label>Responsable technique</Label>
            <TextInput value={formData.responsableTechnique}
              onChange={(v) => update("responsableTechnique", v)}
              placeholder="Prénom Nom" icon={User} />
          </div>
          <div>
            <Label>Autres intervenants</Label>
            <TextareaInput value={formData.autresIntervenants}
              onChange={(v) => update("autresIntervenants", v)}
              placeholder="Sous-traitants, consultants, partenaires techniques…" rows={2} />
          </div>
          <div>
            <Label>Notes internes</Label>
            <TextareaInput value={formData.notes}
              onChange={(v) => update("notes", v)}
              placeholder="Remarques, contraintes, risques, points d'attention…" rows={3} />
            {formData.notes.length > 0 && (
              <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                {formData.notes.length} caractères
              </p>
            )}
          </div>
        </div>
      )

      /* ── Étape 6 : Récapitulatif & Échéances ──────────────────── */
      case 6: {
        const phaseCol  = formData.phase ? PHASE_COLORS[formData.phase as PhaseProjet] : null
        const prioCol   = formData.priorite ? PRIORITE_COLORS[formData.priorite as Priorite] : null
        const montant   = parseFloat(formData.montantFinancement) || 0
        const revenus   = parseFloat(formData.revenusAnnuelsPrevus) || 0
        const kwp       = parseFloat(formData.puissanceKwp) || 0
        const pct       = getCompletionPct(formData)
        const isReady   = pct === 100

        return (
          <div className="space-y-6">
            {/* Dates */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Milestone size={14} style={{ color: "#f0a500" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>Échéances</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Date de début prévue</Label>
                  <TextInput value={formData.dateDebutPrevu}
                    onChange={(v) => update("dateDebutPrevu", v)}
                    type="date" icon={Calendar} />
                </div>
                <div>
                  <Label>Date de fin prévue</Label>
                  <TextInput value={formData.dateFinPrevu}
                    onChange={(v) => update("dateFinPrevu", v)}
                    type="date" icon={Calendar} />
                </div>
                <div>
                  <Label>Date de la prochaine étape</Label>
                  <TextInput value={formData.dateProchaineEtape}
                    onChange={(v) => update("dateProchaineEtape", v)}
                    type="date" icon={Clock} />
                  {isPastDate(formData.dateProchaineEtape) && formData.dateProchaineEtape && (
                    <p className="text-xs mt-1 flex items-center gap-1 font-semibold" style={{ color: "#f87171" }}>
                      <AlertTriangle size={10} /> Date dépassée
                    </p>
                  )}
                </div>
                {formData.phase === "04 - Contrat signé" && (
                  <div>
                    <Label>Date signature contrat</Label>
                    <TextInput value={formData.dateSignatureContrat}
                      onChange={(v) => update("dateSignatureContrat", v)}
                      type="date" icon={FileText} />
                  </div>
                )}
              </div>
              <div>
                <Label>Libellé prochaine étape</Label>
                <TextInput value={formData.prochaineEtapeLabel}
                  onChange={(v) => update("prochaineEtapeLabel", v)}
                  placeholder="ex : Signature contrat, Réunion kick-off, Livraison rapport…"
                  icon={StickyNote} />
                <FieldHint>Décrivez brièvement ce qui est attendu à la prochaine échéance</FieldHint>
              </div>
              <div>
                <Label>Commentaire sur les délais</Label>
                <TextareaInput value={formData.commentaireEcheance}
                  onChange={(v) => update("commentaireEcheance", v)}
                  placeholder="Risques sur les délais, dépendances, conditions particulières…" rows={2} />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Progression globale</Label>
                  <span className="text-lg font-bold" style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}>
                    {formData.progression}%
                  </span>
                </div>
                <input type="range" min={0} max={100} step={5} value={formData.progression}
                  onChange={(e) => update("progression", parseInt(e.target.value, 10))}
                  className="w-full" style={{ accentColor: "#f0a500" }} />
                <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
                  Récapitulatif complet
                </h3>
                {isReady
                  ? <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "#22c55e" }}>
                      <Check size={12} /> Prêt à créer
                    </span>
                  : <span className="text-xs" style={{ color: "#f59e0b", fontFamily: "'DM Sans', sans-serif" }}>{pct}% complété</span>
                }
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <RecapField label="Titre"     value={formData.titre}     />
                <RecapField label="Code"      value={formData.codeProjet} color="#f0a500" />
                <RecapField label="Région"    value={formData.region}    />
                <RecapField label="Partenaire" value={formData.partenaire} />
                {formData.businessModel && <RecapField label="Business model" value={formData.businessModel} />}
                {formData.division     && <RecapField label="Division"        value={formData.division} />}
                {formData.businessUnit && <RecapField label="Business unit"   value={formData.businessUnit} />}
                {formData.secteurActivite && <RecapField label="Secteur"      value={formData.secteurActivite} />}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Phase</p>
                  {phaseCol && formData.phase
                    ? <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: phaseCol.bg, color: phaseCol.text, border: `1px solid ${phaseCol.border}` }}>
                        {formData.phase}
                      </span>
                    : <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                  }
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 10 }}>Priorité</p>
                  {prioCol && formData.priorite
                    ? <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: prioCol.bg, color: prioCol.text, border: `1px solid ${prioCol.border}` }}>
                        {formData.priorite}
                      </span>
                    : <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                  }
                </div>
                {kwp > 0 && <RecapField label="Puissance" value={formatKwp(kwp)} color="#3dbf72" />}
                {montant > 0 && <RecapField label="Financement" value={formatFCFA(montant)} color="#f0a500" />}
                {revenus > 0 && <RecapField label="Revenus / an" value={formatFCFA(revenus)} color="#22c55e" />}
                <RecapField label="Chef de projet"  value={formData.chefProjet} />
                {formData.responsableCommercial && <RecapField label="Commercial" value={formData.responsableCommercial} />}
                {formData.responsableTechnique  && <RecapField label="Technique"  value={formData.responsableTechnique} />}
                <RecapField label="Début prévu" value={formatDate(formData.dateDebutPrevu)} />
                <RecapField label="Fin prévue"  value={formatDate(formData.dateFinPrevu)} />
                {formData.prochaineEtapeLabel && <RecapField label="Prochaine étape" value={formData.prochaineEtapeLabel} />}
              </div>
            </div>

            {/* Alerte champs manquants */}
            {!isReady && (
              <div className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#f59e0b", fontFamily: "'Syne', sans-serif" }}>
                    Formulaire incomplet ({pct}%)
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
                    Vous pouvez tout de même créer le projet. Les champs non remplis pourront être complétés plus tard.
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      }

      default: return null
    }
  }

  /* ─── Barre d'étapes ──────────────────────────────────────────── */

  const pct = getCompletionPct(formData)

  const StepIndicator = () => (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, idx) => {
        const isActive    = s.id === step
        const isCompleted = s.id < step
        const Icon        = s.icon

        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => { if (isCompleted) animateAndGo(s.id) }}
              title={s.desc}
              style={{ cursor: isCompleted ? "pointer" : "default" }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? "rgba(240,165,0,0.15)" : isCompleted ? "rgba(45,158,95,0.12)" : "var(--bg-elevated)",
                  border:     isActive ? "2px solid #f0a500"    : isCompleted ? "2px solid #2d9e5f"    : "1px solid var(--bg-border)",
                  boxShadow:  isActive ? "0 0 12px rgba(240,165,0,0.25)" : "none",
                }}>
                {isCompleted
                  ? <Check size={13} style={{ color: "#2d9e5f" }} />
                  : <Icon size={12} style={{ color: isActive ? "#f0a500" : "var(--text-muted)" }} />
                }
              </div>
              <span className="text-xs font-medium hidden sm:block transition-all duration-200"
                style={{
                  color:      isActive ? "#f0a500" : isCompleted ? "#2d9e5f" : "var(--text-muted)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize:   "0.65rem",
                }}>
                {s.label}
              </span>
            </button>

            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 transition-all duration-300"
                style={{ background: isCompleted ? "rgba(45,158,95,0.4)" : "rgba(255,255,255,0.06)" }} />
            )}
          </div>
        )
      })}
    </div>
  )

  /* ─── Rendu principal ─────────────────────────────────────────── */

  const currentStepMeta = STEPS[step - 1]
  const StepIcon        = currentStepMeta.icon

  return (
    <div className="p-4 md:p-6">

      {/* ── En-tête global ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2d9e5f"; e.currentTarget.style.color = "#2d9e5f" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.color = "var(--text-secondary)" }}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              {isEdit ? "Modifier le projet" : "Nouveau projet"}
            </h1>
            <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
              {isEdit && projetExistant ? projetExistant.titre : "Pipeline Projets Sénégal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Brouillon */}
          {lastSaved && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
              <Save size={11} />
              {lastSaved === "Brouillon restauré" ? lastSaved : `Sauvegardé à ${lastSaved}`}
            </span>
          )}
          {!isEdit && (
            <button onClick={resetDraft} title="Réinitialiser le brouillon"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--bg-border)" }}>
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Layout : formulaire + sidebar ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Colonne formulaire ── */}
        <div className="flex-1 min-w-0">

          {/* Barre progression globale */}
          <div className="mb-1">
            <div className="h-0.5 rounded-full overflow-hidden mb-4" style={{ background: "var(--bg-border)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(step / STEPS.length) * 100}%`, background: "linear-gradient(90deg, #f0a500, #ffc235)" }} />
            </div>

            <StepIndicator />
          </div>

          {/* Card de l'étape */}
          <div className="rounded-2xl overflow-hidden transition-opacity duration-180"
            style={{
              background:     "var(--glass-card-bg)",
              backdropFilter: "blur(12px)",
              border:         "1px solid var(--bg-border)",
              opacity:        isTransitioning ? 0 : 1,
            }}>

            {/* Header étape */}
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--bg-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.25)" }}>
                  <StepIcon size={15} style={{ color: "#f0a500" }} />
                </div>
                <div>
                  <h2 className="text-base font-bold"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                    {currentStepMeta.label}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                    {currentStepMeta.desc} · Étape {step}/{STEPS.length}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold" style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}>
                {pct}%
              </span>
            </div>

            <div className="p-6">{renderStep()}</div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-5">
            <button onClick={goBack} disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: "var(--bg-elevated)",
                border:     "1px solid var(--bg-border)",
                color:      step === 1 ? "var(--text-muted)" : "var(--text-secondary)",
                cursor:     step === 1 ? "not-allowed" : "pointer",
                fontFamily: "'Syne', sans-serif",
              }}>
              <ChevronLeft size={15} />
              Précédent
            </button>

            {step < STEPS.length ? (
              <button onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "var(--bg-base)", border: "none", fontFamily: "'Syne', sans-serif" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(240,165,0,0.3)" }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none" }}>
                Suivant
                <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={() => void handleSubmit()} disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: isSubmitting ? "rgba(45,158,95,0.3)" : "linear-gradient(135deg, #2d9e5f, #3dbf72)",
                  color:      isSubmitting ? "var(--text-muted)" : "#ffffff",
                  border:     "none",
                  cursor:     isSubmitting ? "not-allowed" : "pointer",
                  fontFamily: "'Syne', sans-serif",
                  boxShadow:  isSubmitting ? "none" : "0 4px 16px rgba(45,158,95,0.3)",
                }}
                onMouseEnter={(e) => { if (!isSubmitting) { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)" } }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)" }}>
                {isSubmitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                ) : (
                  <><Save size={15} />{isEdit ? "Enregistrer les modifications" : "Créer le projet"}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar résumé (desktop) ── */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <SummaryCard formData={formData} currentStep={step} />
        </div>

        {/* ── Résumé mobile pliable ── */}
        <div className="lg:hidden w-full">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
            <span className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
              <StickyNote size={14} style={{ color: "#f0a500" }} />
              Résumé projet · {pct}%
            </span>
            {summaryOpen ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
                         : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
          </button>
          {summaryOpen && (
            <div className="mt-2">
              <SummaryCard formData={formData} currentStep={step} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
