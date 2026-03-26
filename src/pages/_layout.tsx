import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { RoleSwitcher } from "@/components/dev/RoleSwitcher"

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className="hidden lg:flex h-full">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Sidebar — mobile (drawer) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      {/* Colonne principale */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main
          className="flex-1 overflow-y-auto p-8"
          style={{ backgroundColor: "var(--bg-base)" }}
        >
          <Outlet />
        </main>
      </div>

      {/* Switcher de rôle — visible uniquement en développement */}
      {import.meta.env.DEV && <RoleSwitcher />}

    </div>
  )
}
