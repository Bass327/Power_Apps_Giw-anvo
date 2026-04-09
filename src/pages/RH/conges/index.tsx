import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, ChevronLeft, Plus, Search, X, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type { DemandeConge, StatutConge, TypeConge } from "@/types/rh"
import {
  STATUT_CONGE_CONFIG,
  LABEL_TYPE_CONGE,
} from "@/types/rh"

import { CONGES_MOCK } from "@/data/mockRH"

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

type Onglet = "toutes" | "a-valider" | "approuvees" | "terminees"

/* ════════════════════════════════════════════════
   Page — Gestion des congés
   ════════════════════════════════════════════════ */

export default function RHCongesPage() {
  const { role, user }       = useCurrentUser()
  const email                = user?.email
  const navigate              = useNavigate()
  const access                = role ? getModuleAccess(role, "rh") : "none"

  const [conges, setConges]                   = useState<DemandeConge[]>(CONGES_MOCK)
  const [onglet, setOnglet]                   = useState<Onglet>("toutes")
  const [recherche, setRecherche]             = useState("")
  const [formulaireOuvert, setFormulaire]     = useState(false)
  const [, setConge]          = useState<DemandeConge | null>(null)

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  /* Filtrage */
  const congesFiltres = conges.filter((c) => {
    if (role === "Employé" && c.demandeur !== email) return false

    if (onglet === "a-valider"  && c.statut !== "SOUMIS")   return false
    if (onglet === "approuvees" && c.statut !== "APPROUVE")  return false
    if (onglet === "terminees"  && c.statut !== "TERMINE")   return false

    if (recherche) {
      const q = recherche.toLowerCase()
      return c.demandeur.toLowerCase().includes(q) || LABEL_TYPE_CONGE[c.typeConge].toLowerCase().includes(q)
    }
    return true
  })

  const nbAValider = conges.filter(
    (c) => c.statut === "SOUMIS" && (role === "Directrice" || role === "RAF" || role === "Chef Dept."),
  ).length

  /* Approbation */
  const handleApprouver = (id: string) => {
    setConges((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, statut: "APPROUVE" as StatutConge, valideur: email ?? "", dateValidation: new Date().toISOString().slice(0, 10) }
          : c,
      ),
    )
    setConge(null)
    toast.success("Congé approuvé")
  }

  /* Rejet */
  const handleRejeter = (id: string) => {
    setConges((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, statut: "REJETE" as StatutConge } : c,
      ),
    )
    setConge(null)
    toast.error("Congé refusé")
  }

  /* Nouvelle demande (brouillon simplifié) */
  const handleCreer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dateDebut = fd.get("dateDebut") as string
    const dateFin   = fd.get("dateFin") as string
    const diff = new Date(dateFin).getTime() - new Date(dateDebut).getTime()
    const duree = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)

    const nouveau: DemandeConge = {
      id:          `c${Date.now()}`,
      typeConge:   fd.get("typeConge") as TypeConge,
      dateDebut,
      dateFin,
      duree,
      motif:       fd.get("motif") as string,
      demandeur:   email ?? "employe@giwaanvo.com",
      dateDemande: new Date().toISOString().slice(0, 10),
      statut:      "SOUMIS",
    }
    setConges((prev) => [nouveau, ...prev])
    setFormulaire(false)
    toast.success("Demande de congé soumise")
  }

  /* ── Rendu ── */
  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1000, margin: "0 auto" }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", marginBottom: 12,
          }}
        >
          <ChevronLeft size={14} />
          Ressources Humaines
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Calendar size={20} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Gestion des congés
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Demandes de congés et suivi des absences planifiées
              </p>
            </div>
          </div>
          {access !== "read" && (
            <button
              onClick={() => setFormulaire(true)}
              style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10,
                fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700,
                color: "var(--text-inverse)",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
              }}
            >
              <Plus size={16} />
              Nouvelle demande
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",      value: conges.length,                                                 color: "var(--text-primary)" },
          { label: "En attente", value: conges.filter((c) => c.statut === "SOUMIS").length,            color: "#60a5fa" },
          { label: "Approuvés",  value: conges.filter((c) => c.statut === "APPROUVE").length,          color: "#22c55e" },
          { label: "Terminés",   value: conges.filter((c) => c.statut === "TERMINE").length,           color: "#34d399" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "14px 18px", background: "rgba(13,26,16,0.7)", border: "1px solid var(--bg-border)", borderRadius: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Barre filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, padding: 4 }}>
          {(["toutes", "a-valider", "approuvees", "terminees"] as Onglet[]).map((o) => {
            const labels: Record<Onglet, string> = { toutes: "Toutes", "a-valider": "À valider", approuvees: "Approuvées", terminees: "Terminées" }
            const count = o === "a-valider" ? nbAValider : undefined
            return (
              <button
                key={o}
                onClick={() => setOnglet(o)}
                style={{
                  all: "unset", cursor: "pointer",
                  padding: "6px 14px", borderRadius: 7,
                  fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                  background: onglet === o ? "var(--bg-border)" : "transparent",
                  color: onglet === o ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {labels[o]}
                {count !== undefined && count > 0 && (
                  <span style={{ fontSize: 10, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Liste */}
      {congesFiltres.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(13,26,16,0.5)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <Calendar size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucune demande trouvée</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {congesFiltres.map((conge) => {
            const cfg = STATUT_CONGE_CONFIG[conge.statut]
            return (
              <div
                key={conge.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px",
                  background: "rgba(13,26,16,0.7)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 12,
                  cursor: (role === "Directrice" || role === "RAF" || role === "Chef Dept.") && conge.statut === "SOUMIS"
                    ? "pointer" : "default",
                }}
                onClick={() => {
                  if ((role === "Directrice" || role === "RAF" || role === "Chef Dept.") && conge.statut === "SOUMIS") {
                    setConge(conge)
                  }
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(34,197,94,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={17} style={{ color: "#22c55e" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {LABEL_TYPE_CONGE[conge.typeConge]}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {conge.demandeur} · {formatDate(conge.dateDebut)} → {formatDate(conge.dateFin)} ({conge.duree} j.)
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-body)" }}>
                    {cfg.label}
                  </span>
                  {(role === "Directrice" || role === "RAF" || role === "Chef Dept.") && conge.statut === "SOUMIS" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRejeter(conge.id) }}
                        style={{ all: "unset", cursor: "pointer", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <XCircle size={12} /> Refuser
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprouver(conge.id) }}
                        style={{ all: "unset", cursor: "pointer", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <CheckCircle size={12} /> Approuver
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Formulaire rapide ── */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setFormulaire(false) }}
        >
          <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            {/* En-tête modal */}
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Demande de congé
              </h2>
              <button onClick={() => setFormulaire(false)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            {/* Formulaire */}
            <form onSubmit={handleCreer} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Type de congé *
                </label>
                <select name="typeConge" required style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }}>
                  {Object.entries(LABEL_TYPE_CONGE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Du *</label>
                  <input type="date" name="dateDebut" required style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Au *</label>
                  <input type="date" name="dateFin" required style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Motif</label>
                <textarea name="motif" rows={3} placeholder="Motif de la demande..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setFormulaire(false)} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button type="submit" style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                  Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
