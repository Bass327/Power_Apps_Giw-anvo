import { useState, useEffect, useRef, useMemo } from "react"
import { Bell, Clock, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import type { DemandeAchat } from "@/types/DemandeAchat"
import { formatFCFA, formatDateFr } from "@/lib/utils"

function joursAttente(dateDemande: string): number {
  return Math.floor((Date.now() - new Date(dateDemande).getTime()) / (1000 * 60 * 60 * 24))
}

export function NotificationBell() {
  const [ouvert, setOuvert]               = useState(false)
  const [dropdownPos, setDropdownPos]     = useState({ top: 0, right: 0 })
  const buttonRef                         = useRef<HTMLButtonElement>(null)
  const dropdownRef                       = useRef<HTMLDivElement>(null)
  const navigate                          = useNavigate()

  const { user: currentUser }                      = useCurrentUser()
  const { data: demandes = [], isLoading }          = useDemandesAchats()

  const role        = currentUser?.role
  const estValideur = role === "Chef Dept." || role === "Directrice"

  /* Statut déclencheur selon le rôle — calculé de façon inconditionnelle */
  const statutAttendu =
    role === "Chef Dept." ? "SOUMIS"      :
    role === "Directrice" ? "VALIDE_CHEF" : ""

  /* Demandes en attente — tableau vide si le rôle ne valide pas */
  const enAttente: DemandeAchat[] = useMemo(
    () => estValideur ? demandes.filter((d) => d.statut === statutAttendu) : [],
    [demandes, statutAttendu, estValideur],
  )

  /* Fermeture au clic extérieur */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current  && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current    && !buttonRef.current.contains(e.target as Node)
      ) {
        setOuvert(false)
      }
    }
    if (ouvert) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ouvert])

  /* Pas de rendu pour les rôles sans validation — après tous les hooks */
  if (!estValideur) return null

  const nb = enAttente.length

  /* Calcule la position fixe du dropdown au moment du clic */
  function handleToggle() {
    if (!ouvert && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOuvert((o) => !o)
  }

  return (
    <>
      {/* ── Bouton cloche ── */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title={
          nb > 0
            ? `${nb} demande${nb > 1 ? "s" : ""} en attente de votre validation`
            : "Aucune validation en attente"
        }
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

        {/* Badge numérique — disparaît quand nb = 0 */}
        {nb > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center font-display font-bold"
            style={{
              minWidth:     "18px",
              height:       "18px",
              padding:      "0 4px",
              borderRadius: "9px",
              fontSize:     "10px",
              background:   "#ef4444",
              color:        "#fff",
              boxShadow:    "0 0 8px rgba(239,68,68,0.6)",
              lineHeight:   "1",
            }}
          >
            {nb > 9 ? "9+" : nb}
          </span>
        )}
      </button>

      {/* ── Dropdown en position fixe (échappe aux overflow:hidden des parents) ── */}
      {ouvert && (
        <div
          ref={dropdownRef}
          style={{
            position:     "fixed",
            top:          dropdownPos.top,
            right:        dropdownPos.right,
            width:        "360px",
            zIndex:       9999,
            background:   "var(--bg-surface)",
            border:       "1px solid var(--bg-border)",
            borderRadius: "16px",
            boxShadow:    "0 16px 48px rgba(0,0,0,0.5)",
            overflow:     "hidden",
          }}
        >
          {/* En-tête */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "var(--gold-warm)" }} />
              <p className="text-sm font-display font-bold" style={{ color: "var(--text-primary)" }}>
                Validations en attente
              </p>
            </div>
            {nb > 0 && (
              <span
                className="text-xs font-display font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color:      "#ef4444",
                  border:     "1px solid rgba(239,68,68,0.30)",
                }}
              >
                {nb}
              </span>
            )}
          </div>

          {/* Contenu */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-muted)" }}>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : nb === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle className="w-8 h-8" style={{ color: "var(--green-vivid)" }} />
              <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
                Aucune validation en attente
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {enAttente.map((demande, i) => {
                const jours   = joursAttente(demande.dateDemande)
                const urgente = jours > 3

                return (
                  <button
                    key={demande.id}
                    onClick={() => {
                      setOuvert(false)
                      navigate("/achats")
                    }}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{
                      background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                      borderBottom: i < nb - 1 ? "1px solid var(--bg-border)" : "none",
                      borderLeft:   urgente ? "3px solid #ef4444" : "3px solid var(--green-vivid)",
                      cursor:       "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)"
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {urgente
                        ? <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                        : <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {demande.titre}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {demande.demandeur.split("@")[0]} · {formatDateFr(demande.dateDemande)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                          {formatFCFA(demande.montant)}
                        </span>
                        {urgente && (
                          <span
                            className="text-xs font-display font-bold px-1.5 py-px rounded"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                          >
                            {jours}j d'attente
                          </span>
                        )}
                      </div>
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
                onClick={() => {
                  setOuvert(false)
                  navigate("/achats")
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-display font-semibold transition-colors"
                style={{ color: "var(--gold-warm)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                Voir toutes les demandes
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
