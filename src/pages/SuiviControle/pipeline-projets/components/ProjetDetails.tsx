/* ═══════════════════════════════════════════════════════════════════════════
   ProjetDetails — Page de détail d'un projet du pipeline
   Route : /suivi/pipeline-projets/projets/:id
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Edit2,
  Loader2,
  AlertTriangle,
  FileText,
  CheckSquare,
  Flag,
  History,
  User,
  Calendar,
  MapPin,
  Zap,
  Battery,
  DollarSign,
  TrendingUp,
  Building2,
  Clock,
} from "lucide-react"
import {
  useProjets,
  usePipelineTasks,
  usePipelineMilestones,
  usePipelineUpdates,
} from "@/hooks/usePipeline"
import {
  PHASES_PIPELINE,
  PHASE_COLORS,
  PRIORITE_COLORS,
  STATUT_PROJET_COLORS,
  STATUT_TACHE_COLORS,
  formatFCFA,
  formatKwp,
  getPhaseProgress,
  type PhaseProjet,
  type ProjetPipeline,
  type PipelineTask,
  type PipelineMilestone,
  type PipelineUpdate,
} from "@/types/pipeline"

// ─── Phases actives (sans "Abandonné") pour la barre de progression ───────────

const ACTIVE_PHASES = PHASES_PIPELINE.filter(
  (p): p is Exclude<PhaseProjet, "Abandonné"> => p !== "Abandonné",
)

// ─── Couleurs des statuts de jalons ───────────────────────────────────────────

const MILESTONE_COLORS = {
  "En attente": { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  "En cours":   { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  "Atteint":    { bg: "rgba(34,197,94,0.12)",   text: "#22c55e", border: "rgba(34,197,94,0.3)"   },
  "En retard":  { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)"   },
} as const

// ─── Utilitaire formatage date ────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    })
  } catch {
    return "—"
  }
}

// ─── Barre de progression pipeline ───────────────────────────────────────────

function PipelineProgressBar({ phase }: { phase: PhaseProjet }) {
  const currentIndex = ACTIVE_PHASES.indexOf(
    phase as (typeof ACTIVE_PHASES)[number],
  )
  const isAbandonne = phase === "Abandonné"

  return (
    <div className="space-y-3">
      <div className="flex gap-1 items-end">
        {ACTIVE_PHASES.map((p, i) => {
          const isActive = p === phase
          const isPast   = !isAbandonne && i < currentIndex
          const c        = PHASE_COLORS[p]
          return (
            <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: isActive
                    ? c.text
                    : isPast
                    ? "rgba(45,158,95,0.35)"
                    : "rgba(30,53,40,0.6)",
                  boxShadow: isActive ? `0 0 8px ${c.text}55` : "none",
                }}
                title={p}
              />
            </div>
          )
        })}
      </div>
      {/* Légende : première phase, phase active, dernière phase */}
      <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span style={{ fontFamily: "'Syne', sans-serif" }}>{ACTIVE_PHASES[0]}</span>
        {!isAbandonne && currentIndex > 0 && currentIndex < ACTIVE_PHASES.length - 1 && (
          <span
            className="font-semibold"
            style={{ color: PHASE_COLORS[phase].text, fontFamily: "'Syne', sans-serif" }}
          >
            {phase}
          </span>
        )}
        <span style={{ fontFamily: "'Syne', sans-serif" }}>{ACTIVE_PHASES[ACTIVE_PHASES.length - 1]}</span>
      </div>
    </div>
  )
}

// ─── Ligne de détail ──────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ElementType
}) {
  if (value === null || value === undefined || value === "" || value === "—") return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: "rgba(30,53,40,0.5)" }}>
      {Icon && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(45,158,95,0.08)" }}
        >
          <Icon size={13} style={{ color: "#2d9e5f" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className="text-xs mb-0.5"
          style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", letterSpacing: "0.03em" }}
        >
          {label}
        </div>
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ─── Card de section ──────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
    >
      <h3
        className="text-xs font-bold mb-3 uppercase tracking-widest"
        style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Onglet Résumé ────────────────────────────────────────────────────────────

function ResumeTab({ projet }: { projet: ProjetPipeline }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Description */}
      {projet.description && (
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
        >
          <h3
            className="text-xs font-bold mb-3 uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}
          >
            Description
          </h3>
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--text-primary)" }}
          >
            {projet.description}
          </p>
          {projet.notes && (
            <p
              className="text-xs mt-3 pt-3 border-t italic leading-relaxed"
              style={{ color: "var(--text-secondary)", borderColor: "rgba(30,53,40,0.5)" }}
            >
              {projet.notes}
            </p>
          )}
        </div>
      )}

      {/* Données techniques */}
      <SectionCard title="Données techniques">
        <DetailRow label="Puissance installée"  value={formatKwp(projet.puissanceKwp)}          icon={Zap}      />
        <DetailRow label="Batterie incluse"     value={projet.batterieIncluse ? "Oui" : "Non"}  icon={Battery}  />
        {projet.batterieIncluse && projet.capaciteBatterieKwh > 0 && (
          <DetailRow label="Capacité batterie"  value={`${projet.capaciteBatterieKwh} kWh`}     icon={Battery}  />
        )}
        <DetailRow label="Modèle d'affaires"    value={projet.businessModel}                    icon={Building2} />
        <DetailRow label="Région"               value={projet.region}                           icon={MapPin}   />
        <DetailRow label="Avancement déclaré"   value={`${projet.progression} %`}               icon={TrendingUp} />
      </SectionCard>

      {/* Données financières */}
      <SectionCard title="Données financières">
        {projet.financementNecessaire ? (
          <>
            <DetailRow label="Financement nécessaire" value="Oui"                                        icon={DollarSign} />
            <DetailRow label="Montant du financement"  value={formatFCFA(projet.montantFinancement)}     icon={DollarSign} />
            <DetailRow label="Source du financement"   value={projet.sourceFinancement}                 icon={Building2}  />
          </>
        ) : (
          <DetailRow label="Financement nécessaire" value="Non" icon={DollarSign} />
        )}
        <DetailRow label="Revenus annuels prévus" value={formatFCFA(projet.revenusAnnuelsPrevus)} icon={TrendingUp} />
      </SectionCard>

      {/* Responsables */}
      <SectionCard title="Responsables & Partenaires">
        <DetailRow label="Chef de projet" value={projet.chefProjet}  icon={User}     />
        <DetailRow label="Partenaire"     value={projet.partenaire}  icon={Building2} />
      </SectionCard>

      {/* Dates clés */}
      <SectionCard title="Dates clés">
        <DetailRow label="Début prévu"         value={fmtDate(projet.dateDebutPrevu)}       icon={Calendar} />
        <DetailRow label="Fin prévue"          value={fmtDate(projet.dateFinPrevu)}         icon={Calendar} />
        <DetailRow label="Prochaine étape"     value={fmtDate(projet.dateProchaineEtape)}   icon={Clock}    />
        {projet.dateSignatureContrat && (
          <DetailRow label="Signature contrat" value={fmtDate(projet.dateSignatureContrat)} icon={Calendar} />
        )}
      </SectionCard>

    </div>
  )
}

// ─── Onglet Tâches ────────────────────────────────────────────────────────────

function TachesTab({ tasks, loading }: { tasks: PipelineTask[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }
  if (tasks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
      >
        <CheckSquare size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Aucune tâche pour ce projet
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const sc = STATUT_TACHE_COLORS[task.statut]
        const pc = PRIORITE_COLORS[task.priorite]
        return (
          <div
            key={task.id}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
              >
                {task.titre}
              </p>
              {task.assignee && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                  <User size={10} />
                  {task.assignee}
                </p>
              )}
              {task.description && (
                <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {task.dateLimite && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                >
                  <Calendar size={10} />
                  {fmtDate(task.dateLimite)}
                </span>
              )}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, fontFamily: "'Syne', sans-serif" }}
              >
                {task.priorite}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontFamily: "'Syne', sans-serif" }}
              >
                {task.statut}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet Jalons ────────────────────────────────────────────────────────────

function JalonsTab({ milestones, loading }: { milestones: PipelineMilestone[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }
  if (milestones.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
      >
        <Flag size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Aucun jalon pour ce projet
        </p>
      </div>
    )
  }
  const sorted = [...milestones].sort((a, b) => a.datePrevue.localeCompare(b.datePrevue))
  return (
    <div className="relative pl-8 space-y-0">
      {/* Ligne verticale */}
      <div
        className="absolute left-3 top-2 bottom-6 w-0.5 rounded-full"
        style={{ background: "linear-gradient(to bottom, #2d9e5f, rgba(45,158,95,0.05))" }}
      />
      {sorted.map((m) => {
        const sc = MILESTONE_COLORS[m.statut]
        return (
          <div key={m.id} className="relative pb-6">
            {/* Dot timeline */}
            <div
              className="absolute left-[-1.6rem] top-1.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
              style={{
                background:  m.statut === "Atteint" ? "#22c55e" : "var(--bg-surface)",
                borderColor: m.statut === "Atteint" ? "#22c55e" : "#2d9e5f",
                zIndex: 1,
              }}
            />
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
                >
                  {m.titre}
                </p>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontFamily: "'Syne', sans-serif" }}
                >
                  {m.statut}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  Prévu : {fmtDate(m.datePrevue)}
                </span>
                {m.dateReelle && (
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    Réalisé : {fmtDate(m.dateReelle)}
                  </span>
                )}
              </div>
              {m.description && (
                <p className="text-xs mt-2 italic" style={{ color: "var(--text-muted)" }}>
                  {m.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet Historique ────────────────────────────────────────────────────────

function HistoriqueTab({ updates, loading }: { updates: PipelineUpdate[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }
  if (updates.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
      >
        <History size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Aucun historique pour ce projet
        </p>
      </div>
    )
  }
  const sorted = [...updates].sort((a, b) => b.created.localeCompare(a.created))
  return (
    <div className="relative pl-8 space-y-0">
      {/* Ligne verticale */}
      <div
        className="absolute left-3 top-2 bottom-6 w-0.5 rounded-full"
        style={{ background: "linear-gradient(to bottom, #f0a500, rgba(240,165,0,0.05))" }}
      />
      {sorted.map((u) => (
        <div key={u.id} className="relative pb-5">
          {/* Dot */}
          <div
            className="absolute left-[-1.5rem] top-2 w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: "#f0a500", zIndex: 1, boxShadow: "0 0 6px rgba(240,165,0,0.4)" }}
          />
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(240,165,0,0.1)",
                  color:      "#f0a500",
                  border:     "1px solid rgba(240,165,0,0.25)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {u.auteur}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {fmtDate(u.created)}
              </span>
            </div>
            {u.description && (
              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>
                {u.description}
              </p>
            )}
            {u.champModifie && (
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap" style={{ color: "var(--text-secondary)" }}>
                <span className="font-medium" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {u.champModifie}
                </span>
                {u.ancienneValeur && (
                  <>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                    >
                      {u.ancienneValeur}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
                    >
                      {u.nouvelleValeur}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Type des onglets ─────────────────────────────────────────────────────────

type DetailsTab = "resume" | "taches" | "jalons" | "historique"

// ═══════════════════════════════════════════════════════════════════════════════
// Page principale
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProjetDetailsPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const [activeTab, setActiveTab] = useState<DetailsTab>("resume")

  // ── Données ──────────────────────────────────────────────────────────────

  const { data: projets = [], isLoading: loadingProjet, error: errorProjet } = useProjets()
  const projet = projets.find((p) => p.id === id)

  const { data: tasks      = [], isLoading: loadingTasks      } = usePipelineTasks(id)
  const { data: milestones = [], isLoading: loadingMilestones } = usePipelineMilestones(id)
  const { data: updates    = [], isLoading: loadingUpdates    } = usePipelineUpdates(id)

  // ── États de chargement ───────────────────────────────────────────────────

  if (loadingProjet) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }

  if (errorProjet || !projet) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 p-6">
        <AlertTriangle size={40} style={{ color: "#ef4444" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {!projet ? "Projet introuvable." : "Erreur lors du chargement du projet."}
        </p>
        <button
          onClick={() => navigate("/suivi/pipeline-projets")}
          className="text-sm px-4 py-2 rounded-xl transition-all duration-150"
          style={{
            background: "rgba(45,158,95,0.12)",
            color:      "#2d9e5f",
            border:     "1px solid rgba(45,158,95,0.3)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Retour au pipeline
        </button>
      </div>
    )
  }

  const phaseColors  = PHASE_COLORS[projet.phase]
  const prioColors   = PRIORITE_COLORS[projet.priorite]
  const statutColors = STATUT_PROJET_COLORS[projet.statut]

  // ── Configuration des onglets ─────────────────────────────────────────────

  const TABS: {
    id:     DetailsTab
    label:  string
    icon:   React.ElementType
    count?: number
  }[] = [
    { id: "resume",     label: "Résumé",     icon: FileText                          },
    { id: "taches",     label: "Tâches",     icon: CheckSquare, count: tasks.length     },
    { id: "jalons",     label: "Jalons",     icon: Flag,        count: milestones.length },
    { id: "historique", label: "Historique", icon: History,     count: updates.length   },
  ]

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3 min-w-0">
          {/* Bouton retour */}
          <button
            onClick={() => navigate("/suivi/pipeline-projets")}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-150"
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
            title="Retour Pipeline Projets"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Informations du projet */}
          <div className="min-w-0">
            {/* Code + titre */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                style={{
                  background:    "rgba(240,165,0,0.1)",
                  color:         "#f0a500",
                  border:        "1px solid rgba(240,165,0,0.25)",
                  fontFamily:    "'Syne', sans-serif",
                  letterSpacing: "0.06em",
                }}
              >
                {projet.codeProjet}
              </span>
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
              >
                {projet.titre}
              </h1>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Phase */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: phaseColors.bg,
                  color:      phaseColors.text,
                  border:     `1px solid ${phaseColors.border}`,
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {projet.phase}
              </span>
              {/* Priorité */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: prioColors.bg,
                  color:      prioColors.text,
                  border:     `1px solid ${prioColors.border}`,
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {projet.priorite}
              </span>
              {/* Statut */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: statutColors.bg,
                  color:      statutColors.text,
                  border:     `1px solid ${statutColors.border}`,
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {projet.statut}
              </span>
              {/* Chef de projet */}
              {projet.chefProjet && (
                <span
                  className="text-xs flex items-center gap-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <User size={11} />
                  {projet.chefProjet}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Modifier */}
        <button
          onClick={() => navigate(`/suivi/pipeline-projets/projets/${projet.id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, #f0a500, #ffc235)",
            color:      "#080f0b",
            fontFamily: "'Syne', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.88"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1"
          }}
        >
          <Edit2 size={14} />
          Modifier
        </button>
      </div>

      {/* ── Barre de progression pipeline ───────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}
          >
            Progression dans le pipeline
          </span>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                background: "rgba(45,158,95,0.1)",
                color:      "#2d9e5f",
                border:     "1px solid rgba(45,158,95,0.25)",
              }}
            >
              {projet.phase === "Abandonné" ? "Abandonné" : `${getPhaseProgress(projet.phase)}% pipeline`}
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                background: "rgba(240,165,0,0.1)",
                color:      "#f0a500",
                border:     "1px solid rgba(240,165,0,0.25)",
              }}
            >
              {projet.progression}% avancement
            </span>
          </div>
        </div>
        <PipelineProgressBar phase={projet.phase} />
      </div>

      {/* ── Navigation onglets ───────────────────────────────────────────── */}
      <div
        className="flex gap-1 overflow-x-auto p-1 rounded-xl"
        style={{ background: "rgba(13,26,16,0.6)", border: "1px solid #1e3528" }}
      >
        {TABS.map((tab) => {
          const Icon     = tab.icon
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0"
              style={{
                background: isActive ? "rgba(240,165,0,0.12)" : "transparent",
                color:      isActive ? "#f0a500"               : "var(--text-secondary)",
                border:     isActive
                  ? "1px solid rgba(240,165,0,0.3)"
                  : "1px solid transparent",
                fontFamily: "'Syne', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                  e.currentTarget.style.color      = "var(--text-primary)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color      = "var(--text-secondary)"
                }
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: isActive ? "rgba(240,165,0,0.2)" : "rgba(45,158,95,0.15)",
                    color:      isActive ? "#f0a500"              : "#2d9e5f",
                    minWidth:   "1.25rem",
                    textAlign:  "center",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Contenu de l'onglet actif ────────────────────────────────────── */}
      <div>
        {activeTab === "resume"     && <ResumeTab projet={projet} />}
        {activeTab === "taches"     && <TachesTab     tasks={tasks}         loading={loadingTasks}      />}
        {activeTab === "jalons"     && <JalonsTab     milestones={milestones} loading={loadingMilestones} />}
        {activeTab === "historique" && <HistoriqueTab updates={updates}     loading={loadingUpdates}    />}
      </div>

    </div>
  )
}
