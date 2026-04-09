import { memo } from "react"
import { NavLink } from "react-router-dom"
import {
  BarChart3, Users, FileText, BookOpen, Wallet, LineChart,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react"
import logoGiwAnvo from "@/assets/logo africa.png"

/* ── Données statiques hissées hors du composant (rendering-hoist-jsx) ── */
const modules = [
  { path: "/budget",       label: "Budget",               Icon: BarChart3,    count: 3  },
  { path: "/rh",           label: "Ressources Humaines",  Icon: Users,        count: 7  },
  { path: "/achats",            label: "Achats",               Icon: FileText, count: 2  },
  { path: "/comptabilite", label: "Comptabilité",         Icon: BookOpen,     count: 5  },
  { path: "/tresorerie",   label: "Trésorerie",           Icon: Wallet,       count: 6  },
  { path: "/suivi",        label: "Suivi & Contrôle",     Icon: LineChart,    count: 4  },
] as const

/* ── NavItem défini en dehors pour éviter les remounts (rerender-no-inline-components) ── */
interface NavItemProps {
  path:      string
  label:     string
  Icon:      React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  count:     number
  collapsed: boolean
}

const NavItem = memo(function NavItem({ path, label, Icon, count, collapsed }: NavItemProps) {
  return (
    <NavLink to={path} title={collapsed ? label : undefined} className="block">
      {({ isActive }) => (
        <div
          className={`
            flex items-center gap-3 mx-2 mb-0.5 rounded-lg cursor-pointer
            transition-all duration-150
            ${collapsed ? "px-0 py-3 justify-center" : "py-2.5"}
            ${!isActive ? "hover:translate-x-[3px]" : ""}
          `}
          style={{
            borderLeft:      `3px solid ${isActive ? "var(--gold-warm)" : "transparent"}`,
            backgroundColor: isActive ? "rgba(45, 158, 95, 0.15)" : "transparent",
            color:           isActive ? "var(--text-primary)" : "var(--text-secondary)",
            paddingLeft:     collapsed ? undefined : isActive ? "10px" : "12px",
            paddingRight:    collapsed ? undefined : "12px",
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <Icon
            className="flex-shrink-0"
            style={{ width: 20, height: 20, color: isActive ? "var(--gold-warm)" : "currentColor" }}
          />
          {!collapsed && (
            <>
              <span className="font-display text-sm font-medium flex-1 truncate leading-none">
                {label}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-mono leading-none flex-shrink-0"
                style={{
                  backgroundColor: isActive ? "rgba(240,165,0,0.15)" : "var(--bg-surface)",
                  color:           isActive ? "var(--gold-warm)"      : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </>
          )}

          {/* Glow ambiant sur l'item actif */}
          {isActive && !collapsed && (
            <span
              className="absolute left-0 inset-y-0 w-0.5 rounded-full pointer-events-none"
              style={{ boxShadow: "2px 0 12px rgba(240,165,0,0.4)" }}
            />
          )}
        </div>
      )}
    </NavLink>
  )
})

/* ── Sidebar ── */
interface SidebarProps {
  collapsed: boolean
  onToggle:  () => void
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <aside
      className={`relative flex flex-col h-full flex-shrink-0 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
      style={{
        background:  "var(--sidebar-bg)",
        borderRight: "1px solid var(--bg-border)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center h-16 px-4 gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full transition-opacity hover:opacity-80"
            title="Agrandir le menu"
          >
            <img
              src={logoGiwAnvo}
              alt="GIW'ANVO"
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </button>
        ) : (
          <>
            <img
              src={logoGiwAnvo}
              alt="GIW'ANVO"
              style={{ height: 32, width: "auto", objectFit: "contain", flexShrink: 0 }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm leading-none tracking-wide" style={{ color: "var(--text-primary)" }}>
                GIW<span style={{ color: "var(--gold-warm)" }}>'ANVO</span>
              </p>
              <p className="text-[10px] mt-1 leading-none font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Énergie Propre
              </p>
            </div>
            <button
              onClick={onToggle}
              className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
                e.currentTarget.style.color           = "var(--text-secondary)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color           = "var(--text-muted)"
              }}
              title="Réduire le menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Label section ── */}
      {!collapsed && (
        <p
          className="text-[10px] font-semibold uppercase tracking-widest px-5 pt-5 pb-2"
          style={{ color: "var(--green-mid)" }}
        >
          Modules
        </p>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {collapsed && <div className="pt-2" />}
        {modules.map((mod) => (
          <NavItem
            key={mod.path}
            path={mod.path}
            label={mod.label}
            Icon={mod.Icon}
            count={mod.count}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── Pied ── */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: "1px solid var(--bg-border)" }}
      >
        {collapsed ? (
          <button
            onClick={() => console.log("Déconnexion")}
            title="Se déconnecter"
            className="w-full flex justify-center p-3 transition-colors duration-150"
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
        ) : (
          <div className="px-4 py-3">
            <button
              onClick={() => console.log("Déconnexion")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-150 text-sm font-display font-medium"
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
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Se déconnecter
            </button>
            <p className="text-[10px] font-mono mt-2 px-1" style={{ color: "var(--bg-border)" }}>
              GIW'ANVO Energy · v1.0
            </p>
          </div>
        )}

        {/* Bouton expand (collapsed only) */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="w-full flex justify-center p-2 transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
              e.currentTarget.style.color           = "var(--text-secondary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color           = "var(--text-muted)"
            }}
            title="Agrandir le menu"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
