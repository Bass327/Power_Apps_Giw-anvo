import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronLeft,
  FileText,
  Briefcase,
  Zap,
  DollarSign,
  Users,
  Calendar,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useProjets, useCreateProjet, useUpdateProjet } from "@/hooks/usePipeline"
import {
  PHASES_PIPELINE,
  STATUTS_PROJET,
  PRIORITES,
  BUSINESS_MODELS,
  REGIONS_SENEGAL,
} from "@/types/pipeline"
import type {
  PhaseProjet,
  StatutProjet,
  Priorite,
  BusinessModel,
  ProjetPipeline,
} from "@/types/pipeline"

// ─── Types formulaire ─────────────────────────────────────────────────────────

interface FormData {
  titre:                 string
  codeProjet:            string
  region:                string
  description:           string
  partenaire:            string
  phase:                 PhaseProjet | ""
  statut:                StatutProjet | ""
  priorite:              Priorite | ""
  businessModel:         BusinessModel | ""
  puissanceKwp:          string
  batterieIncluse:       boolean
  capaciteBatterieKwh:   string
  financementNecessaire: boolean
  montantFinancement:    string
  sourceFinancement:     string
  revenusAnnuelsPrevus:  string
  chefProjet:            string
  notes:                 string
  dateDebutPrevu:        string
  dateFinPrevu:          string
  dateProchaineEtape:    string
  dateSignatureContrat:  string
  progression:           number
}

type FieldErrors = Partial<Record<keyof FormData, string>>

// ─── Configuration des étapes ─────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Général",      icon: FileText    },
  { id: 2, label: "Business",     icon: Briefcase   },
  { id: 3, label: "Technique",    icon: Zap         },
  { id: 4, label: "Financement",  icon: DollarSign  },
  { id: 5, label: "Responsables", icon: Users       },
  { id: 6, label: "Échéances",    icon: Calendar    },
] as const

// ─── État initial du formulaire ───────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  titre:                 "",
  codeProjet:            "",
  region:                "",
  description:           "",
  partenaire:            "",
  phase:                 "",
  statut:                "Actif",
  priorite:              "",
  businessModel:         "",
  puissanceKwp:          "",
  batterieIncluse:       false,
  capaciteBatterieKwh:   "",
  financementNecessaire: false,
  montantFinancement:    "",
  sourceFinancement:     "",
  revenusAnnuelsPrevus:  "",
  chefProjet:            "",
  notes:                 "",
  dateDebutPrevu:        "",
  dateFinPrevu:          "",
  dateProchaineEtape:    "",
  dateSignatureContrat:  "",
  progression:           0,
}

// ─── Conversion ProjetPipeline → FormData ─────────────────────────────────────

function projetToForm(p: ProjetPipeline): FormData {
  return {
    titre:                 p.titre,
    codeProjet:            p.codeProjet,
    region:                p.region,
    description:           p.description,
    partenaire:            p.partenaire,
    phase:                 p.phase,
    statut:                p.statut,
    priorite:              p.priorite,
    businessModel:         p.businessModel,
    puissanceKwp:          p.puissanceKwp  ? String(p.puissanceKwp)  : "",
    batterieIncluse:       p.batterieIncluse,
    capaciteBatterieKwh:   p.capaciteBatterieKwh ? String(p.capaciteBatterieKwh) : "",
    financementNecessaire: p.financementNecessaire,
    montantFinancement:    p.montantFinancement   ? String(p.montantFinancement)   : "",
    sourceFinancement:     p.sourceFinancement,
    revenusAnnuelsPrevus:  p.revenusAnnuelsPrevus ? String(p.revenusAnnuelsPrevus) : "",
    chefProjet:            p.chefProjet,
    notes:                 p.notes,
    dateDebutPrevu:        p.dateDebutPrevu,
    dateFinPrevu:          p.dateFinPrevu,
    dateProchaineEtape:    p.dateProchaineEtape,
    dateSignatureContrat:  p.dateSignatureContrat,
    progression:           p.progression,
  }
}

// ─── Validation par étape ─────────────────────────────────────────────────────

function validateStep(step: number, d: FormData): FieldErrors {
  const e: FieldErrors = {}
  if (step === 1) {
    if (!d.titre.trim())  e.titre  = "Le titre est obligatoire"
    if (!d.codeProjet.trim()) e.codeProjet = "Le code projet est obligatoire"
  }
  if (step === 2) {
    if (!d.phase)    e.phase    = "La phase est obligatoire"
    if (!d.priorite) e.priorite = "La priorité est obligatoire"
  }
  return e
}

// ─── Composants UI du formulaire ──────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label
      className="block text-sm font-medium mb-1.5"
      style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
    >
      {children}
      {required && (
        <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>
      )}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#f87171" }}>
      <AlertCircle size={11} />
      {msg}
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
}

function TextInput({ value, onChange, placeholder, type = "text", error, disabled }: InputProps) {
  const border = error
    ? "1px solid rgba(239,68,68,0.5)"
    : "1px solid var(--bg-border)"

  return (
    <div>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-150"
        style={{
          background: "var(--bg-elevated)",
          border,
          color:      "var(--text-primary)",
          outline:    "none",
          opacity:    disabled ? 0.5 : 1,
        }}
        onFocus={(e) => {
          if (!disabled)
            e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.8)" : "#2d9e5f"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "rgba(239,68,68,0.5)"
            : "var(--bg-border)"
        }}
      />
      <FieldError msg={error} />
    </div>
  )
}

function TextareaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  rows?:        number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-150 resize-none"
      style={{
        background: "var(--bg-elevated)",
        border:     "1px solid var(--bg-border)",
        color:      "var(--text-primary)",
        outline:    "none",
      }}
      onFocus={(e)  => { e.currentTarget.style.borderColor = "#2d9e5f" }}
      onBlur={(e)   => { e.currentTarget.style.borderColor = "var(--bg-border)" }}
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value:        string
  onChange:     (v: string) => void
  options:      { label: string; value: string }[]
  placeholder?: string
  error?:       string
}) {
  const border = error
    ? "1px solid rgba(239,68,68,0.5)"
    : "1px solid var(--bg-border)"

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-150"
        style={{
          background: "var(--bg-elevated)",
          border,
          color:      value ? "var(--text-primary)" : "var(--text-muted)",
          outline:    "none",
          cursor:     "pointer",
        }}
        onFocus={(e)  => { e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.8)" : "#2d9e5f" }}
        onBlur={(e)   => { e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.5)" : "var(--bg-border)" }}
      >
        {placeholder && (
          <option value="" style={{ color: "var(--text-muted)" }}>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError msg={error} />
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label:        string
  checked:      boolean
  onChange:     (v: boolean) => void
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left transition-all duration-150"
      style={{
        background:  checked ? "rgba(240,165,0,0.08)"   : "var(--bg-elevated)",
        border:      checked ? "1px solid rgba(240,165,0,0.3)" : "1px solid var(--bg-border)",
      }}
    >
      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color:      checked ? "#f0a500" : "var(--text-primary)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      <div
        className="w-11 h-6 rounded-full flex-shrink-0 transition-all duration-200 relative"
        style={{
          background: checked ? "#f0a500" : "rgba(107,114,128,0.3)",
        }}
      >
        <div
          className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            background:  "#ffffff",
            left:        checked ? "calc(100% - 1.25rem)" : "0.25rem",
            boxShadow:   "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProjetFormPage() {
  const navigate        = useNavigate()
  const { id }          = useParams<{ id?: string }>()
  const isEdit          = !!id

  const { data: projets = [] } = useProjets()
  const projetExistant         = isEdit
    ? projets.find((p) => p.id === id)
    : undefined

  const DRAFT_KEY = isEdit ? `pipeline-draft-${id}` : "pipeline-draft-nouveau"

  const [step,      setStep]      = useState(1)
  const [formData,  setFormData]  = useState<FormData>(EMPTY_FORM)
  const [errors,    setErrors]    = useState<FieldErrors>({})
  const [isDirty,   setIsDirty]   = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const createMutation = useCreateProjet()
  const updateMutation = useUpdateProjet()

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending

  // Initialisation depuis projet existant ou brouillon
  useEffect(() => {
    if (projetExistant) {
      setFormData(projetToForm(projetExistant))
      return
    }
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as FormData
        setFormData(parsed)
        setLastSaved("Brouillon restauré")
      } catch { /* brouillon corrompu */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, projetExistant])

  // Autosave toutes les 1.5 secondes après une modification
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
      const now = new Date()
      setLastSaved(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      )
    }, 1500)
    return () => clearTimeout(timer)
  }, [formData, isDirty, DRAFT_KEY])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev)    => ({ ...prev, [key]: undefined }))
    setIsDirty(true)
  }

  function goNext() {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStep((s) => Math.min(6, s + 1))
  }

  function goBack() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit() {
    // Validation globale des steps 1 et 2
    const e1 = validateStep(1, formData)
    const e2 = validateStep(2, formData)
    const allErrors = { ...e1, ...e2 }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      if (e1.titre || e1.codeProjet) setStep(1)
      else if (e2.phase || e2.priorite) setStep(2)
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
      statut:                formData.statut as StatutProjet || "Actif",
      priorite:              formData.priorite as Priorite,
      businessModel:         formData.businessModel as BusinessModel || "Autre",
      puissanceKwp:          parseFloat(formData.puissanceKwp)        || 0,
      batterieIncluse:       formData.batterieIncluse,
      capaciteBatterieKwh:   parseFloat(formData.capaciteBatterieKwh) || 0,
      financementNecessaire: formData.financementNecessaire,
      montantFinancement:    parseFloat(formData.montantFinancement)   || 0,
      sourceFinancement:     formData.sourceFinancement,
      revenusAnnuelsPrevus:  parseFloat(formData.revenusAnnuelsPrevus) || 0,
      chefProjet:            formData.chefProjet,
      notes:                 formData.notes,
      dateDebutPrevu:        formData.dateDebutPrevu,
      dateFinPrevu:          formData.dateFinPrevu,
      dateProchaineEtape:    formData.dateProchaineEtape,
      dateSignatureContrat:  formData.dateSignatureContrat,
      progression:           formData.progression,
    }

    if (isEdit && id) {
      await updateMutation.mutateAsync({
        id,
        fields:     payload,
        logMessage: `Projet modifié — ${payload.phase}`,
      })
      localStorage.removeItem(DRAFT_KEY)
      navigate(`/suivi/pipeline-projets/projets/${id}`)
    } else {
      const created = await createMutation.mutateAsync(payload)
      localStorage.removeItem(DRAFT_KEY)
      navigate(`/suivi/pipeline-projets/projets/${created.id}`)
    }
  }

  /* ── Rendu par étape ────────────────────────────────────────────────────── */

  function renderStep() {
    switch (step) {
      /* ── Step 1 : Général ────────────────────────────────────────────── */
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <Label required>Titre du projet</Label>
              <TextInput
                value={formData.titre}
                onChange={(v) => update("titre", v)}
                placeholder="ex : Centrale solaire Kolda — Phase 1"
                error={errors.titre}
              />
            </div>
            <div>
              <Label required>Code projet</Label>
              <TextInput
                value={formData.codeProjet}
                onChange={(v) => update("codeProjet", v.toUpperCase())}
                placeholder="ex : KLD-2026-001"
                error={errors.codeProjet}
              />
              <FieldHint>Identifiant unique court — en majuscules</FieldHint>
            </div>
            <div>
              <Label>Région</Label>
              <SelectInput
                value={formData.region}
                onChange={(v) => update("region", v)}
                placeholder="Sélectionner une région"
                options={REGIONS_SENEGAL.map((r) => ({ label: r, value: r }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <TextareaInput
                value={formData.description}
                onChange={(v) => update("description", v)}
                placeholder="Contexte et objectifs du projet…"
                rows={4}
              />
            </div>
            <div>
              <Label>Partenaire / Client</Label>
              <TextInput
                value={formData.partenaire}
                onChange={(v) => update("partenaire", v)}
                placeholder="ex : Mairie de Kolda, ONG Énergie+"
              />
            </div>
          </div>
        )

      /* ── Step 2 : Business ───────────────────────────────────────────── */
      case 2:
        return (
          <div className="space-y-5">
            <div>
              <Label required>Phase du projet</Label>
              <SelectInput
                value={formData.phase}
                onChange={(v) => update("phase", v as PhaseProjet)}
                placeholder="Sélectionner la phase"
                error={errors.phase}
                options={PHASES_PIPELINE.map((p) => ({ label: p, value: p }))}
              />
            </div>
            <div>
              <Label required>Priorité</Label>
              <SelectInput
                value={formData.priorite}
                onChange={(v) => update("priorite", v as Priorite)}
                placeholder="Sélectionner la priorité"
                error={errors.priorite}
                options={PRIORITES.map((p) => ({ label: p, value: p }))}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <SelectInput
                value={formData.statut}
                onChange={(v) => update("statut", v as StatutProjet)}
                options={STATUTS_PROJET.map((s) => ({ label: s, value: s }))}
              />
            </div>
            <div>
              <Label>Business model</Label>
              <SelectInput
                value={formData.businessModel}
                onChange={(v) => update("businessModel", v as BusinessModel)}
                placeholder="Sélectionner le modèle"
                options={BUSINESS_MODELS.map((b) => ({ label: b, value: b }))}
              />
            </div>
          </div>
        )

      /* ── Step 3 : Technique ──────────────────────────────────────────── */
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <Label>Puissance solaire (kWp)</Label>
              <TextInput
                value={formData.puissanceKwp}
                onChange={(v) => update("puissanceKwp", v)}
                type="number"
                placeholder="ex : 250"
              />
              <FieldHint>Puissance crête installée en kilowatts-pic</FieldHint>
            </div>
            <ToggleField
              label="Batterie incluse"
              checked={formData.batterieIncluse}
              onChange={(v) => update("batterieIncluse", v)}
              description="Système de stockage par batterie prévu dans le projet"
            />
            {formData.batterieIncluse && (
              <div>
                <Label>Capacité batterie (kWh)</Label>
                <TextInput
                  value={formData.capaciteBatterieKwh}
                  onChange={(v) => update("capaciteBatterieKwh", v)}
                  type="number"
                  placeholder="ex : 500"
                />
              </div>
            )}
          </div>
        )

      /* ── Step 4 : Financement ────────────────────────────────────────── */
      case 4:
        return (
          <div className="space-y-5">
            <ToggleField
              label="Financement nécessaire"
              checked={formData.financementNecessaire}
              onChange={(v) => update("financementNecessaire", v)}
              description="Le projet nécessite un financement externe ou une levée de fonds"
            />
            {formData.financementNecessaire && (
              <>
                <div>
                  <Label>Montant du financement nécessaire (FCFA)</Label>
                  <TextInput
                    value={formData.montantFinancement}
                    onChange={(v) => update("montantFinancement", v)}
                    type="number"
                    placeholder="ex : 150000000"
                  />
                  <FieldHint>Montant en FCFA — sans espaces</FieldHint>
                </div>
                <div>
                  <Label>Source de financement</Label>
                  <TextInput
                    value={formData.sourceFinancement}
                    onChange={(v) => update("sourceFinancement", v)}
                    placeholder="ex : BEI, AFD, Fonds propres, Emprunt bancaire…"
                  />
                </div>
              </>
            )}
            <div>
              <Label>Revenus annuels prévus (FCFA)</Label>
              <TextInput
                value={formData.revenusAnnuelsPrevus}
                onChange={(v) => update("revenusAnnuelsPrevus", v)}
                type="number"
                placeholder="ex : 12000000"
              />
              <FieldHint>Estimation des revenus en année pleine d'exploitation</FieldHint>
            </div>
          </div>
        )

      /* ── Step 5 : Responsables ───────────────────────────────────────── */
      case 5:
        return (
          <div className="space-y-5">
            <div>
              <Label>Chef de projet</Label>
              <TextInput
                value={formData.chefProjet}
                onChange={(v) => update("chefProjet", v)}
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <Label>Notes internes</Label>
              <TextareaInput
                value={formData.notes}
                onChange={(v) => update("notes", v)}
                placeholder="Remarques, contraintes, points d'attention…"
                rows={5}
              />
            </div>
          </div>
        )

      /* ── Step 6 : Échéances ──────────────────────────────────────────── */
      case 6:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Date de début prévue</Label>
                <TextInput
                  value={formData.dateDebutPrevu}
                  onChange={(v) => update("dateDebutPrevu", v)}
                  type="date"
                />
              </div>
              <div>
                <Label>Date de fin prévue</Label>
                <TextInput
                  value={formData.dateFinPrevu}
                  onChange={(v) => update("dateFinPrevu", v)}
                  type="date"
                />
              </div>
            </div>
            <div>
              <Label>Date prochaine étape</Label>
              <TextInput
                value={formData.dateProchaineEtape}
                onChange={(v) => update("dateProchaineEtape", v)}
                type="date"
              />
              <FieldHint>Prochain jalon ou action à réaliser</FieldHint>
            </div>
            {/* Conditionnel : Contrat signé */}
            {formData.phase === "Contrat signé" && (
              <div>
                <Label>Date de signature du contrat</Label>
                <TextInput
                  value={formData.dateSignatureContrat}
                  onChange={(v) => update("dateSignatureContrat", v)}
                  type="date"
                />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Progression globale</Label>
                <span
                  className="text-lg font-bold"
                  style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}
                >
                  {formData.progression}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={formData.progression}
                onChange={(e) => update("progression", parseInt(e.target.value, 10))}
                className="w-full"
                style={{ accentColor: "#f0a500" }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  /* ── Rendu principal ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{
            background: "var(--bg-elevated)",
            border:     "1px solid var(--bg-border)",
            color:      "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#2d9e5f"
            e.currentTarget.style.color       = "#2d9e5f"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--bg-border)"
            e.currentTarget.style.color       = "var(--text-secondary)"
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div className="min-w-0">
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
          >
            {isEdit ? "Modifier le projet" : "Nouveau projet"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {isEdit && projetExistant ? projetExistant.titre : "Pipeline Projets Sénégal"}
          </p>
        </div>

        {lastSaved && (
          <span
            className="ml-auto text-xs flex-shrink-0 flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <Save size={11} />
            Brouillon {lastSaved}
          </span>
        )}
      </div>

      {/* ── Indicateur d'étapes ───────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, idx) => {
          const isActive    = s.id === step
          const isCompleted = s.id < step
          const Icon        = s.icon

          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => {
                  if (isCompleted) setStep(s.id)
                }}
                className="flex flex-col items-center gap-1"
                style={{ cursor: isCompleted ? "pointer" : "default" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive
                      ? "rgba(240,165,0,0.15)"
                      : isCompleted
                      ? "rgba(45,158,95,0.15)"
                      : "var(--bg-elevated)",
                    border: isActive
                      ? "2px solid #f0a500"
                      : isCompleted
                      ? "2px solid #2d9e5f"
                      : "1px solid var(--bg-border)",
                  }}
                >
                  {isCompleted ? (
                    <Check size={14} style={{ color: "#2d9e5f" }} />
                  ) : (
                    <Icon
                      size={13}
                      style={{
                        color: isActive ? "#f0a500" : "var(--text-muted)",
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block"
                  style={{
                    color: isActive
                      ? "#f0a500"
                      : isCompleted
                      ? "#2d9e5f"
                      : "var(--text-muted)",
                    fontFamily: "'Syne', sans-serif",
                    fontSize:   "0.6875rem",
                  }}
                >
                  {s.label}
                </span>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1"
                  style={{
                    background: isCompleted
                      ? "rgba(45,158,95,0.4)"
                      : "rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Contenu de l'étape ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background:     "var(--glass-card-bg)",
          backdropFilter: "blur(12px)",
          border:         "1px solid var(--bg-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          {(() => {
            const s    = STEPS[step - 1]
            const Icon = s.icon
            return (
              <>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(240,165,0,0.12)",
                    border:     "1px solid rgba(240,165,0,0.25)",
                  }}
                >
                  <Icon size={15} style={{ color: "#f0a500" }} />
                </div>
                <div>
                  <h2
                    className="text-base font-bold"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      color:      "var(--text-primary)",
                    }}
                  >
                    {s.label}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Étape {step} sur {STEPS.length}
                  </p>
                </div>
              </>
            )
          })()}
        </div>

        {renderStep()}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            background: "var(--bg-elevated)",
            border:     "1px solid var(--bg-border)",
            color:      step === 1 ? "var(--text-muted)" : "var(--text-secondary)",
            cursor:     step === 1 ? "not-allowed" : "pointer",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <ChevronLeft size={15} />
          Précédent
        </button>

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {step}/{STEPS.length}
        </span>

        {step < STEPS.length ? (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: "linear-gradient(135deg, #f0a500, #ffc235)",
              color:      "var(--bg-base)",
              border:     "none",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            Suivant
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: isSubmitting
                ? "rgba(45,158,95,0.3)"
                : "linear-gradient(135deg, #2d9e5f, #3dbf72)",
              color:      isSubmitting ? "var(--text-muted)" : "#ffffff",
              border:     "none",
              cursor:     isSubmitting ? "not-allowed" : "pointer",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save size={15} />
                {isEdit ? "Enregistrer" : "Créer le projet"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
