import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Flag,
  FolderOpen,
  History,
  Zap,
  Plus,
} from "lucide-react"
import { useProjets }      from "@/hooks/usePipeline"
import PipelineDashboard   from "./components/PipelineDashboard"
import ProjetsList         from "./components/ProjetsList"
import TasksView           from "./components/TasksView"
import MilestonesView      from "./components/MilestonesView"
import HistoriqueView      from "./components/HistoriqueView"
import DocumentsView      from "./components/DocumentsView"

// ─── Types internes ───────────────────────────────────────────────────────────

type PipelineView =
  | "dashboard"
  | "projets"
  | "taches"
  | "jalons"
  | "documents"
  | "historique"

interface TabConfig {
  id:    PipelineView
  label: string
  icon:  React.ElementType
  ready: boolean
}

// ─── Configuration des onglets ────────────────────────────────────────────────

const TABS: TabConfig[] = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard, ready: true  },
  { id: "projets",    label: "Projets",     icon: Briefcase,       ready: true  },
  { id: "taches",     label: "Tâches",      icon: CheckSquare,     ready: true  },
  { id: "jalons",     label: "Jalons",      icon: Flag,            ready: true  },
  { id: "documents",  label: "Documents",   icon: FolderOpen,      ready: true  },
  { id: "historique", label: "Historique",  icon: History,         ready: true  },
]

// ─── Hub principal ────────────────────────────────────────────────────────────

export default function PipelineProjetsPage() {
  const navigate                    = useNavigate()
  const [activeView, setActiveView] = useState<PipelineView>("dashboard")
  const { data: projets = [] }      = useProjets()

  // Badge de comptage sur l'onglet Projets
  const nbProjets = projets.length

  function renderView() {
    switch (activeView) {
      case "dashboard":  return <PipelineDashboard />
      case "projets":    return <ProjetsList />
      case "taches":     return <TasksView />
      case "jalons":     return <MilestonesView />
      case "documents":  return <DocumentsView />
      case "historique": return <HistoriqueView />
    }
  }

  return (
    <div className="space-y-6 p-6">

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">

          {/* Bouton retour */}
          <button
            onClick={() => navigate("/suivi")}
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
            title="Retour Suivi & Contrôle"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Icône module */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(240,165,0,0.12)",
              border:     "1px solid rgba(240,165,0,0.25)",
            }}
          >
            <Zap size={22} style={{ color: "#f0a500" }} />
          </div>

          {/* Titre */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-bold truncate"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
              >
                Pipeline Projets Sénégal
              </h1>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "rgba(240,165,0,0.15)",
                  color:      "#f0a500",
                  border:     "1px solid rgba(240,165,0,0.3)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Nouveau
              </span>
            </div>
            <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
              Suivi du portefeuille · du prospect à l'exploitation
            </p>
          </div>
        </div>

        {/* Bouton Nouveau projet */}
        <button
          onClick={() => navigate("/suivi/pipeline-projets/projets/nouveau")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, #f0a500, #ffc235)",
            color:      "var(--bg-base)",
            fontFamily: "'Syne', sans-serif",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88" }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"   }}
        >
          <Plus size={16} />
          Nouveau projet
        </button>
      </div>

      {/* ── Navigation onglets ─────────────────────────────────────────────── */}
      <div
        className="flex gap-1 overflow-x-auto p-1 rounded-xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
      >
        {TABS.map((tab) => {
          const Icon     = tab.icon
          const isActive = tab.id === activeView
          const showBadge = tab.id === "projets" && nbProjets > 0

          return (
            <button
              key={tab.id}
              onClick={() => tab.ready && setActiveView(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0"
              style={{
                background: isActive ? "rgba(240,165,0,0.12)" : "transparent",
                color:      isActive ? "#f0a500"               : "var(--text-secondary)",
                border:     isActive
                  ? "1px solid rgba(240,165,0,0.3)"
                  : "1px solid transparent",
                fontFamily: "'Syne', sans-serif",
                cursor:     tab.ready ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (!isActive && tab.ready) {
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
              {showBadge && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: isActive ? "rgba(240,165,0,0.2)" : "rgba(45,158,95,0.15)",
                    color:      isActive ? "#f0a500"              : "#2d9e5f",
                    minWidth:   "1.25rem",
                    textAlign:  "center",
                  }}
                >
                  {nbProjets}
                </span>
              )}
              {!tab.ready && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(107,114,128,0.15)",
                    color:      "var(--text-muted)",
                    fontSize:   "0.65rem",
                  }}
                >
                  Bientôt
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Contenu de la vue active ────────────────────────────────────────── */}
      <div>{renderView()}</div>
    </div>
  )
}
