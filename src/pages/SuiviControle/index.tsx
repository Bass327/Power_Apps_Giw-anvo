import { LineChart, BarChart3, TrendingUp, ClipboardCheck, FileText, ArrowRight, ArrowLeft, Zap } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"

/* ─── Sous-modules disponibles ──────────────────────────────────────────────── */
interface SubModule {
  id:          string
  label:       string
  description: string
  route:       string
  icon:        React.ElementType
  badge?:      string
  badgeColor?: string
  roles:       ("full" | "partial" | "read")[]
}

const SUB_MODULES: SubModule[] = [
  {
    id:          "pipeline-projets",
    label:       "Pipeline Projets Sénégal",
    description: "Suivi du portefeuille de projets solaires — du prospect à l'exploitation. KPIs, phases, priorités, financement, tâches et historique.",
    route:       "/suivi/pipeline-projets",
    icon:        Zap,
    badge:       "Nouveau",
    badgeColor:  "#f0a500",
    roles:       ["full", "partial", "read"],
  },
  {
    id:          "reporting-erd",
    label:       "Reporting Clients ERD",
    description: "Suivi des paiements clients ERD Kolda — taux de recouvrement, impayés, clients à jour, encaissements du mois.",
    route:       "/suivi/reporting-erd",
    icon:        BarChart3,
    badge:       "Nouveau",
    badgeColor:  "#f0a500",
    roles:       ["full", "partial", "read"],
  },
  {
    id:          "controle-financier",
    label:       "Contrôle financier interne",
    description: "Suivi des procédures de contrôle financier et audit interne.",
    route:       "/suivi",
    icon:        ClipboardCheck,
    roles:       ["full", "partial"],
  },
  {
    id:          "rapports",
    label:       "Rapports techniques et financiers",
    description: "Génération et archivage des rapports périodiques techniques et financiers.",
    route:       "/suivi",
    icon:        FileText,
    roles:       ["full", "partial"],
  },
  {
    id:          "suivi-budgetaire",
    label:       "Suivi budgétaire trimestriel",
    description: "Analyse de l'exécution budgétaire par trimestre et par ligne.",
    route:       "/suivi",
    icon:        TrendingUp,
    roles:       ["full"],
  },
]

export default function SuiviControlePage() {
  const { role, user } = useCurrentUser()
  const navigate       = useNavigate()
  const access         = role ? getModuleAccess(role, "suivi", user?.email) : "none"

  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.suivi ?? "Accès réservé au RAF et à la direction."} />
  }

  const visibleModules = SUB_MODULES.filter((m) => m.roles.includes(access as "full" | "partial" | "read"))

  return (
    <div className="space-y-8 p-6">

      {/* En-tête */}
      <div className="flex items-center gap-3">

        {/* Bouton retour tableau de bord */}
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{
            background:  "var(--bg-elevated)",
            border:      "1px solid var(--bg-border)",
            color:       "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#2d9e5f"
            e.currentTarget.style.color       = "#2d9e5f"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--bg-border)"
            e.currentTarget.style.color       = "var(--text-secondary)"
          }}
          title="Retour au tableau de bord"
        >
          <ArrowLeft size={16} />
        </button>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.25)" }}
        >
          <LineChart size={22} style={{ color: "#f472b6" }} />
        </div>

        <div className="min-w-0">
          <h1
            className="text-2xl font-bold truncate"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
          >
            Suivi &amp; Contrôle
          </h1>
          <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
            Tableau de contrôle global — reporting, indicateurs et conformité
          </p>
        </div>
      </div>

      {/* Grille des sous-modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleModules.map((mod) => {
          const Icon       = mod.icon
          const isDisabled = mod.route === "/suivi" && mod.id !== "reporting-erd"

          return (
            <button
              key={mod.id}
              onClick={() => !isDisabled && navigate(mod.route)}
              disabled={isDisabled}
              className="text-left rounded-2xl p-6 transition-all duration-200 group glass-card"
              style={{
                cursor:  isDisabled ? "default" : "pointer",
                opacity: isDisabled ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.borderColor = "#2d9e5f"
                  e.currentTarget.style.transform   = "scale(1.01)"
                  e.currentTarget.style.boxShadow   = "0 0 20px rgba(45,158,95,0.15)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bg-border)"
                e.currentTarget.style.transform   = "scale(1)"
                e.currentTarget.style.boxShadow   = ""
              }}
            >
              {/* Icône + badge */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)" }}
                >
                  <Icon size={18} style={{ color: "#f472b6" }} />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {mod.badge && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: "rgba(240,165,0,0.15)",
                        color:      mod.badgeColor ?? "#f0a500",
                        border:     "1px solid rgba(240,165,0,0.3)",
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {mod.badge}
                    </span>
                  )}
                  {isDisabled && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        color:      "var(--text-secondary)",
                        border:     "1px solid var(--bg-border)",
                      }}
                    >
                      Bientôt
                    </span>
                  )}
                </div>
              </div>

              {/* Titre */}
              <h3
                className="font-semibold mb-2 truncate"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)", fontSize: "1rem" }}
              >
                {mod.label}
              </h3>

              {/* Description */}
              <p
                className="text-sm mb-4"
                style={{
                  color:           "var(--text-secondary)",
                  display:         "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow:        "hidden",
                }}
              >
                {mod.description}
              </p>

              {/* Lien d'accès */}
              {!isDisabled && (
                <div
                  className="flex items-center gap-1 text-sm font-medium"
                  style={{ color: "#2d9e5f", fontFamily: "'Syne', sans-serif" }}
                >
                  <span>Ouvrir</span>
                  <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-1" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
