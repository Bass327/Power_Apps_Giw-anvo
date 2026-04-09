import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ShieldAlert, ChevronLeft, Plus, Search, X, Lock,
  User, Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type { DossierSanction, StatutSanction, GraviteSanction } from "@/types/rh"
import { STATUT_SANCTION_CONFIG, LABEL_GRAVITE_SANCTION } from "@/types/rh"

/* ── Données de démonstration ── */
const SANCTIONS_MOCK: DossierSanction[] = [
  {
    id:            "s1",
    employe:       "ibrahima.ndiaye@giwaanvo.com",
    dateIncident:  "2026-03-18",
    natureFaits:   "Absence injustifiée répétée",
    description:   "Trois absences non signalées en l'espace d'un mois sans justificatif.",
    gravite:       "MODEREE",
    statut:        "EN_INSTRUCTION",
    dateOuverture: "2026-03-20",
    decision:      "Avertissement formel en cours de rédaction",
  },
  {
    id:            "s2",
    employe:       "kofi.mensah@giwaanvo.com",
    dateIncident:  "2026-02-10",
    natureFaits:   "Non-respect des consignes de sécurité",
    description:   "Intervention sur site sans équipement de protection individuelle obligatoire.",
    gravite:       "GRAVE",
    statut:        "NOTIFIE",
    dateOuverture: "2026-02-12",
    decision:      "Mise en demeure notifiée",
    sanction:      "Blâme écrit",
    decideur:      "directrice@giwaanvo.com",
  },
]

type Onglet = "tous" | "en-cours" | "clotures"

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11,
  color: "var(--text-secondary)", fontFamily: "var(--font-body)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
}

function BadgeGravite({ gravite }: { gravite: GraviteSanction }) {
  const cfg = {
    MINEURE:    { color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
    MODEREE:    { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    GRAVE:      { color: "#f97316", bg: "rgba(249,115,22,0.10)" },
    TRES_GRAVE: { color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  }[gravite]
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20, fontFamily: "var(--font-body)" }}>
      {LABEL_GRAVITE_SANCTION[gravite]}
    </span>
  )
}

/* ════════════════════════════════════════════════
   Page — Sanctions disciplinaires
   ════════════════════════════════════════════════ */

export default function RHSanctionsPage() {
  const { role } = useCurrentUser()
  const navigate  = useNavigate()
  const access    = role ? getModuleAccess(role, "rh") : "none"

  const [sanctions, setSanctions]     = useState<DossierSanction[]>(SANCTIONS_MOCK)
  const [onglet, setOnglet]           = useState<Onglet>("tous")
  const [recherche, setRecherche]     = useState("")
  const [formulaireOuvert, setForm]   = useState(false)
  const [selectionne, setSelectionne] = useState<DossierSanction | null>(null)

  /* État formulaire */
  const [fEmploye, setFEmploye]           = useState("")
  const [fDate, setFDate]                 = useState("")
  const [fNature, setFNature]             = useState("")
  const [fDescription, setFDescription]  = useState("")
  const [fGravite, setFGravite]           = useState<GraviteSanction>("MODEREE")

  /* Accès restreint : uniquement Directrice, RAF, RH */
  if (access === "none" || role === "Employé" || role === "Comptable") {
    return <AccessDenied message="Ce module est restreint à la direction et aux RH." />
  }

  const liste = sanctions.filter((s) => {
    if (onglet === "en-cours" && s.statut === "CLOTURE") return false
    if (onglet === "clotures" && s.statut !== "CLOTURE") return false
    if (recherche) {
      const q = recherche.toLowerCase()
      return s.employe.toLowerCase().includes(q) || s.natureFaits.toLowerCase().includes(q)
    }
    return true
  })

  const resetForm = () => {
    setFEmploye(""); setFDate(""); setFNature(""); setFDescription(""); setFGravite("MODEREE")
  }

  const handleCreer = () => {
    if (!fEmploye.trim() || !fDate || !fNature.trim()) {
      toast.error("Remplissez les champs obligatoires")
      return
    }
    const nouveau: DossierSanction = {
      id:            `san${Date.now()}`,
      employe:       fEmploye.trim(),
      dateIncident:  fDate,
      natureFaits:   fNature.trim(),
      description:   fDescription.trim(),
      gravite:       fGravite,
      statut:        "SIGNALE",
      dateOuverture: new Date().toISOString().slice(0, 10),
    }
    setSanctions((prev) => [nouveau, ...prev])
    setForm(false)
    resetForm()
    toast.success("Dossier disciplinaire ouvert")
  }

  const handleAvancer = (id: string, nouveauStatut: StatutSanction) => {
    setSanctions((prev) => prev.map((s) => s.id === id ? { ...s, statut: nouveauStatut } : s))
    setSelectionne(null)
    toast.success("Statut mis à jour")
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
          <ChevronLeft size={14} /> Ressources Humaines
        </button>

        {/* Bannière confidentielle */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderRadius: 10, marginBottom: 20,
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <Lock size={14} style={{ color: "#f59e0b" }} />
          <p style={{ margin: 0, fontSize: 12, color: "#f59e0b", fontFamily: "var(--font-body)" }}>
            Module confidentiel — accès restreint à la direction et aux ressources humaines
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Sanctions disciplinaires
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Gestion des procédures disciplinaires — données confidentielles
              </p>
            </div>
          </div>
          {(role === "Directrice" || role === "RAF") && (
            <button
              onClick={() => setForm(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Plus size={16} /> Nouveau dossier
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",         value: sanctions.length,                                              color: "var(--text-primary)" },
          { label: "En cours",      value: sanctions.filter((s) => s.statut !== "CLOTURE").length,        color: "#f59e0b" },
          { label: "Graves",        value: sanctions.filter((s) => ["GRAVE","TRES_GRAVE"].includes(s.gravite)).length, color: "#ef4444" },
          { label: "Clôturés",      value: sanctions.filter((s) => s.statut === "CLOTURE").length,        color: "#34d399" },
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
            { id: "tous",      label: "Tous" },
            { id: "en-cours",  label: "En cours" },
            { id: "clotures",  label: "Clôturés" },
          ] as { id: Onglet; label: string }[]).map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              style={{ all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, background: onglet === o.id ? "var(--bg-border)" : "transparent", color: onglet === o.id ? "var(--text-primary)" : "var(--text-secondary)" }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher par employé ou nature des faits..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Liste */}
      {liste.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(13,26,16,0.5)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <ShieldAlert size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucun dossier trouvé</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map((s) => {
            const cfg = STATUT_SANCTION_CONFIG[s.statut]
            return (
              <button
                key={s.id}
                onClick={() => setSelectionne(s)}
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 22px", background: "rgba(13,26,16,0.7)", border: "1px solid var(--bg-border)", borderRadius: 12, transition: "all 150ms", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = "rgba(13,26,16,0.9)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.background = "rgba(13,26,16,0.7)" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <ShieldAlert size={18} style={{ color: "#f59e0b" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {s.natureFaits}
                    </span>
                    <BadgeGravite gravite={s.gravite} />
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <User size={11} /> {s.employe.split("@")[0]}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Calendar size={11} /> Incident le {formatDate(s.dateIncident)}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 10px", borderRadius: 20, flexShrink: 0, fontFamily: "var(--font-body)" }}>
                  {cfg.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal détail */}
      {selectionne && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.90)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectionne(null) }}
        >
          <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Dossier disciplinaire
              </h2>
              <button onClick={() => setSelectionne(null)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Employé",    value: selectionne.employe },
                { label: "Date incident", value: formatDate(selectionne.dateIncident) },
                { label: "Nature",     value: selectionne.natureFaits },
                { label: "Gravité",    value: LABEL_GRAVITE_SANCTION[selectionne.gravite] },
                { label: "Statut",     value: STATUT_SANCTION_CONFIG[selectionne.statut].label },
                { label: "Ouvert le",  value: formatDate(selectionne.dateOuverture) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)", textAlign: "right" }}>{value}</span>
                </div>
              ))}
              {selectionne.description && (
                <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--bg-border)", marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                    {selectionne.description}
                  </p>
                </div>
              )}
              {selectionne.sanction && (
                <div style={{ padding: "10px 16px", background: "rgba(245,158,11,0.06)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.25)" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#f59e0b", fontFamily: "var(--font-body)" }}>
                    <strong>Sanction :</strong> {selectionne.sanction}
                  </p>
                </div>
              )}
              {/* Actions d'avancement */}
              {selectionne.statut !== "CLOTURE" && role === "Directrice" && (
                <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
                  {selectionne.statut === "SIGNALE" && (
                    <button onClick={() => handleAvancer(selectionne.id, "EN_ANALYSE")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#60a5fa", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.30)" }}>
                      Mettre en analyse →
                    </button>
                  )}
                  {selectionne.statut === "EN_ANALYSE" && (
                    <button onClick={() => handleAvancer(selectionne.id, "EN_INSTRUCTION")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)" }}>
                      Instruire →
                    </button>
                  )}
                  {selectionne.statut === "NOTIFIE" && (
                    <button onClick={() => handleAvancer(selectionne.id, "CLOTURE")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                      Clôturer le dossier
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.90)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setForm(false); resetForm() } }}
        >
          <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldAlert size={18} style={{ color: "#f59e0b" }} />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Ouvrir un dossier disciplinaire
                </h2>
              </div>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Employé concerné *</label>
                <input type="text" placeholder="email@giwaanvo.com" value={fEmploye} onChange={(e) => setFEmploye(e.target.value)} style={fieldStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date de l'incident *</label>
                  <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Niveau de gravité</label>
                  <select value={fGravite} onChange={(e) => setFGravite(e.target.value as GraviteSanction)} style={fieldStyle}>
                    {Object.entries(LABEL_GRAVITE_SANCTION).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Nature des faits *</label>
                <input type="text" placeholder="Ex : Absence injustifiée répétée" value={fNature} onChange={(e) => setFNature(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description détaillée</label>
                <textarea rows={3} placeholder="Contexte et description des faits..." value={fDescription} onChange={(e) => setFDescription(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--bg-border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                Annuler
              </button>
              <button onClick={handleCreer} style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                Ouvrir le dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
