import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  UserPlus, ChevronLeft, Plus, Search, X,
  Building2, Briefcase, MapPin, Calendar, CheckCircle, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { hasPermission } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type {
  Recrutement, TypeContrat, PrioriteRecrutement,
} from "@/types/rh"
import {
  STATUT_RECRUTEMENT_CONFIG,
  LABEL_TYPE_CONTRAT,
  LABEL_PRIORITE_RECRUTEMENT,
} from "@/types/rh"

type Onglet = "tous" | "en-cours" | "entretiens" | "clotures"

/* ── Utilitaire date ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

/* ── Style réutilisable champ ── */
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

/* ── Badge priorité ── */
function BadgePriorite({ priorite }: { priorite: PrioriteRecrutement }) {
  const cfg = {
    HAUTE:   { color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
    NORMALE: { color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
    BASSE:   { color: "var(--text-secondary)", bg: "rgba(61,102,80,0.15)" },
  }[priorite]
  return (
    <span style={{ fontSize: 10, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20, fontFamily: "var(--font-body)", fontWeight: 600 }}>
      {LABEL_PRIORITE_RECRUTEMENT[priorite]}
    </span>
  )
}

/* ════════════════════════════════════════════════
   Page — Recrutement
   ════════════════════════════════════════════════ */

export default function RHRecrutementPage() {
  const { role, user } = useCurrentUser()
  const email = user?.email
  const navigate         = useNavigate()

  const [recrutements, setRecrutements]       = useState<Recrutement[]>([])
  const [onglet, setOnglet]                   = useState<Onglet>("tous")
  const [recherche, setRecherche]             = useState("")
  const [formulaireOuvert, setForm]           = useState(false)
  const [selectionne, setSelectionne]         = useState<Recrutement | null>(null)
  const [actionConfirm, setActionConfirm]     = useState<"valider" | "rejeter" | null>(null)
  const [commentaireAction, setCommentaire]   = useState("")

  /* État formulaire */
  const [fIntitule, setFIntitule]       = useState("")
  const [fDept, setFDept]               = useState("")
  const [fContrat, setFContrat]         = useState<TypeContrat>("CDI")
  const [fNb, setFNb]                   = useState("1")
  const [fLieu, setFLieu]               = useState("Dakar")
  const [fDate, setFDate]               = useState("")
  const [fPriorite, setFPriorite]       = useState<PrioriteRecrutement>("NORMALE")
  const [fDescription, setFDescription] = useState("")

  if (!role || !hasPermission(role, "canGererRecrutement")) {
    return <AccessDenied message="Ce sous-module est réservé aux chefs de département, au RAF et à la direction." backTo="/rh" backLabel="Ressources Humaines" />
  }

  /* Filtrage */
  const liste = recrutements.filter((r) => {
    if (onglet === "en-cours"   && !["EN_RECRUTEMENT", "SOUMIS", "VALIDE"].includes(r.statut)) return false
    if (onglet === "entretiens" && r.statut !== "ENTRETIENS") return false
    if (onglet === "clotures"   && r.statut !== "CLOTURE")    return false
    if (recherche) {
      const q = recherche.toLowerCase()
      return r.intitulePoste.toLowerCase().includes(q) || r.departement.toLowerCase().includes(q)
    }
    return true
  })

  const resetForm = () => {
    setFIntitule(""); setFDept(""); setFContrat("CDI")
    setFNb("1"); setFLieu("Dakar"); setFDate("")
    setFPriorite("NORMALE"); setFDescription("")
  }

  /* Approbation / rejet par la DG ou le RAF */
  const handleApprouver = (id: string) => {
    setRecrutements((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, statut: "VALIDE" as const, commentaire: commentaireAction || "Validé" }
          : r,
      ),
    )
    setSelectionne(null)
    setActionConfirm(null)
    setCommentaire("")
    toast.success("Recrutement validé")
  }

  const handleRejeter = (id: string) => {
    setRecrutements((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, statut: "CLOTURE" as const, commentaire: commentaireAction || "Rejeté" }
          : r,
      ),
    )
    setSelectionne(null)
    setActionConfirm(null)
    setCommentaire("")
    toast.error("Recrutement rejeté")
  }

  const handleCreer = () => {
    if (!fIntitule.trim() || !fDept.trim() || !fDate) {
      toast.error("Remplissez les champs obligatoires")
      return
    }
    const nouveau: Recrutement = {
      id:               `rec${Date.now()}`,
      intitulePoste:    fIntitule.trim(),
      departement:      fDept.trim(),
      typeContrat:      fContrat,
      nbPostes:         parseInt(fNb) || 1,
      lieu:             fLieu.trim(),
      dateSouhaitee:    fDate,
      managerDemandeur: email ?? "manager@giwaanvo.com",
      priorite:         fPriorite,
      description:      fDescription.trim(),
      statut:           "SOUMIS",
      dateDemande:      new Date().toISOString().slice(0, 10),
    }
    setRecrutements((prev) => [nouveau, ...prev])
    setForm(false)
    resetForm()
    toast.success("Demande de recrutement soumise")
  }

  /* ── Rendu ── */
  return (
    <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-12 sm:pb-16" style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Breadcrumb + En-tête */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", marginBottom: 12 }}
        >
          <ChevronLeft size={14} /> Ressources Humaines
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={20} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Recrutement
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Besoins en personnel et suivi des recrutements
              </p>
            </div>
          </div>
          {role && hasPermission(role, "canGererRecrutement") && (
            <button
              onClick={() => setForm(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
            >
              <Plus size={16} /> Nouveau recrutement
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total postes",    value: recrutements.length,                                                color: "var(--text-primary)" },
          { label: "En cours",        value: recrutements.filter((r) => ["EN_RECRUTEMENT","SOUMIS","VALIDE"].includes(r.statut)).length, color: "#a78bfa" },
          { label: "Entretiens",      value: recrutements.filter((r) => r.statut === "ENTRETIENS").length,       color: "#f0a500" },
          { label: "Clôturés",        value: recrutements.filter((r) => r.statut === "CLOTURE").length,         color: "#34d399" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "14px 18px", background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)", borderRadius: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, padding: 4 }}>
          {([
            { id: "tous",        label: "Tous" },
            { id: "en-cours",    label: "En cours" },
            { id: "entretiens",  label: "Entretiens" },
            { id: "clotures",    label: "Clôturés" },
          ] as { id: Onglet; label: string }[]).map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              style={{ all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, background: onglet === o.id ? "var(--bg-border)" : "transparent", color: onglet === o.id ? "var(--text-primary)" : "var(--text-secondary)", transition: "all 150ms" }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher un poste ou département..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Liste */}
      {liste.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--bg-elevated)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <UserPlus size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucun recrutement trouvé</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map((rec) => {
            const cfg = STATUT_RECRUTEMENT_CONFIG[rec.statut]
            return (
              <button
                key={rec.id}
                onClick={() => setSelectionne(rec)}
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)", borderRadius: 12, transition: "all 150ms", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.background = "var(--glass-card-bg)" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(167,139,250,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Briefcase size={20} style={{ color: "#a78bfa" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {rec.intitulePoste}
                    </span>
                    <BadgePriorite priorite={rec.priorite} />
                    {rec.nbPostes > 1 && (
                      <span style={{ fontSize: 10, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", padding: "1px 7px", borderRadius: 20 }}>
                        {rec.nbPostes} postes
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Building2 size={11} /> {rec.departement}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <MapPin size={11} /> {rec.lieu}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Calendar size={11} /> Souhaité le {formatDate(rec.dateSouhaitee)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {LABEL_TYPE_CONTRAT[rec.typeContrat]}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-body)", flexShrink: 0 }}>
                  {cfg.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Modal détail ── */}
      {selectionne && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSelectionne(null); setActionConfirm(null); setCommentaire("") } }}
        >
          <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {selectionne.intitulePoste}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {selectionne.departement} · {LABEL_TYPE_CONTRAT[selectionne.typeContrat]}
                </p>
              </div>
              <button
                onClick={() => { setSelectionne(null); setActionConfirm(null); setCommentaire("") }}
                style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Statut",           value: STATUT_RECRUTEMENT_CONFIG[selectionne.statut].label },
                { label: "Nombre de postes", value: `${selectionne.nbPostes} poste${selectionne.nbPostes > 1 ? "s" : ""}` },
                { label: "Lieu",             value: selectionne.lieu },
                { label: "Date souhaitée",   value: formatDate(selectionne.dateSouhaitee) },
                { label: "Priorité",         value: LABEL_PRIORITE_RECRUTEMENT[selectionne.priorite] },
                { label: "Demandé le",       value: formatDate(selectionne.dateDemande) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-body)", textAlign: "right" }}>{value}</span>
                </div>
              ))}
              {selectionne.description && (
                <div style={{ padding: "14px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--bg-border)", marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                    {selectionne.description}
                  </p>
                </div>
              )}

              {/* ── Zone d'approbation — DG et RAF ── */}
              {role && hasPermission(role, "canGererSanctions") &&
               !["VALIDE", "CLOTURE"].includes(selectionne.statut) && (
                <div
                  style={{
                    marginTop: 8, padding: "16px",
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    border: "1px solid var(--bg-border)",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {role === "Directrice" ? "Décision de la Directrice Générale" : "Décision du RAF"}
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Commentaire (optionnel)..."
                    value={commentaireAction}
                    onChange={(e) => setCommentaire(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", boxSizing: "border-box",
                      background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
                      borderRadius: 8, color: "var(--text-primary)",
                      fontSize: 13, fontFamily: "var(--font-body)",
                      resize: "none", outline: "none",
                    }}
                  />

                  {actionConfirm ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", flex: 1 }}>
                        Confirmer : <strong style={{ color: actionConfirm === "valider" ? "#22c55e" : "#ef4444" }}>
                          {actionConfirm === "valider" ? "Validation" : "Rejet"}
                        </strong> ?
                      </p>
                      <button
                        onClick={() => setActionConfirm(null)}
                        style={{ all: "unset", cursor: "pointer", padding: "7px 12px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => actionConfirm === "valider" ? handleApprouver(selectionne.id) : handleRejeter(selectionne.id)}
                        style={{ all: "unset", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: actionConfirm === "valider" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#ef4444" }}
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setActionConfirm("rejeter")}
                        style={{ all: "unset", cursor: "pointer", flex: 1, padding: "9px", borderRadius: 8, textAlign: "center", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        <XCircle size={14} /> Rejeter
                      </button>
                      <button
                        onClick={() => setActionConfirm("valider")}
                        style={{ all: "unset", cursor: "pointer", flex: 2, padding: "9px", borderRadius: 8, textAlign: "center", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #f0a500, #ffc235)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        <CheckCircle size={14} /> Valider le recrutement
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal formulaire ── */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setForm(false); resetForm() } }}
        >
          <div style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={17} style={{ color: "#a78bfa" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Nouveau recrutement
                </h2>
              </div>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Intitulé poste */}
              <div>
                <label style={labelStyle}>Intitulé du poste *</label>
                <input type="text" placeholder="Ex : Ingénieur Électricien Solaire" value={fIntitule} onChange={(e) => setFIntitule(e.target.value)} style={fieldStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Département *</label>
                  <input type="text" placeholder="Ex : Technique, RH..." value={fDept} onChange={(e) => setFDept(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type de contrat</label>
                  <select value={fContrat} onChange={(e) => setFContrat(e.target.value as TypeContrat)} style={fieldStyle}>
                    {Object.entries(LABEL_TYPE_CONTRAT).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nb. de postes</label>
                  <input type="number" min={1} value={fNb} onChange={(e) => setFNb(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lieu</label>
                  <input type="text" placeholder="Ex : Dakar" value={fLieu} onChange={(e) => setFLieu(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Priorité</label>
                  <select value={fPriorite} onChange={(e) => setFPriorite(e.target.value as PrioriteRecrutement)} style={fieldStyle}>
                    {Object.entries(LABEL_PRIORITE_RECRUTEMENT).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Date souhaitée d'entrée en poste *</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} style={fieldStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description du poste</label>
                <textarea rows={3} placeholder="Principales responsabilités et compétences requises..." value={fDescription} onChange={(e) => setFDescription(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
              </div>
            </div>

            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--bg-border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                Annuler
              </button>
              <button onClick={handleCreer} style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
                Soumettre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
