import { Lock, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface AccessDeniedProps {
  message?: string
  /** Route vers laquelle revenir. Par défaut "/" (Tableau de bord). */
  backTo?:  string
  backLabel?: string
}

/**
 * Écran affiché quand un rôle n'a pas accès à un module.
 * Inclut toujours un lien de retour pour ne pas bloquer la navigation.
 */
export const AccessDenied = ({
  message    = "Vous n'avez pas accès à ce module",
  backTo     = "/",
  backLabel  = "Tableau de bord",
}: AccessDeniedProps) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <Lock className="w-9 h-9" style={{ color: "#ef4444" }} />
      </div>

      <div className="text-center max-w-sm">
        <h2
          className="font-display font-bold text-xl mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Accès restreint
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {message}
        </p>
      </div>

      <div
        className="text-xs px-4 py-2 rounded-full font-display"
        style={{
          backgroundColor: "rgba(239,68,68,0.06)",
          border:          "1px solid rgba(239,68,68,0.15)",
          color:           "#ef4444",
        }}
      >
        Contactez votre administrateur pour obtenir un accès
      </div>

      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-semibold transition-all"
        style={{
          color:      "var(--text-secondary)",
          background: "var(--bg-elevated)",
          border:     "1px solid var(--bg-border)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color           = "var(--text-primary)"
          e.currentTarget.style.borderColor     = "var(--green-vivid)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color           = "var(--text-secondary)"
          e.currentTarget.style.borderColor     = "var(--bg-border)"
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Retour — {backLabel}
      </button>
    </div>
  )
}
