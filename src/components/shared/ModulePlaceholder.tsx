import { Construction, ClipboardList, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { AccessLevel } from "@/lib/permissions"
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_COLORS } from "@/lib/permissions"

interface Procedure {
  name: string
  list: string
}

interface ModulePlaceholderProps {
  label:        string
  description:  string
  Icon:         React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  iconColor:    string
  bgColor:      string
  procedures:   Procedure[]
  /** Niveau d'accès de l'utilisateur — affiche un badge coloré si fourni */
  accessLevel?: Exclude<AccessLevel, "none">
}

export const ModulePlaceholder = ({
  label,
  description,
  Icon,
  iconColor,
  bgColor,
  procedures,
  accessLevel,
}: ModulePlaceholderProps) => {
  const navigate    = useNavigate()
  const accessStyle = accessLevel ? ACCESS_LEVEL_COLORS[accessLevel] : null

  return (
    <div className="max-w-2xl animate-fade-in">

      {/* Bouton retour tableau de bord */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 mb-6 text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Tableau de bord
      </button>

      {/* En-tête du module */}
      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="w-8 h-8" style={{ color: iconColor }} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="font-display font-bold text-2xl leading-tight" style={{ color: "var(--text-primary)" }}>
              {label}
            </h2>

            {/* Badge "En développement" */}
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#f5c84215", color: "#f5c842", border: "1px solid #f5c84230" }}
            >
              <Construction className="w-3 h-3" />
              En développement
            </span>

            {/* Badge niveau d'accès */}
            {accessStyle && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full font-display"
                style={{
                  backgroundColor: accessStyle.bg,
                  color:           accessStyle.color,
                  border:          `1px solid ${accessStyle.border}`,
                }}
              >
                {ACCESS_LEVEL_LABELS[accessLevel!]}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        </div>
      </div>

      {/* Liste des procédures */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        {/* En-tête du tableau */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}
        >
          <ClipboardList className="w-4 h-4" style={{ color: "var(--gold-warm)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--gold-warm)" }}>
            Procédures — {procedures.length} au total
          </p>
        </div>

        {/* Lignes */}
        {procedures.map((proc, index) => (
          <div
            key={index}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
            style={{ borderBottom: index < procedures.length - 1 ? "1px solid var(--bg-border)" : "none" }}
          >
            {/* Numéro */}
            <span
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--gold-warm)" }}
            >
              {index + 1}
            </span>

            {/* Nom */}
            <p className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>
              {proc.name}
            </p>

            {/* Liste SharePoint */}
            <span
              className="text-xs font-mono px-2 py-0.5 rounded hidden sm:block"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {proc.list}
            </span>

            {/* Statut */}
            <span
              className="text-xs px-2 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              À venir
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
