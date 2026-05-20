import { useState, useEffect, useRef, useMemo } from "react"
import { Bell, Clock, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import { useDemandesAbsences } from "@/hooks/useDemandesAbsences"
import { useMissions } from "@/hooks/useMissions"
import { useDecaissements } from "@/hooks/useDecaissements"
import { formatFCFA, formatDateFr } from "@/lib/utils"

function joursAttente(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

/* ── Élément unifié de la liste de notifications ── */
interface NotifItem {
  id:       string
  module:   "achat" | "absence" | "mission" | "decaissement"
  titre:    string
  date:     string
  route:    string
  urgente:  boolean
  montant?: number
}

const MODULE_CONFIG: Record<NotifItem["module"], { color: string; bg: string; label: string }> = {
  achat:        { color: "#f0a500", bg: "rgba(240,165,0,0.15)",   label: "Achat" },
  absence:      { color: "#60a5fa", bg: "rgba(59,130,246,0.15)",  label: "Absence" },
  mission:      { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "Mission" },
  decaissement: { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Décaissement" },
}

export function NotificationBell() {
  const [ouvert, setOuvert]           = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const buttonRef                     = useRef<HTMLButtonElement>(null)
  const dropdownRef                   = useRef<HTMLDivElement>(null)
  const navigate                      = useNavigate()

  const { user: currentUser } = useCurrentUser()
  const role      = currentUser?.role ?? ""
  const userEmail = (currentUser?.email ?? "").toLowerCase()
  const userDept  = currentUser?.departement ?? ""

  /* Toujours appelés — TanStack Query déduplique les requêtes si déjà en cache */
  const { data: achats = [],        isLoading: l1 } = useDemandesAchats()
  const { data: absences = [],      isLoading: l2 } = useDemandesAbsences()
  const { data: missions = [],      isLoading: l3 } = useMissions()
  const { data: decaissements = [], isLoading: l4 } = useDecaissements()
  const isLoading = l1 || l2 || l3 || l4

  /* ── Construction de la liste unifiée selon le rôle ── */
  const items = useMemo<NotifItem[]>(() => {
    if (!role) return []

    const mk = (
      id:       string,
      module:   NotifItem["module"],
      titre:    string,
      date:     string,
      route:    string,
      montant?: number,
    ): NotifItem => ({ id, module, titre, date, route, montant, urgente: joursAttente(date) > 3 })

    if (role === "Chef Dept.") {
      return [
        ...achats
          .filter((d) => d.statut === "SOUMIS")
          .map((d) => mk(d.id, "achat", d.titre, d.dateDemande, "/achats", d.montant)),
        ...absences
          .filter((a) => a.statut === "SOUMIS" && a.departement === userDept)
          .map((a) => mk(a.id, "absence", `${a.nomDemandeur} — ${a.nbJoursDemandes} jour${a.nbJoursDemandes > 1 ? "s" : ""}`, a.dateDemande, "/rh/absences")),
      ].sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) || new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    if (role === "Directrice") {
      return [
        ...achats
          .filter((d) => d.statut === "VALIDE_CHEF")
          .map((d) => mk(d.id, "achat", d.titre, d.dateDemande, "/achats", d.montant)),
        ...absences
          .filter((a) => a.statut === "SOUMIS" || a.statut === "VALIDE_CHEF")
          .map((a) => mk(a.id, "absence", `${a.nomDemandeur} — ${a.nbJoursDemandes} jour${a.nbJoursDemandes > 1 ? "s" : ""}`, a.dateDemande, "/rh/absences")),
        ...missions
          .filter((m) => m.statut === "SOUMIS")
          .map((m) => mk(m.id, "mission", m.intitule, m.dateDemande, "/rh/missions")),
      ].sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) || new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    if (role === "RAF") {
      return [
        ...decaissements
          .filter((d) => d.statut === "SOUMIS")
          .map((d) => mk(d.id, "decaissement", d.titre || d.motif || "Décaissement", d.dateDemande, "/tresorerie", d.montant)),
      ].sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) || new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    if (role === "Comptable") {
      return [
        ...achats
          .filter((d) => d.statut === "APPROUVE")
          .map((d) => mk(d.id, "achat", d.titre, d.dateDemande, "/achats", d.montant)),
      ].sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) || new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    /* Employé — ses propres demandes en attente de validation */
    return [
      ...achats
        .filter((d) => d.demandeur.toLowerCase() === userEmail && ["SOUMIS", "VALIDE_CHEF"].includes(d.statut))
        .map((d) => mk(d.id, "achat", d.titre, d.dateDemande, "/achats", d.montant)),
      ...absences
        .filter((a) => a.demandeur.toLowerCase() === userEmail && ["SOUMIS", "VALIDE_CHEF"].includes(a.statut))
        .map((a) => mk(a.id, "absence", a.codeDemande || "Autorisation d'absence", a.dateDemande, "/rh/absences")),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [role, achats, absences, missions, decaissements, userEmail, userDept])

  /* Fermeture au clic extérieur */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current  && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current    && !buttonRef.current.contains(e.target as Node)
      ) setOuvert(false)
    }
    if (ouvert) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ouvert])

  if (!role) return null

  const nb = items.length

  const isEmploye  = role === "Employé"
  const tooltipMsg = isEmploye
    ? nb > 0 ? `${nb} demande${nb > 1 ? "s" : ""} en cours de validation` : "Aucune demande en cours"
    : nb > 0 ? `${nb} élément${nb > 1 ? "s" : ""} en attente de votre validation` : "Aucune validation en attente"

  function handleToggle() {
    if (!ouvert && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOuvert((o) => !o)
  }

  return (
    <>
      {/* ── Bouton cloche ── */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title={tooltipMsg}
        className="relative p-2 rounded-lg transition-all duration-200"
        style={{
          color:           nb > 0 ? "var(--gold-warm)" : "var(--text-muted)",
          backgroundColor: "var(--bg-elevated)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color           = nb > 0 ? "var(--gold-bright)" : "var(--text-secondary)"
          e.currentTarget.style.backgroundColor = "var(--bg-border)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color           = nb > 0 ? "var(--gold-warm)" : "var(--text-muted)"
          e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
        }}
      >
        <Bell className="w-5 h-5" />

        {nb > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center font-display font-bold"
            style={{
              minWidth: "18px", height: "18px", padding: "0 4px",
              borderRadius: "9px", fontSize: "10px",
              background: "#ef4444", color: "#fff",
              boxShadow: "0 0 8px rgba(239,68,68,0.6)", lineHeight: "1",
            }}
          >
            {nb > 9 ? "9+" : nb}
          </span>
        )}
      </button>

      {/* ── Dropdown en position fixe ── */}
      {ouvert && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed", top: dropdownPos.top, right: dropdownPos.right,
            width: "390px", zIndex: 9999,
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "16px", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden",
          }}
        >
          {/* En-tête */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bg-border)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "var(--gold-warm)" }} />
              <p className="text-sm font-display font-bold" style={{ color: "var(--text-primary)" }}>
                {isEmploye ? "Mes demandes en cours" : "Validations en attente"}
              </p>
            </div>
            {nb > 0 && (
              <span className="text-xs font-display font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }}>
                {nb}
              </span>
            )}
          </div>

          {/* Corps */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-muted)" }}>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : nb === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle className="w-8 h-8" style={{ color: "var(--green-vivid)" }} />
              <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
                {isEmploye ? "Aucune demande en cours" : "Aucune validation en attente"}
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: "380px", overflowY: "auto" }}>
              {items.map((item, i) => {
                const mcfg = MODULE_CONFIG[item.module]
                const jours = joursAttente(item.date)
                return (
                  <button
                    key={item.id}
                    onClick={() => { setOuvert(false); navigate(item.route) }}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{
                      background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                      borderBottom: i < nb - 1 ? "1px solid var(--bg-border)" : "none",
                      borderLeft:   item.urgente ? "3px solid #ef4444" : `3px solid ${mcfg.color}`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)"
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {item.urgente
                        ? <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                        : <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Badges type + urgence */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-xs font-display font-semibold px-1.5 py-px rounded"
                          style={{ color: mcfg.color, background: mcfg.bg }}
                        >
                          {mcfg.label}
                        </span>
                        {item.urgente && (
                          <span
                            className="text-xs font-display font-bold px-1.5 py-px rounded"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                          >
                            {jours}j d'attente
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-display font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {item.titre}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {formatDateFr(item.date)}
                        {item.montant ? ` · ${formatFCFA(item.montant)}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-1" style={{ color: "var(--text-muted)" }} />
                  </button>
                )
              })}
            </div>
          )}

          {/* Pied */}
          {nb > 0 && (
            <div style={{ borderTop: "1px solid var(--bg-border)" }}>
              <button
                onClick={() => { setOuvert(false); navigate(items[0]?.route ?? "/") }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-display font-semibold transition-colors"
                style={{ color: "var(--gold-warm)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                {isEmploye ? "Voir mes demandes en cours" : "Voir les éléments en attente"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
