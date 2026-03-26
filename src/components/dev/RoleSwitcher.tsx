import { useState } from "react"
import { Users } from "lucide-react"
import type { UserRole } from "@/types/user"

const DEV_ROLE_KEY = "dev_role"

const ROLES: { role: UserRole; icon: string; label: string }[] = [
  { role: "Employé",    icon: "👤", label: "Employé"    },
  { role: "Chef Dept.", icon: "👔", label: "Chef Dept."  },
  { role: "RAF",        icon: "💼", label: "RAF"         },
  { role: "Comptable",  icon: "🧾", label: "Comptable"  },
  { role: "Directrice", icon: "👑", label: "Directrice" },
]

export const RoleSwitcher = () => {
  const [open, setOpen] = useState(false)
  const currentDevRole = localStorage.getItem(DEV_ROLE_KEY) as UserRole | null

  const handleSelectRole = (role: UserRole) => {
    localStorage.setItem(DEV_ROLE_KEY, role)
    window.location.reload()
  }

  const handleClearRole = () => {
    localStorage.removeItem(DEV_ROLE_KEY)
    window.location.reload()
  }

  return (
    <div style={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999 }}>

      {/* Panel déroulant — s'ouvre vers le haut */}
      {open && (
        <div
          style={{
            position:        "absolute",
            bottom:          "calc(100% + 8px)",
            right:           0,
            width:           210,
            backgroundColor: "var(--bg-surface)",
            border:          "1px solid var(--bg-border)",
            borderRadius:    12,
            padding:         16,
            boxShadow:       "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* En-tête */}
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            🧪 Mode Test
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, fontFamily: "var(--font-display)" }}>
            Simuler un rôle
          </p>

          {/* Boutons de rôle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ROLES.map(({ role, icon, label }) => {
              const isActive = currentDevRole === role
              return (
                <button
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             8,
                    padding:         "8px 12px",
                    borderRadius:    8,
                    border:          isActive ? "1px solid var(--green-vivid)" : "1px solid var(--bg-border)",
                    backgroundColor: isActive ? "rgba(45,158,95,0.15)" : "var(--bg-elevated)",
                    color:           isActive ? "var(--green-bright)" : "var(--text-secondary)",
                    fontSize:        13,
                    fontFamily:      "var(--font-display)",
                    cursor:          "pointer",
                    textAlign:       "left",
                    transition:      "all 150ms",
                  }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {isActive && (
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--green-vivid)" }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Rôle actuel + bouton reset */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bg-border)" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Rôle actuel : <span style={{ color: "var(--gold-warm)", fontWeight: 600 }}>{currentDevRole ?? "SharePoint"}</span>
            </p>
            {currentDevRole && (
              <button
                onClick={handleClearRole}
                style={{
                  width:           "100%",
                  padding:         "6px 0",
                  borderRadius:    6,
                  border:          "1px solid rgba(239,68,68,0.3)",
                  backgroundColor: "rgba(239,68,68,0.08)",
                  color:           "#ef4444",
                  fontSize:        11,
                  cursor:          "pointer",
                  fontFamily:      "var(--font-display)",
                }}
              >
                Réinitialiser (vrai rôle SP)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bouton toggle flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Switcher de rôle (DEV)"
        style={{
          width:           44,
          height:          44,
          borderRadius:    "50%",
          backgroundColor: open ? "var(--gold-bright)" : "var(--gold-warm)",
          color:           "#080f0b",
          border:          "none",
          cursor:          "pointer",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          boxShadow:       "0 4px 16px rgba(240,165,0,0.4)",
          transition:      "all 200ms",
        }}
      >
        <Users size={18} />
      </button>

    </div>
  )
}
