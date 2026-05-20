/* ═══════════════════════════════════════════════════════════════════════════
   MilestonesView — Timeline globale des jalons du pipeline
   Données : usePipelineMilestones() + useProjets()
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react"
import {
  Flag,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react"
import { useProjets, usePipelineMilestones } from "@/hooks/usePipeline"
import {
  STATUTS_MILESTONE,
  type PipelineMilestone,
  type StatutMilestone,
} from "@/types/pipeline"

// ─── Couleurs des statuts de jalons ───────────────────────────────────────────

const MILESTONE_COLORS: Record<StatutMilestone, { bg: string; text: string; border: string; dot: string }> = {
  "En attente": { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)",  dot: "#6b7280" },
  "En cours":   { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)",   dot: "#3b82f6" },
  "Atteint":    { bg: "rgba(34,197,94,0.12)",   text: "#22c55e", border: "rgba(34,197,94,0.3)",    dot: "#22c55e" },
  "En retard":  { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.3)",    dot: "#ef4444" },
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

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

function fmtDateShort(iso: string): string {
  if (!iso) return "—"
  const p = iso.split("-")
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

function daysUntil(iso: string): number {
  if (!iso) return Infinity
  const diff = new Date(iso).getTime() - new Date(TODAY).getTime()
  return Math.round(diff / 86400000)
}

function daysLabel(days: number): string {
  if (days === 0)  return "Aujourd'hui"
  if (days === 1)  return "Demain"
  if (days === -1) return "Hier"
  if (days > 0)    return `Dans ${days} j`
  return `Il y a ${Math.abs(days)} j`
}

// ─── Select stylisé ───────────────────────────────────────────────────────────

function StyledSelect({
  value,
  onChange,
  options,
  maxWidth = "260px",
}: {
  value:    string
  onChange: (v: string) => void
  options:  { label: string; value: string }[]
  maxWidth?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg text-sm transition-all duration-150 flex-shrink-0"
      style={{
        background: "var(--bg-elevated)",
        border:     "1px solid var(--bg-border)",
        color:      value ? "var(--text-primary)" : "var(--text-secondary)",
        padding:    "6px 10px",
        fontFamily: "'Syne', sans-serif",
        fontSize:   "0.8125rem",
        outline:    "none",
        cursor:     "pointer",
        maxWidth,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Carte jalon ──────────────────────────────────────────────────────────────

function MilestoneCard({ milestone }: { milestone: PipelineMilestone }) {
  const c       = MILESTONE_COLORS[milestone.statut]
  const days    = milestone.datePrevue ? daysUntil(milestone.datePrevue) : null
  const isPast  = days !== null && days < 0 && milestone.statut !== "Atteint"

  return (
    <div
      className="rounded-xl p-4 transition-all duration-150"
      style={{
        background: "rgba(13,26,16,0.65)",
        border:     `1px solid var(--bg-border)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c.dot
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--bg-border)"
      }}
    >
      {/* Ligne 1 : titre + badge statut */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
        >
          {milestone.titre}
        </p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: c.bg,
            color:      c.text,
            border:     `1px solid ${c.border}`,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {milestone.statut}
        </span>
      </div>

      {/* Ligne 2 : dates */}
      <div className="flex items-center gap-4 flex-wrap text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1">
          <Calendar size={10} style={{ color: isPast ? "#fbbf24" : "var(--text-muted)" }} />
          <span style={{ color: isPast ? "#fbbf24" : "var(--text-secondary)" }}>
            Prévu : {fmtDate(milestone.datePrevue)}
          </span>
          {days !== null && milestone.statut !== "Atteint" && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: isPast   ? "rgba(239,68,68,0.12)" : days <= 7 ? "rgba(245,158,11,0.12)" : "rgba(45,158,95,0.1)",
                color:      isPast   ? "#f87171"              : days <= 7 ? "#fbbf24"               : "#2d9e5f",
              }}
            >
              {daysLabel(days)}
            </span>
          )}
        </span>
        {milestone.dateReelle && (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={10} style={{ color: "#22c55e" }} />
            <span style={{ color: "#22c55e" }}>Réalisé : {fmtDate(milestone.dateReelle)}</span>
          </span>
        )}
      </div>

      {/* Description */}
      {milestone.description && (
        <p
          className="text-xs italic leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {milestone.description}
        </p>
      )}
    </div>
  )
}

// ─── Séparateur de groupe ─────────────────────────────────────────────────────

function GroupDivider({
  label,
  count,
  color = "var(--text-secondary)",
  collapsible = false,
  collapsed   = false,
  onToggle,
}: {
  label:       string
  count:       number
  color?:      string
  collapsible?: boolean
  collapsed?:  boolean
  onToggle?:   () => void
}) {
  return (
    <button
      onClick={collapsible ? onToggle : undefined}
      className="flex items-center gap-3 w-full text-left py-1"
      style={{ cursor: collapsible ? "pointer" : "default" }}
    >
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}
      >
        {label}
      </span>
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.05)",
          color:      "var(--text-muted)",
          border:     "1px solid var(--bg-border)",
        }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--bg-border)" }} />
      {collapsible && (
        collapsed
          ? <ChevronRightIcon size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          : <ChevronDown      size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
      )}
    </button>
  )
}

// ─── Élément de la timeline ───────────────────────────────────────────────────

function TimelineItem({
  milestone,
  isLast,
  showDate,
}: {
  milestone: PipelineMilestone
  isLast:    boolean
  showDate:  boolean
}) {
  const c = MILESTONE_COLORS[milestone.statut]

  return (
    <div className="relative flex gap-4">
      {/* Colonne gauche : date + dot + ligne */}
      <div className="flex flex-col items-center" style={{ width: "80px", flexShrink: 0 }}>
        {showDate && (
          <span
            className="text-xs font-semibold mb-1.5 text-center w-full"
            style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}
          >
            {fmtDateShort(milestone.datePrevue)}
          </span>
        )}
        <div
          className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 z-10"
          style={{
            background:  milestone.statut === "Atteint" ? c.dot : "var(--bg-surface)",
            borderColor: c.dot,
            boxShadow:   milestone.statut === "Atteint" ? `0 0 8px ${c.dot}55` : "none",
            marginTop:   showDate ? "0" : "2px",
          }}
        />
        {!isLast && (
          <div
            className="flex-1 w-0.5 mt-1"
            style={{ background: "rgba(30,53,40,0.5)", minHeight: "24px" }}
          />
        )}
      </div>

      {/* Carte */}
      <div className="flex-1 pb-5">
        <MilestoneCard milestone={milestone} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════════

export default function MilestonesView() {
  // ── Données ──────────────────────────────────────────────────────────────
  const { data: projets     = [], isLoading: loadingProjets                           } = useProjets()
  const { data: milestones  = [], isLoading: loadingMilestones, isError, refetch      } = usePipelineMilestones()

  // ── État local ────────────────────────────────────────────────────────────
  const [filterProjet,    setFilterProjet]   = useState("")
  const [filterStatut,    setFilterStatut]   = useState<StatutMilestone | "">("")
  const [atteintCollapse, setAtteintCollapse] = useState(true)

  // ── Données filtrées ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      if (filterProjet && m.projetId !== filterProjet) return false
      if (filterStatut && m.statut  !== filterStatut)  return false
      return true
    })
  }, [milestones, filterProjet, filterStatut])

  // ── Groupes de la timeline ────────────────────────────────────────────────
  const { enRetard, aujourd_hui, aVenir, atteints } = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = a.datePrevue || "9999-12-31"
      const db = b.datePrevue || "9999-12-31"
      return da.localeCompare(db)
    })

    const enRetard:    PipelineMilestone[] = []
    const aujourd_hui: PipelineMilestone[] = []
    const aVenir:      PipelineMilestone[] = []
    const atteints:    PipelineMilestone[] = []

    for (const m of sorted) {
      if (m.statut === "Atteint") {
        atteints.push(m)
        continue
      }
      const d = m.datePrevue || ""
      if (!d || d > TODAY)     aVenir.push(m)
      else if (d === TODAY)    aujourd_hui.push(m)
      else                     enRetard.push(m)
    }

    return { enRetard, aujourd_hui, aVenir, atteints }
  }, [filtered])

  // ── Statistiques globales ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = milestones.length
    const nbAtteint = milestones.filter((m) => m.statut === "Atteint").length
    const nbRetard  = milestones.filter(
      (m) => m.statut !== "Atteint" && m.datePrevue && m.datePrevue < TODAY,
    ).length
    const pct = total > 0 ? Math.round((nbAtteint / total) * 100) : 0
    return { total, nbAtteint, nbRetard, pct }
  }, [milestones])

  // ── États de chargement ───────────────────────────────────────────────────

  if (loadingMilestones || loadingProjets) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Erreur de chargement des jalons
        </p>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: "rgba(45,158,95,0.12)", border: "1px solid rgba(45,158,95,0.3)", color: "#2d9e5f" }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  if (milestones.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
      >
        <Flag size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
        >
          Aucun jalon dans le pipeline
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Les jalons créés depuis les fiches projet apparaîtront ici
        </p>
      </div>
    )
  }

  const totalFiltered = filtered.length
  const hasResults    = totalFiltered > 0

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barre de progression globale ─────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}
            >
              Progression globale des jalons
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <CheckCircle2 size={10} className="inline mr-1" />
              {stats.nbAtteint} / {stats.total} atteints
            </span>
            {stats.nbRetard > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <Clock size={10} className="inline mr-1" />
                {stats.nbRetard} en retard
              </span>
            )}
          </div>
          <span
            className="text-2xl font-extrabold"
            style={{ color: "#2d9e5f", fontFamily: "'Syne', sans-serif" }}
          >
            {stats.pct}%
          </span>
        </div>

        {/* Barre de progression */}
        <div
          className="w-full h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(30,53,40,0.5)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${stats.pct}%`,
              background: "linear-gradient(90deg, #2d9e5f, #22c55e)",
              boxShadow:  "0 0 8px rgba(34,197,94,0.4)",
            }}
          />
        </div>
      </div>

      {/* ── Barre de contrôles ────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.7)", border: "1px solid #1e3528" }}
      >
        <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

        <StyledSelect
          value={filterProjet}
          onChange={setFilterProjet}
          options={[
            { label: "Tous les projets", value: "" },
            ...projets.map((p) => ({ label: `${p.codeProjet} — ${p.titre}`, value: p.id })),
          ]}
        />

        <StyledSelect
          value={filterStatut}
          onChange={(v) => setFilterStatut(v as StatutMilestone | "")}
          options={[
            { label: "Tous les statuts", value: "" },
            ...STATUTS_MILESTONE.map((s) => ({ label: s, value: s })),
          ]}
          maxWidth="160px"
        />

        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {totalFiltered} jalon{totalFiltered !== 1 ? "s" : ""}
          {(filterProjet || filterStatut) && (
            <span style={{ color: "var(--text-muted)" }}> sur {milestones.length}</span>
          )}
        </span>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      {!hasResults ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
        >
          <Flag size={28} style={{ color: "#2d9e5f", opacity: 0.4 }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucun jalon ne correspond à vos filtres
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Groupe : En retard ─────────────────────────────────────── */}
          {enRetard.length > 0 && (
            <div className="space-y-3">
              <GroupDivider label="En retard" count={enRetard.length} color="#f87171" />
              <div className="space-y-0">
                {enRetard.map((m, i) => (
                  <TimelineItem
                    key={m.id}
                    milestone={m}
                    isLast={i === enRetard.length - 1 && aujourd_hui.length === 0 && aVenir.length === 0}
                    showDate={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Groupe : Aujourd'hui ───────────────────────────────────── */}
          {aujourd_hui.length > 0 && (
            <div className="space-y-3">
              <GroupDivider label="Aujourd'hui" count={aujourd_hui.length} color="#f0a500" />
              <div className="space-y-0">
                {aujourd_hui.map((m, i) => (
                  <TimelineItem
                    key={m.id}
                    milestone={m}
                    isLast={i === aujourd_hui.length - 1 && aVenir.length === 0}
                    showDate={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Groupe : À venir ───────────────────────────────────────── */}
          {aVenir.length > 0 && (
            <div className="space-y-3">
              <GroupDivider label="À venir" count={aVenir.length} color="#60a5fa" />
              <div className="space-y-0">
                {aVenir.map((m, i) => (
                  <TimelineItem
                    key={m.id}
                    milestone={m}
                    isLast={i === aVenir.length - 1}
                    showDate={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Groupe : Atteints (collapsible) ──────────────────────── */}
          {atteints.length > 0 && (
            <div className="space-y-3">
              <GroupDivider
                label="Atteints"
                count={atteints.length}
                color="#22c55e"
                collapsible
                collapsed={atteintCollapse}
                onToggle={() => setAtteintCollapse((v) => !v)}
              />
              {!atteintCollapse && (
                <div className="space-y-0">
                  {atteints.map((m, i) => (
                    <TimelineItem
                      key={m.id}
                      milestone={m}
                      isLast={i === atteints.length - 1}
                      showDate={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
