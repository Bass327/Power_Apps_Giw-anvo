import { useMemo } from "react"
import { useLocation } from "react-router-dom"
import { Menu, LogOut, Sun, Moon } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/use-theme"
import { NotificationBell } from "@/components/layout/NotificationBell"

/* ── Données statiques hissées hors du composant (rendering-hoist-jsx) ── */
const pageTitles: Record<string, string> = {
  "/":             "Tableau de bord",
  "/budget":       "Budget",
  "/rh":           "Ressources Humaines",
  "/achats":       "Achats",
  "/comptabilite": "Comptabilité",
  "/tresorerie":   "Trésorerie",
  "/suivi":        "Suivi & Contrôle",
}

const roleLabels: Record<string, string> = {
  "Directrice":  "D.G.",
  "RAF":         "RAF",
  "Chef Dept.":  "Chef",
  "Employé":     "Coll.",
  "Comptable":   "Compt.",
}

interface HeaderProps {
  onMenuToggle: () => void
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const { pathname }                         = useLocation()
  const title                                = pageTitles[pathname] ?? "GIW'ANVO"
  const { data: currentUser }               = useCurrentUser()
  const { logout }                           = useAuth()
  const { theme, toggleTheme }              = useTheme()
  /* Date en français — calculée une fois au montage */
  const frenchDate = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day:     "numeric",
        month:   "long",
        year:    "numeric",
      }),
    []
  )

  /* Données utilisateur — profil réel ou fallback pendant le chargement */
  const user = {
    name:     currentUser?.displayName ?? "…",
    initials: currentUser?.initials    ?? "?",
    role:     (currentUser?.role       ?? "Employé") as keyof typeof roleLabels,
    jobTitle: currentUser?.jobTitle    ?? "",
    photoUrl: currentUser?.photoUrl    ?? null,
  }

  return (
    <header className="glass-header h-16 flex items-center justify-between px-6 flex-shrink-0">

      {/* ── Gauche ── */}
      <div className="flex items-center gap-4">
        {/* Toggle mobile */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg transition-colors lg:hidden"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
            e.currentTarget.style.color           = "var(--text-secondary)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color           = "var(--text-muted)"
          }}
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest leading-none mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            GIW'ANVO Energy
          </p>
          <h1
            className="font-display font-bold leading-none"
            style={{ fontSize: 20, color: "var(--text-primary)" }}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* ── Droite ── */}
      <div className="flex items-center gap-3">
        {/* Date — masquée sur mobile */}
        <div className="text-right hidden md:block">
          <p
            className="text-xs leading-none capitalize"
            style={{ color: "var(--text-muted)" }}
          >
            {frenchDate}
          </p>
        </div>

        {/* Séparateur */}
        <div
          className="w-px h-8 hidden md:block"
          style={{ backgroundColor: "var(--bg-border)" }}
        />

        {/* Cloche de notification — visible pour Chef Dept. et Directrice */}
        <NotificationBell />

        {/* Bouton toggle dark / light */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          className="p-2 rounded-lg transition-all duration-200"
          style={{
            color:           "var(--text-muted)",
            backgroundColor: "var(--bg-elevated)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color           = "var(--gold-warm)"
            e.currentTarget.style.backgroundColor = "var(--bg-border)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color           = "var(--text-muted)"
            e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
          }}
        >
          {theme === "dark"
            ? <Sun  className="w-5 h-5" />
            : <Moon className="w-5 h-5" />
          }
        </button>

        {/* Séparateur */}
        <div
          className="w-px h-8 hidden sm:block"
          style={{ backgroundColor: "var(--bg-border)" }}
        />

        {/* Utilisateur */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block min-w-0 max-w-[150px]">
            <p className="text-sm font-semibold leading-none font-display truncate" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </p>
            <p className="text-xs mt-1 leading-none truncate" style={{ color: "var(--text-secondary)" }}>
              {user.jobTitle || roleLabels[user.role]}
            </p>
          </div>

          {/* Avatar — photo si disponible, initiales sinon */}
          <div className="relative flex-shrink-0">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover"
                style={{ boxShadow: "0 0 12px var(--gold-glow)" }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                  color:      "var(--text-inverse)",
                  boxShadow:  "0 0 12px var(--gold-glow)",
                }}
              >
                {user.initials}
              </div>
            )}

            {/* Badge rôle */}
            <span
              className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 py-px rounded leading-tight font-display"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color:           "var(--green-vivid)",
                border:          "1px solid var(--bg-border)",
              }}
            >
              {roleLabels[user.role]}
            </span>
          </div>

          {/* Bouton de déconnexion */}
          <button
            onClick={logout}
            title="Se déconnecter"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"
              e.currentTarget.style.color           = "#ef4444"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color           = "var(--text-muted)"
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
