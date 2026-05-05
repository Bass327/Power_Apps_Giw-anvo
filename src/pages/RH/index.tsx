import { useNavigate } from "react-router-dom"
import {
  Users, Briefcase, Calendar, UserX, Award, FileText,
  Mail, ChevronRight, CheckCircle, AlertCircle, ArrowLeft,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"
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

  /* Filtre les sous-modules selon les droits du rôle */
  const proceduresVisibles = PROCEDURES.filter((proc) => {
    if (!role) return true // rôle pas encore chargé → tout affiché
    switch (proc.id) {
      case "recrutement": return hasPermission(role, "canGererRecrutement")
      case "sanctions":   return hasPermission(role, "canGererSanctions")
      case "evaluations": return hasPermission(role, "canCreerEvaluation")
      case "courrier":    return hasPermission(role, "canGererCourrier")
      default:            return true
    }
  })

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Bouton retour tableau de bord ── */}
      <button
        onClick={() => navigate("/")}
        style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-muted)",
          fontFamily: "var(--font-body)", marginBottom: 20,
          transition: "color 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        Tableau de bord
      </button>

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
          — {proceduresVisibles.length} procédure{proceduresVisibles.length > 1 ? "s" : ""}
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
        {proceduresVisibles.map((proc) => {
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
                background: "var(--glass-card-bg)",
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
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {proc.label}
                </p>
                <p
                  style={{
                    fontSize: 13, margin: 0,
                    color: "var(--text-secondary)", fontFamily: "var(--font-body)",
                    lineHeight: 1.5,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
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
