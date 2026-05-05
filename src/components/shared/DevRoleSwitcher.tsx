import { useState } from "react"
import type { UserRole } from "@/types/user"
import { useCurrentUser } from "@/hooks/useCurrentUser"

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: "Directrice", label: "Administrateur (Directrice)", color: "#f0a500" },
  { value: "RAF",        label: "RAF",                         color: "#3dbf72" },
  { value: "Comptable",  label: "Comptable",                   color: "#60a5fa" },
  { value: "Chef Dept.", label: "Chef Département",            color: "#a78bfa" },
  { value: "Employé",    label: "Employé",                     color: "#7a9e87" },
]

const OWNER_EMAIL   = "bachir.diop@giwa-anvo.energy"
const STORAGE_KEY   = "role_override"

export function DevRoleSwitcher() {
  const { user } = useCurrentUser()
  const [open, setOpen]     = useState(false)
  const [current, setCurrent] = useState<UserRole | null>(
    () => localStorage.getItem(STORAGE_KEY) as UserRole | null
  )

  // Visible uniquement pour le compte propriétaire de l'app
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) return null

  function select(role: UserRole) {
    localStorage.setItem(STORAGE_KEY, role)
    setCurrent(role)
    setOpen(false)
    window.location.reload()
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY)
    setCurrent(null)
    setOpen(false)
    window.location.reload()
  }

  const active = ROLES.find(r => r.value === current)

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          right: 0,
          background: "#0d1a10",
          border: "1px solid #1e3528",
          borderRadius: 12,
          padding: "8px 0",
          minWidth: 220,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <p style={{
            color: "#3d6650",
            fontSize: 11,
            padding: "4px 14px 8px",
            fontFamily: "DM Sans, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}>
            Vue simulée
          </p>

          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => select(r.value)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 14px",
                background: current === r.value ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none",
                cursor: "pointer",
                color: r.color,
                fontFamily: "Syne, sans-serif",
                fontSize: 13,
                fontWeight: current === r.value ? 700 : 400,
              }}
            >
              {current === r.value ? "✓ " : ""}{r.label}
            </button>
          ))}

          <div style={{ height: 1, background: "#1e3528", margin: "6px 0" }} />
          <button
            onClick={reset}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: current ? "#ef4444" : "#3d6650",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
            }}
          >
            {current ? "Réinitialiser (mon vrai rôle SP)" : "Aucune simulation active"}
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Simulateur de rôle"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: active ? active.color : "#1e3528",
          border: `2px solid ${active ? active.color : "#3d6650"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          boxShadow: active ? `0 0 16px ${active.color}55` : "none",
          transition: "all 200ms",
        }}
      >
        👤
      </button>
    </div>
  )
}
