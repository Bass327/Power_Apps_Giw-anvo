import { Lock } from "lucide-react"

interface AccessDeniedProps {
  message?: string
}

/**
 * Écran affiché quand un rôle n'a pas accès à un module.
 * Utiliser via RoleGuard ou directement dans les pages.
 */
export const AccessDenied = ({ message = "Vous n'avez pas accès à ce module" }: AccessDeniedProps) => {
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
    </div>
  )
}
