import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { UserX, ChevronLeft, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type { Absence, StatutAbsence, TypeAbsence } from "@/types/rh"
import {
  STATUT_ABSENCE_CONFIG,
  LABEL_TYPE_ABSENCE,
} from "@/types/rh"

import { ABSENCES_MOCK } from "@/data/mockRH"

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

type Onglet = "toutes" | "en-attente" | "justifiees" | "non-justifiees"

/* ════════════════════════════════════════════════
   Page — Gestion des absences
   ════════════════════════════════════════════════ */

export default function RHAbsencesPage() {
  const { role, user }     = useCurrentUser()
  const email              = user?.email
  const navigate            = useNavigate()
  const access              = role ? getModuleAccess(role, "rh") : "none"

  const [absences, setAbsences]           = useState<Absence[]>(ABSENCES_MOCK)
  const [onglet, setOnglet]               = useState<Onglet>("toutes")
  const [recherche, setRecherche]         = useState("")
  const [formulaireOuvert, setFormulaire] = useState(false)

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  /* Filtrage */
  const absencesFiltrees = absences.filter((a) => {
    if (role === "Employé" && a.employe !== email) return false

    if (onglet === "en-attente"      && a.statut !== "EN_ATTENTE")    return false
    if (onglet === "justifiees"      && a.statut !== "JUSTIFIEE")     return false
    if (onglet === "non-justifiees"  && a.statut !== "NON_JUSTIFIEE") return false

    if (recherche) {
      const q = recherche.toLowerCase()
      return a.employe.toLowerCase().includes(q) || LABEL_TYPE_ABSENCE[a.typeAbsence].toLowerCase().includes(q)
    }
    return true
  })

  const nbEnAttente = absences.filter((a) => a.statut === "EN_ATTENTE").length

  /* Mise à jour statut */
  const handleStatut = (id: string, statut: StatutAbsence, justificatif?: string) => {
    setAbsences((prev) =>
      prev.map((a) => a.id === id ? { ...a, statut, justificatif } : a),
    )
    toast.success(`Absence marquée comme "${STATUT_ABSENCE_CONFIG[statut].label}"`)
  }

  /* Signalement d'une absence */
  const handleCreer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nouvelle: Absence = {
      id:              `a${Date.now()}`,
      typeAbsence:     fd.get("typeAbsence") as TypeAbsence,
      dateAbsence:     fd.get("dateAbsence") as string,
      duree:           parseInt(fd.get("duree") as string) || 1,
      motif:           fd.get("motif") as string,
      employe:         email ?? "employe@giwaanvo.com",
      dateSignalement: new Date().toISOString().slice(0, 10),
      statut:          "EN_ATTENTE",
    }
    setAbsences((prev) => [nouvelle, ...prev])
    setFormulaire(false)
    toast.success("Absence signalée")
  }

  /* ── Rendu ── */
  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1000, margin: "0 auto" }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", marginBottom: 12 }}
        >
          <ChevronLeft size={14} />
          Ressources Humaines
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserX size={20} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Gestion des absences
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Signalement, justification et suivi des absences
              </p>
            </div>
          </div>
          {access !== "read" && (
            <button
              onClick={() => setFormulaire(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
            >
              <Plus size={16} />
              Signaler une absence
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",           value: absences.length,                                              color: "var(--text-primary)" },
          { label: "En attente",      value: absences.filter((a) => a.statut === "EN_ATTENTE").length,    color: "#f59e0b" },
          { label: "Justifiées",      value: absences.filter((a) => a.statut === "JUSTIFIEE").length,     color: "#22c55e" },
          { label: "Non justifiées",  value: absences.filter((a) => a.statut === "NON_JUSTIFIEE").length, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "14px 18px", background: "rgba(13,26,16,0.7)", border: "1px solid var(--bg-border)", borderRadius: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, padding: 4 }}>
          {([
            { id: "toutes",          label: "Toutes" },
            { id: "en-attente",      label: "En attente" },
            { id: "justifiees",      label: "Justifiées" },
            { id: "non-justifiees",  label: "Non justifiées" },
          ] as { id: Onglet; label: string }[]).map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              style={{
                all: "unset", cursor: "pointer",
                padding: "6px 14px", borderRadius: 7,
                fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                background: onglet === o.id ? "var(--bg-border)" : "transparent",
                color: onglet === o.id ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {o.label}
              {o.id === "en-attente" && nbEnAttente > 0 && (
                <span style={{ fontSize: 10, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>
                  {nbEnAttente}
                </span>
              )}
            </button>
          ))}
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
      {absencesFiltrees.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(13,26,16,0.5)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <UserX size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucune absence trouvée</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {absencesFiltrees.map((absence) => {
            const cfg = STATUT_ABSENCE_CONFIG[absence.statut]
            const peutGerer = (role === "Directrice" || role === "RAF" || role === "Chef Dept.") && absence.statut === "EN_ATTENTE"
            return (
              <div
                key={absence.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "16px 20px",
                  background: "rgba(13,26,16,0.7)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 12,
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <UserX size={17} style={{ color: "#ef4444" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {LABEL_TYPE_ABSENCE[absence.typeAbsence]}
                    </p>
                    <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 9px", borderRadius: 20, fontFamily: "var(--font-body)" }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {absence.employe} · {formatDate(absence.dateAbsence)} · {absence.duree} jour{absence.duree > 1 ? "s" : ""}
                  </p>
                  {absence.motif && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                      {absence.motif}
                    </p>
                  )}
                  {absence.justificatif && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#22c55e", fontFamily: "var(--font-body)" }}>
                      ✓ {absence.justificatif}
                    </p>
                  )}
                  {peutGerer && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => handleStatut(absence.id, "NON_JUSTIFIEE")}
                        style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)" }}
                      >
                        Marquer non justifiée
                      </button>
                      <button
                        onClick={() => handleStatut(absence.id, "JUSTIFIEE", "Justificatif accepté")}
                        style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
                      >
                        Marquer justifiée
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulaire de signalement */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setFormulaire(false) }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Signaler une absence
              </h2>
              <button onClick={() => setFormulaire(false)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <form onSubmit={handleCreer} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Type d'absence *</label>
                <select name="typeAbsence" required style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }}>
                  {Object.entries(LABEL_TYPE_ABSENCE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Date *</label>
                  <input type="date" name="dateAbsence" required style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Durée (j.)</label>
                  <input type="number" name="duree" min={1} defaultValue={1} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Motif</label>
                <textarea name="motif" rows={3} placeholder="Expliquez la raison de l'absence..." style={{ width: "100%", padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setFormulaire(false)} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button type="submit" style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
                  Signaler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
