import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Award, ChevronLeft, Plus, Search, X,
  User, Calendar, Star, TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type {
  Evaluation, StatutEvaluation, PeriodeEvaluation, NoteEvaluation,
} from "@/types/rh"
import {
  STATUT_EVALUATION_CONFIG,
  LABEL_PERIODE_EVALUATION,
  LABEL_NOTE_EVALUATION,
} from "@/types/rh"

/* ── Données de démonstration ── */
const EVALUATIONS_MOCK: Evaluation[] = [
  {
    id:                "e1",
    employe:           "amadou.diallo@giwaanvo.com",
    evaluateur:        "cheikh.diop@giwaanvo.com",
    periode:           "ANNUELLE",
    annee:             2025,
    objectifs:         "Réduire les délais d'intervention sur site, améliorer la documentation technique.",
    resultats:         "Délais réduits de 30%. Documentation complète et à jour.",
    note:              "TRES_BON",
    commentaires:      "Très bonne performance. Progrès remarquables sur la documentation.",
    statut:            "VALIDEE",
    datePlanification: "2026-01-10",
    dateValidation:    "2026-02-15",
  },
  {
    id:                "e2",
    employe:           "fatou.sall@giwaanvo.com",
    evaluateur:        "mariama.ba@giwaanvo.com",
    periode:           "S1",
    annee:             2026,
    objectifs:         "Développer la communication digitale, atteindre 1000 abonnés LinkedIn.",
    statut:            "AUTOEVAL",
    datePlanification: "2026-03-01",
  },
  {
    id:                "e3",
    employe:           "ibrahima.ndiaye@giwaanvo.com",
    evaluateur:        "cheikh.diop@giwaanvo.com",
    periode:           "ANNUELLE",
    annee:             2025,
    objectifs:         "Missions terrain sans incident de sécurité, formation équipe junior.",
    resultats:         "Toutes les missions effectuées. Formation de 2 techniciens.",
    note:              "EXCELLENT",
    statut:            "CLOTUREE",
    datePlanification: "2026-01-10",
    dateValidation:    "2026-02-20",
  },
]

type Onglet = "toutes" | "en-cours" | "validees"

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  borderRadius: 8, color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11,
  color: "var(--text-secondary)", fontFamily: "var(--font-body)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
}

/* Badge note */
function BadgeNote({ note }: { note: NoteEvaluation }) {
  const cfg: Record<NoteEvaluation, { color: string; bg: string }> = {
    INSUFFISANT:    { color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
    EN_PROGRESSION: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    SATISFAISANT:   { color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
    TRES_BON:       { color: "#22c55e", bg: "rgba(34,197,94,0.10)"  },
    EXCELLENT:      { color: "#f0a500", bg: "rgba(240,165,0,0.12)"  },
  }
  const c = cfg[note]
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, padding: "2px 9px", borderRadius: 20, fontFamily: "var(--font-body)" }}>
      <Star size={10} />
      {LABEL_NOTE_EVALUATION[note]}
    </span>
  )
}

/* ════════════════════════════════════════════════
   Page — Évaluations des performances
   ════════════════════════════════════════════════ */

export default function RHEvaluationsPage() {
  const { role, user } = useCurrentUser()
  const email = user?.email
  const navigate         = useNavigate()
  const access           = role ? getModuleAccess(role, "rh") : "none"

  const [evaluations, setEvaluations] = useState<Evaluation[]>(EVALUATIONS_MOCK)
  const [onglet, setOnglet]           = useState<Onglet>("toutes")
  const [recherche, setRecherche]     = useState("")
  const [formulaireOuvert, setForm]   = useState(false)
  const [selectionne, setSelectionne] = useState<Evaluation | null>(null)

  /* État formulaire */
  const [fEmploye, setFEmploye]         = useState("")
  const [fPeriode, setFPeriode]         = useState<PeriodeEvaluation>("ANNUELLE")
  const [fAnnee, setFAnnee]             = useState(new Date().getFullYear().toString())
  const [fObjectifs, setFObjectifs]     = useState("")

  if (access === "none") return <AccessDenied message="Accès réservé aux RH et à la direction." />

  const liste = evaluations.filter((e) => {
    if (onglet === "en-cours" && !["PLANIFIEE","AUTOEVAL","EVAL_MANAGER","EN_REVUE_RH"].includes(e.statut)) return false
    if (onglet === "validees" && !["VALIDEE","CLOTUREE"].includes(e.statut)) return false
    if (recherche) {
      const q = recherche.toLowerCase()
      return e.employe.toLowerCase().includes(q) || e.evaluateur.toLowerCase().includes(q)
    }
    return true
  })

  const resetForm = () => {
    setFEmploye(""); setFPeriode("ANNUELLE")
    setFAnnee(new Date().getFullYear().toString()); setFObjectifs("")
  }

  const handleCreer = () => {
    if (!fEmploye.trim() || !fObjectifs.trim()) {
      toast.error("Remplissez les champs obligatoires")
      return
    }
    const nouvelle: Evaluation = {
      id:                `ev${Date.now()}`,
      employe:           fEmploye.trim(),
      evaluateur:        email ?? "rh@giwaanvo.com",
      periode:           fPeriode,
      annee:             parseInt(fAnnee) || new Date().getFullYear(),
      objectifs:         fObjectifs.trim(),
      statut:            "PLANIFIEE",
      datePlanification: new Date().toISOString().slice(0, 10),
    }
    setEvaluations((prev) => [nouvelle, ...prev])
    setForm(false)
    resetForm()
    toast.success("Évaluation planifiée")
  }

  const handleAvancer = (id: string, nouveauStatut: StatutEvaluation) => {
    setEvaluations((prev) => prev.map((e) => e.id === id ? { ...e, statut: nouveauStatut } : e))
    setSelectionne(null)
    toast.success("Statut mis à jour")
  }

  /* ── Rendu ── */
  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", marginBottom: 12 }}
        >
          <ChevronLeft size={14} /> Ressources Humaines
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={20} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Évaluation des performances
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Campagnes d'évaluation et suivi des objectifs individuels
              </p>
            </div>
          </div>
          {(role === "Directrice" || role === "RAF" || role === "Chef Dept.") && (
            <button
              onClick={() => setForm(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}
            >
              <Plus size={16} /> Nouvelle évaluation
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total",       value: evaluations.length,                                              color: "var(--text-primary)" },
          { label: "En cours",    value: evaluations.filter((e) => !["VALIDEE","CLOTUREE"].includes(e.statut)).length, color: "#60a5fa" },
          { label: "Validées",    value: evaluations.filter((e) => e.statut === "VALIDEE").length,        color: "#22c55e" },
          { label: "Excellentes", value: evaluations.filter((e) => e.note === "EXCELLENT").length,        color: "#f0a500" },
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
            { id: "toutes",   label: "Toutes" },
            { id: "en-cours", label: "En cours" },
            { id: "validees", label: "Validées" },
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
            placeholder="Rechercher par employé ou évaluateur..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Liste */}
      {liste.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(13,26,16,0.5)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <Award size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucune évaluation trouvée</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map((ev) => {
            const cfg = STATUT_EVALUATION_CONFIG[ev.statut]
            return (
              <button
                key={ev.id}
                onClick={() => setSelectionne(ev)}
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: "rgba(13,26,16,0.7)", border: "1px solid var(--bg-border)", borderRadius: 12, transition: "all 150ms", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#60a5fa"; e.currentTarget.style.background = "rgba(13,26,16,0.9)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.background = "rgba(13,26,16,0.7)" }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(96,165,250,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingUp size={18} style={{ color: "#60a5fa" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {ev.employe.split("@")[0]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", background: "var(--bg-elevated)", padding: "1px 8px", borderRadius: 20 }}>
                      {LABEL_PERIODE_EVALUATION[ev.periode]} {ev.annee}
                    </span>
                    {ev.note && <BadgeNote note={ev.note} />}
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <User size={11} /> Évaluateur : {ev.evaluateur.split("@")[0]}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Calendar size={11} /> Planifiée le {formatDate(ev.datePlanification)}
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
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectionne(null) }}
        >
          <div style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Évaluation — {selectionne.employe.split("@")[0]}
              </h2>
              <button onClick={() => setSelectionne(null)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Période",    value: `${LABEL_PERIODE_EVALUATION[selectionne.periode]} ${selectionne.annee}` },
                  { label: "Évaluateur", value: selectionne.evaluateur.split("@")[0] },
                  { label: "Statut",     value: STATUT_EVALUATION_CONFIG[selectionne.statut].label },
                  { label: "Note",       value: selectionne.note ? LABEL_NOTE_EVALUATION[selectionne.note] : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--bg-border)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{value}</p>
                  </div>
                ))}
              </div>
              {selectionne.objectifs && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Objectifs</p>
                  <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--bg-border)" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>{selectionne.objectifs}</p>
                  </div>
                </div>
              )}
              {selectionne.resultats && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Résultats</p>
                  <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.05)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.20)" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>{selectionne.resultats}</p>
                  </div>
                </div>
              )}
              {selectionne.commentaires && (
                <div style={{ padding: "12px 16px", background: "rgba(96,165,250,0.06)", borderRadius: 10, border: "1px solid rgba(96,165,250,0.20)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}><strong>Commentaire :</strong> {selectionne.commentaires}</p>
                </div>
              )}
              {/* Actions avancement */}
              {selectionne.statut !== "CLOTUREE" && (role === "Directrice" || role === "Chef Dept.") && (
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                  {selectionne.statut === "PLANIFIEE" && (
                    <button onClick={() => handleAvancer(selectionne.id, "AUTOEVAL")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#60a5fa", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.30)" }}>
                      Lancer autoévaluation →
                    </button>
                  )}
                  {selectionne.statut === "AUTOEVAL" && (
                    <button onClick={() => handleAvancer(selectionne.id, "EVAL_MANAGER")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#f0a500", background: "rgba(240,165,0,0.10)", border: "1px solid rgba(240,165,0,0.30)" }}>
                      Passer à l'évaluation manager →
                    </button>
                  )}
                  {selectionne.statut === "EN_REVUE_RH" && (
                    <button onClick={() => handleAvancer(selectionne.id, "VALIDEE")} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                      Valider l'évaluation
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
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,15,11,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setForm(false); resetForm() } }}
        >
          <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Award size={18} style={{ color: "#60a5fa" }} />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Nouvelle évaluation
                </h2>
              </div>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Employé évalué *</label>
                <input type="text" placeholder="email@giwaanvo.com" value={fEmploye} onChange={(e) => setFEmploye(e.target.value)} style={fieldStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Période</label>
                  <select value={fPeriode} onChange={(e) => setFPeriode(e.target.value as PeriodeEvaluation)} style={fieldStyle}>
                    {Object.entries(LABEL_PERIODE_EVALUATION).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Année</label>
                  <input type="number" min={2020} max={2030} value={fAnnee} onChange={(e) => setFAnnee(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Objectifs fixés *</label>
                <textarea rows={3} placeholder="Listez les objectifs de cette période..." value={fObjectifs} onChange={(e) => setFObjectifs(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--bg-border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                Annuler
              </button>
              <button onClick={handleCreer} style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}>
                Planifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
