import { useNavigate } from "react-router-dom"
import {
  Users, Briefcase, Calendar, UserX, Award, FileText,
  Mail, ChevronRight, Clock, CheckCircle, AlertCircle, TrendingUp,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"

/* ── Procédures du module ── */
interface Procedure {
  id:          string
  label:       string
  description: string
  icon:        React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>
  route?:      string       // route interne — undefined = en développement
  count?:      number       // badge numérique optionnel
  accentColor: string
  accentBg:    string
}

const PROCEDURES: Procedure[] = [
  {
    id:          "recrutement",
    label:       "Recrutement",
    description: "Ouverture de postes, dossiers candidats et suivi des recrutements.",
    icon:        UserX,
    route:       "/rh/recrutement",
    accentColor: "#a78bfa",
    accentBg:    "rgba(167,139,250,0.12)",
  },
  {
    id:          "missions",
    label:       "Gestion des missions",
    description: "Ordres de mission, déplacements terrain et suivi du personnel.",
    icon:        Briefcase,
    route:       "/rh/missions",
    accentColor: "#f0a500",
    accentBg:    "rgba(240,165,0,0.12)",
  },
  {
    id:          "conges",
    label:       "Gestion des congés",
    description: "Demandes de congés annuels, maternité, sans solde et exceptionnels.",
    icon:        Calendar,
    route:       "/rh/conges",
    accentColor: "#22c55e",
    accentBg:    "rgba(34,197,94,0.12)",
  },
  {
    id:          "absences",
    label:       "Gestion des absences",
    description: "Signalement, justification et suivi des absences du personnel.",
    icon:        AlertCircle,
    route:       "/rh/absences",
    accentColor: "#ef4444",
    accentBg:    "rgba(239,68,68,0.12)",
  },
  {
    id:          "sanctions",
    label:       "Sanctions disciplinaires",
    description: "Gestion des procédures disciplinaires et sanctions réglementaires.",
    icon:        FileText,
    route:       "/rh/sanctions",
    accentColor: "#f59e0b",
    accentBg:    "rgba(245,158,11,0.12)",
  },
  {
    id:          "evaluations",
    label:       "Évaluation des performances",
    description: "Fiches d'évaluation annuelle et suivi des objectifs individuels.",
    icon:        Award,
    route:       "/rh/evaluations",
    accentColor: "#60a5fa",
    accentBg:    "rgba(96,165,250,0.12)",
  },
  {
    id:          "courrier",
    label:       "Gestion du courrier",
    description: "Enregistrement, dispatch et archivage du courrier entrant et sortant.",
    icon:        Mail,
    route:       "/rh/courrier",
    accentColor: "#34d399",
    accentBg:    "rgba(52,211,153,0.12)",
  },
]

/* ── KPI fictifs (remplacés par SharePoint au fil du dev) ── */
interface KpiCard {
  label:   string
  value:   string | number
  icon:    React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>
  color:   string
  bg:      string
  sublabel?: string
}

const KPI_CARDS: KpiCard[] = [
  {
    label:    "Effectif actif",
    value:    12,
    icon:     Users,
    color:    "#22c55e",
    bg:       "rgba(34,197,94,0.12)",
    sublabel: "collaborateurs",
  },
  {
    label:    "Missions en cours",
    value:    3,
    icon:     Briefcase,
    color:    "#f0a500",
    bg:       "rgba(240,165,0,0.12)",
    sublabel: "actives",
  },
  {
    label:    "Congés en attente",
    value:    2,
    icon:     Clock,
    color:    "#60a5fa",
    bg:       "rgba(96,165,250,0.12)",
    sublabel: "à valider",
  },
  {
    label:    "Taux présence",
    value:    "94 %",
    icon:     TrendingUp,
    color:    "#34d399",
    bg:       "rgba(52,211,153,0.12)",
    sublabel: "ce mois-ci",
  },
]

/* ════════════════════════════════════════════════
   Composant principal
   ════════════════════════════════════════════════ */

export default function RHPage() {
  const { role, user } = useCurrentUser()
  const displayName = user?.displayName
  const navigate              = useNavigate()
  const access                = role ? getModuleAccess(role, "rh") : "none"

  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.rh} />
  }

  const isFullAccess = access === "full"

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── En-tête ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(96,165,250,0.12)",
              border: "1px solid rgba(96,165,250,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Users size={20} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-body)" }}>
              Module
            </p>
            <h1
              style={{
                fontSize: 24, fontWeight: 700, margin: 0,
                color: "var(--text-primary)", fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              Ressources Humaines
            </h1>
          </div>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-body)" }}>
          {isFullAccess
            ? `Bonjour ${displayName ?? role} — Gestion complète du personnel, missions, congés et évaluations.`
            : `Bonjour ${displayName ?? role} — Consultez vos congés, missions et absences personnelles.`
          }
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {KPI_CARDS.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "rgba(13,26,16,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--bg-border)",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p
                  style={{
                    fontSize: 12, color: "var(--text-secondary)",
                    margin: "0 0 8px", fontFamily: "var(--font-body)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}
                >
                  {kpi.label}
                </p>
                <p
                  style={{
                    fontSize: 32, fontWeight: 800, margin: 0,
                    color: "var(--text-primary)", fontFamily: "var(--font-display)",
                    letterSpacing: "-0.02em", lineHeight: 1,
                  }}
                >
                  {kpi.value}
                </p>
                {kpi.sublabel && (
                  <p style={{ fontSize: 12, color: kpi.color, margin: "4px 0 0", fontFamily: "var(--font-body)" }}>
                    {kpi.sublabel}
                  </p>
                )}
              </div>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: kpi.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Titre section procédures ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <CheckCircle size={16} style={{ color: "var(--green-vivid)" }} />
        <h2
          style={{
            fontSize: 15, fontWeight: 600, margin: 0,
            color: "var(--text-primary)", fontFamily: "var(--font-display)",
          }}
        >
          Procédures disponibles
        </h2>
        <span
          style={{
            fontSize: 11, fontFamily: "var(--font-body)",
            color: "var(--text-secondary)", marginLeft: 4,
          }}
        >
          — 7 procédures
        </span>
      </div>

      {/* ── Grille des procédures ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 16,
        }}
      >
        {PROCEDURES.map((proc) => {
          const isActive    = !!proc.route
          const Icon        = proc.icon

          return (
            <button
              key={proc.id}
              onClick={() => isActive && navigate(proc.route!)}
              disabled={!isActive}
              style={{
                all: "unset",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "20px 24px",
                background: "rgba(13,26,16,0.7)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${isActive ? "var(--bg-border)" : "rgba(30,53,40,0.5)"}`,
                borderRadius: 14,
                cursor: isActive ? "pointer" : "default",
                transition: "all 200ms cubic-bezier(0.4,0,0.2,1)",
                textAlign: "left",
                opacity: isActive ? 1 : 0.65,
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!isActive) return
                const el = e.currentTarget
                el.style.borderColor = proc.accentColor
                el.style.transform   = "translateY(-2px)"
                el.style.boxShadow   = `0 8px 32px ${proc.accentBg}`
              }}
              onMouseLeave={(e) => {
                if (!isActive) return
                const el = e.currentTarget
                el.style.borderColor = "var(--bg-border)"
                el.style.transform   = "translateY(0)"
                el.style.boxShadow   = "none"
              }}
            >
              {/* Badge "En développement" */}
              {!isActive && (
                <span
                  style={{
                    position: "absolute", top: 12, right: 12,
                    fontSize: 10, fontFamily: "var(--font-body)",
                    color: "var(--text-muted)",
                    background: "var(--bg-border)",
                    padding: "2px 8px",
                    borderRadius: 20,
                    letterSpacing: "0.04em",
                  }}
                >
                  En développement
                </span>
              )}

              {/* Icône + badge numérique */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: proc.accentBg,
                    border: `1px solid ${proc.accentColor}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={20} style={{ color: proc.accentColor }} />
                </div>
                {proc.count !== undefined && proc.count > 0 && (
                  <span
                    style={{
                      fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700,
                      color: "var(--text-inverse)",
                      background: "linear-gradient(135deg, #f0a500, #ffc235)",
                      padding: "2px 8px",
                      borderRadius: 20,
                    }}
                  >
                    {proc.count}
                  </span>
                )}
              </div>

              {/* Label + description */}
              <div>
                <p
                  style={{
                    fontSize: 15, fontWeight: 600, margin: "0 0 4px",
                    color: "var(--text-primary)", fontFamily: "var(--font-display)",
                  }}
                >
                  {proc.label}
                </p>
                <p
                  style={{
                    fontSize: 13, margin: 0,
                    color: "var(--text-secondary)", fontFamily: "var(--font-body)",
                    lineHeight: 1.5,
                  }}
                >
                  {proc.description}
                </p>
              </div>

              {/* Flèche de navigation */}
              {isActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: proc.accentColor, fontFamily: "var(--font-body)" }}>
                    Accéder
                  </span>
                  <ChevronRight size={14} style={{ color: proc.accentColor }} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
