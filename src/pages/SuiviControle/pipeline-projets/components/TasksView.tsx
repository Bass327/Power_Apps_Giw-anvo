/* ═══════════════════════════════════════════════════════════════════════════
   TasksView — Vue Tâches : Kanban + Table
   Données : usePipelineTasks() + useUpdateTask() + useProjets()
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react"
import {
  Columns,
  List,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  User,
  Calendar,
  CheckSquare,
  Filter,
} from "lucide-react"
import { useProjets, usePipelineTasks, useUpdateTask } from "@/hooks/usePipeline"
import {
  STATUTS_TACHE,
  STATUT_TACHE_COLORS,
  PRIORITE_COLORS,
  type PipelineTask,
  type StatutTache,
  type Priorite,
} from "@/types/pipeline"

// ─── Ordre des priorités pour le tri ──────────────────────────────────────────

const PRIO_ORDER: Record<Priorite, number> = {
  Critique: 0, Haute: 1, Moyenne: 2, Faible: 3,
}

const STATUT_ORDER: Record<StatutTache, number> = {
  "À faire": 0, "En cours": 1, "Bloqué": 2, "Terminé": 3,
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return ""
  const p = iso.split("-")
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

function isOverdue(dateLimite: string, statut: StatutTache): boolean {
  if (!dateLimite || statut === "Terminé") return false
  return dateLimite < new Date().toISOString().slice(0, 10)
}

// ─── Badge priorité ───────────────────────────────────────────────────────────

function PrioriteBadge({ priorite }: { priorite: Priorite }) {
  const c = PRIORITE_COLORS[priorite]
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: c.bg,
        color:      c.text,
        border:     `1px solid ${c.border}`,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {priorite}
    </span>
  )
}

// ─── Carte Kanban ─────────────────────────────────────────────────────────────

interface KanbanCardProps {
  task:      PipelineTask
  statut:    StatutTache
  onMove:    (task: PipelineTask, direction: "next" | "prev") => Promise<void>
  isLoading: boolean
}

function KanbanCard({ task, statut, onMove, isLoading }: KanbanCardProps) {
  const statutIdx = STATUTS_TACHE.indexOf(statut)
  const canNext   = statutIdx < STATUTS_TACHE.length - 1
  const canPrev   = statutIdx > 0
  const overdue   = isOverdue(task.dateLimite, statut)

  return (
    <div
      className="rounded-xl p-3 space-y-2.5 transition-all duration-150"
      style={{
        background: isLoading ? "rgba(13,26,16,0.4)" : "rgba(13,26,16,0.7)",
        border:     "1px solid var(--bg-border)",
        opacity:    isLoading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isLoading) e.currentTarget.style.borderColor = "#2d9e5f"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--bg-border)"
      }}
    >
      {/* Code projet */}
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded-md inline-block"
        style={{
          background:    "rgba(240,165,0,0.1)",
          color:         "#f0a500",
          border:        "1px solid rgba(240,165,0,0.2)",
          fontFamily:    "'Syne', sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        {task.projetCode || "—"}
      </span>

      {/* Titre */}
      <p
        className="text-sm font-medium leading-snug"
        style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
      >
        {task.titre}
      </p>

      {/* Priorité + Assignee */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PrioriteBadge priorite={task.priorite} />
        {task.assignee && (
          <span
            className="text-xs flex items-center gap-1 truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            <User size={10} />
            {task.assignee}
          </span>
        )}
      </div>

      {/* Date limite */}
      {task.dateLimite && (
        <div
          className="flex items-center gap-1 text-xs"
          style={{ color: overdue ? "#fbbf24" : "var(--text-muted)" }}
        >
          <Calendar size={10} />
          <span>{fmtDate(task.dateLimite)}</span>
          {overdue && (
            <span className="font-semibold" style={{ color: "#f59e0b" }}>
              · En retard
            </span>
          )}
        </div>
      )}

      {/* Boutons navigation statut */}
      <div
        className="flex items-center justify-between pt-1.5 border-t"
        style={{ borderColor: "rgba(30,53,40,0.4)" }}
      >
        <button
          onClick={() => { if (canPrev && !isLoading) void onMove(task, "prev") }}
          disabled={!canPrev || isLoading}
          title={canPrev ? `Revenir à "${STATUTS_TACHE[statutIdx - 1]}"` : ""}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: canPrev ? "rgba(107,114,128,0.12)" : "transparent",
            border:     canPrev ? "1px solid rgba(107,114,128,0.2)" : "1px solid transparent",
            color:      canPrev ? "var(--text-secondary)" : "transparent",
            cursor:     canPrev && !isLoading ? "pointer" : "default",
          }}
        >
          <ChevronLeft size={12} />
        </button>

        <span
          className="text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}
        >
          {isLoading ? "…" : `${statutIdx + 1}/${STATUTS_TACHE.length}`}
        </span>

        <button
          onClick={() => { if (canNext && !isLoading) void onMove(task, "next") }}
          disabled={!canNext || isLoading}
          title={canNext ? `Passer à "${STATUTS_TACHE[statutIdx + 1]}"` : ""}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: canNext ? "rgba(45,158,95,0.1)" : "transparent",
            border:     canNext ? "1px solid rgba(45,158,95,0.2)" : "1px solid transparent",
            color:      canNext ? "#2d9e5f" : "transparent",
            cursor:     canNext && !isLoading ? "pointer" : "default",
          }}
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Types tri table ──────────────────────────────────────────────────────────

type SortKey = "titre" | "projetCode" | "assignee" | "priorite" | "statut" | "dateLimite"
type SortDir = "asc" | "desc"

function compareTask(a: PipelineTask, b: PipelineTask, col: SortKey, dir: SortDir): number {
  let result = 0
  switch (col) {
    case "titre":      result = a.titre.localeCompare(b.titre, "fr"); break
    case "projetCode": result = (a.projetCode ?? "").localeCompare(b.projetCode ?? "", "fr"); break
    case "assignee":   result = (a.assignee ?? "").localeCompare(b.assignee ?? "", "fr"); break
    case "priorite":   result = PRIO_ORDER[a.priorite] - PRIO_ORDER[b.priorite]; break
    case "statut":     result = STATUT_ORDER[a.statut]  - STATUT_ORDER[b.statut];  break
    case "dateLimite":
      result = (a.dateLimite || "9999-12-31").localeCompare(b.dateLimite || "9999-12-31")
      break
  }
  return dir === "asc" ? result : -result
}

// ─── En-tête de colonne triable ───────────────────────────────────────────────

interface ThProps {
  label:     string
  col?:      SortKey
  sortCol:   SortKey
  sortDir:   SortDir
  onSort:    (col: SortKey) => void
  minWidth?: number
}

function Th({ label, col, sortCol, sortDir, onSort, minWidth }: ThProps) {
  const isActive = col !== undefined && col === sortCol
  return (
    <th
      onClick={col ? () => onSort(col) : undefined}
      className={col ? "cursor-pointer select-none" : ""}
      style={{
        padding:      "10px 14px",
        whiteSpace:   "nowrap",
        fontFamily:   "'Syne', sans-serif",
        fontSize:     "0.75rem",
        fontWeight:   600,
        color:        isActive ? "#f0a500" : "var(--text-secondary)",
        background:   "rgba(13,26,16,0.8)",
        borderBottom: "1px solid #1e3528",
        minWidth,
        userSelect:   "none",
        transition:   "color 150ms",
      }}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {col && (
          !isActive
            ? <ChevronsUpDown size={13} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
            : sortDir === "asc"
            ? <ChevronUp   size={13} style={{ color: "#f0a500" }} />
            : <ChevronDown size={13} style={{ color: "#f0a500" }} />
        )}
      </span>
    </th>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════════

export default function TasksView() {
  // ── Données ──────────────────────────────────────────────────────────────
  const { data: projets = [], isLoading: loadingProjets             } = useProjets()
  const { data: tasks   = [], isLoading: loadingTasks, isError, refetch } = usePipelineTasks()
  const updateTask = useUpdateTask()

  // ── État local ────────────────────────────────────────────────────────────
  const [filterProjet, setFilterProjet] = useState("")
  const [view,         setView]         = useState<"kanban" | "table">("kanban")
  const [sortCol,      setSortCol]      = useState<SortKey>("dateLimite")
  const [sortDir,      setSortDir]      = useState<SortDir>("asc")
  const [loadingId,    setLoadingId]    = useState<string | null>(null)

  // ── Tâches filtrées ───────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    if (!filterProjet) return tasks
    return tasks.filter((t) => t.projetId === filterProjet)
  }, [tasks, filterProjet])

  // ── Tâches groupées par statut pour le Kanban ─────────────────────────────
  const tasksByStatut = useMemo((): Record<StatutTache, PipelineTask[]> => {
    const result: Record<StatutTache, PipelineTask[]> = {
      "À faire":  [],
      "En cours": [],
      "Bloqué":   [],
      "Terminé":  [],
    }
    for (const t of filteredTasks) {
      result[t.statut]?.push(t)
    }
    return result
  }, [filteredTasks])

  // ── Tâches triées pour la table ───────────────────────────────────────────
  const sortedTasks = useMemo(
    () => [...filteredTasks].sort((a, b) => compareTask(a, b, sortCol, sortDir)),
    [filteredTasks, sortCol, sortDir],
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSort(col: SortKey) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortCol(col); setSortDir("asc") }
  }

  async function handleMove(task: PipelineTask, direction: "next" | "prev"): Promise<void> {
    const idx     = STATUTS_TACHE.indexOf(task.statut)
    const nextIdx = direction === "next" ? idx + 1 : idx - 1
    if (nextIdx < 0 || nextIdx >= STATUTS_TACHE.length) return
    const newStatut = STATUTS_TACHE[nextIdx]
    setLoadingId(task.id)
    try {
      await updateTask.mutateAsync({
        id:       task.id,
        projetId: task.projetId,
        fields:   { statut: newStatut },
      })
    } finally {
      setLoadingId(null)
    }
  }

  // ── État de chargement ────────────────────────────────────────────────────

  if (loadingTasks || loadingProjets) {
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
          Erreur de chargement des tâches
        </p>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{
            background: "rgba(45,158,95,0.12)",
            border:     "1px solid rgba(45,158,95,0.3)",
            color:      "#2d9e5f",
          }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
      >
        <CheckSquare size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
        >
          Aucune tâche dans le pipeline
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Les tâches créées depuis les fiches projet apparaîtront ici
        </p>
      </div>
    )
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Barre de contrôles ────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.7)", border: "1px solid #1e3528" }}
      >
        <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

        {/* Filtre par projet */}
        <select
          value={filterProjet}
          onChange={(e) => setFilterProjet(e.target.value)}
          className="rounded-lg text-sm transition-all duration-150 flex-shrink-0"
          style={{
            background: "var(--bg-elevated)",
            border:     "1px solid var(--bg-border)",
            color:      filterProjet ? "var(--text-primary)" : "var(--text-secondary)",
            padding:    "6px 10px",
            fontFamily: "'Syne', sans-serif",
            fontSize:   "0.8125rem",
            outline:    "none",
            cursor:     "pointer",
            maxWidth:   "280px",
          }}
        >
          <option value="">Tous les projets</option>
          {projets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codeProjet} — {p.titre}
            </option>
          ))}
        </select>

        {/* Compteur */}
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {filteredTasks.length} tâche{filteredTasks.length !== 1 ? "s" : ""}
          {filterProjet && (
            <span style={{ color: "var(--text-muted)" }}> sur {tasks.length}</span>
          )}
        </span>

        {/* Toggle Kanban / Table */}
        <div
          className="ml-auto flex items-center gap-1 p-1 rounded-xl flex-shrink-0"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
        >
          {(["kanban", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: view === v ? "rgba(240,165,0,0.12)" : "transparent",
                color:      view === v ? "#f0a500"               : "var(--text-secondary)",
                border:     view === v ? "1px solid rgba(240,165,0,0.3)" : "1px solid transparent",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {v === "kanban" ? <Columns size={13} /> : <List size={13} />}
              {v === "kanban" ? "Kanban" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Vue Kanban ─────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-2 items-start">
          {STATUTS_TACHE.map((statut) => {
            const col   = STATUT_TACHE_COLORS[statut]
            const cards = tasksByStatut[statut]

            return (
              <div
                key={statut}
                className="flex-shrink-0 flex flex-col gap-0"
                style={{ width: "260px" }}
              >
                {/* En-tête de colonne */}
                <div
                  className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl"
                  style={{ background: col.bg, border: `1px solid ${col.border}` }}
                >
                  <span
                    className="text-sm font-bold"
                    style={{ color: col.text, fontFamily: "'Syne', sans-serif" }}
                  >
                    {statut}
                  </span>
                  <span
                    className="text-xs font-bold min-w-[1.5rem] text-center px-1.5 py-0.5 rounded-full"
                    style={{ background: `${col.bg}`, color: col.text, border: `1px solid ${col.border}` }}
                  >
                    {cards.length}
                  </span>
                </div>

                {/* Cartes */}
                <div className="flex flex-col gap-2.5 min-h-[80px]">
                  {cards.length === 0 ? (
                    <div
                      className="flex items-center justify-center py-8 rounded-xl text-xs"
                      style={{
                        border: "1px dashed rgba(30,53,40,0.5)",
                        color:  "var(--text-muted)",
                      }}
                    >
                      Aucune tâche
                    </div>
                  ) : (
                    cards.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        statut={statut}
                        onMove={handleMove}
                        isLoading={loadingId === task.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vue Table ──────────────────────────────────────────────────────── */}
      {view === "table" && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid #1e3528" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th label="Projet"   col="projetCode" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={90}  />
                  <Th label="Tâche"    col="titre"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={180} />
                  <Th label="Assigné"  col="assignee"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={120} />
                  <Th label="Priorité" col="priorite"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={90}  />
                  <Th label="Statut"   col="statut"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={100} />
                  <Th label="Échéance" col="dateLimite" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={110} />
                  <th
                    style={{
                      padding:      "10px 14px",
                      background:   "rgba(13,26,16,0.8)",
                      borderBottom: "1px solid #1e3528",
                      minWidth:     72,
                    }}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12"
                      style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
                    >
                      Aucune tâche pour ce projet
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task, idx) => {
                    const overdue   = isOverdue(task.dateLimite, task.statut)
                    const sc        = STATUT_TACHE_COLORS[task.statut]
                    const isEven    = idx % 2 === 0
                    const isLoading = loadingId === task.id
                    const statutIdx = STATUTS_TACHE.indexOf(task.statut)
                    const canPrev   = statutIdx > 0
                    const canNext   = statutIdx < STATUTS_TACHE.length - 1

                    return (
                      <tr
                        key={task.id}
                        style={{
                          background: isEven ? "rgba(13,26,16,0.4)" : "rgba(13,26,16,0.2)",
                          transition: "background 150ms",
                          opacity:    isLoading ? 0.65 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(45,158,95,0.05)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isEven
                            ? "rgba(13,26,16,0.4)"
                            : "rgba(13,26,16,0.2)"
                        }}
                      >
                        {/* Code projet */}
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: "#f0a500" }}
                          >
                            {task.projetCode || "—"}
                          </span>
                        </td>

                        {/* Titre + description */}
                        <td
                          style={{
                            padding:     "10px 14px",
                            borderBottom: "1px solid rgba(30,53,40,0.4)",
                            maxWidth:    220,
                          }}
                        >
                          <p
                            className="text-sm font-medium truncate"
                            style={{
                              color:      "var(--text-primary)",
                              fontFamily: "'Syne', sans-serif",
                            }}
                            title={task.titre}
                          >
                            {task.titre}
                          </p>
                          {task.description && (
                            <p
                              className="text-xs mt-0.5 truncate italic"
                              style={{ color: "var(--text-muted)" }}
                              title={task.description}
                            >
                              {task.description}
                            </p>
                          )}
                        </td>

                        {/* Assigné */}
                        <td
                          style={{
                            padding:     "10px 14px",
                            borderBottom: "1px solid rgba(30,53,40,0.4)",
                            maxWidth:    140,
                          }}
                        >
                          {task.assignee ? (
                            <span
                              className="text-sm flex items-center gap-1 truncate"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <User size={11} style={{ flexShrink: 0 }} />
                              {task.assignee}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>—</span>
                          )}
                        </td>

                        {/* Priorité */}
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                          <PrioriteBadge priorite={task.priorite} />
                        </td>

                        {/* Statut */}
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: sc.bg,
                              color:      sc.text,
                              border:     `1px solid ${sc.border}`,
                              fontFamily: "'Syne', sans-serif",
                            }}
                          >
                            {task.statut}
                          </span>
                        </td>

                        {/* Échéance */}
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                          {task.dateLimite ? (
                            <span
                              className="text-sm font-medium"
                              style={{ color: overdue ? "#fbbf24" : "var(--text-secondary)" }}
                            >
                              {fmtDate(task.dateLimite)}
                              {overdue && (
                                <span className="block text-xs" style={{ color: "#f59e0b" }}>
                                  En retard
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>—</span>
                          )}
                        </td>

                        {/* Actions ← → */}
                        <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { if (canPrev && !isLoading) void handleMove(task, "prev") }}
                              disabled={!canPrev || isLoading}
                              title={canPrev ? `Revenir à "${STATUTS_TACHE[statutIdx - 1]}"` : ""}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                              style={{
                                background: canPrev ? "rgba(107,114,128,0.1)" : "transparent",
                                border:     canPrev ? "1px solid rgba(107,114,128,0.2)" : "1px solid transparent",
                                color:      canPrev ? "var(--text-secondary)" : "var(--text-muted)",
                                cursor:     canPrev && !isLoading ? "pointer" : "default",
                                opacity:    canPrev ? 1 : 0.3,
                              }}
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              onClick={() => { if (canNext && !isLoading) void handleMove(task, "next") }}
                              disabled={!canNext || isLoading}
                              title={canNext ? `Passer à "${STATUTS_TACHE[statutIdx + 1]}"` : ""}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                              style={{
                                background: canNext ? "rgba(45,158,95,0.1)" : "transparent",
                                border:     canNext ? "1px solid rgba(45,158,95,0.2)" : "1px solid transparent",
                                color:      canNext ? "#2d9e5f" : "var(--text-muted)",
                                cursor:     canNext && !isLoading ? "pointer" : "default",
                                opacity:    canNext ? 1 : 0.3,
                              }}
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
