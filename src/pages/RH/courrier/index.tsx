import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Mail, ChevronLeft, Plus, Search, X,
  ArrowDownLeft, ArrowUpRight, Calendar, User,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type {
  Courrier, StatutCourrier, TypeCourrier, PrioriteCourrier,
} from "@/types/rh"
import {
  STATUT_COURRIER_CONFIG,
  LABEL_TYPE_COURRIER,
  LABEL_PRIORITE_COURRIER,
} from "@/types/rh"

/* ── Données de démonstration ── */
const COURRIER_MOCK: Courrier[] = [
  {
    id:                 "cr1",
    reference:          "CRE-2026-042",
    type:               "ENTRANT",
    date:               "2026-04-05",
    expediteur:         "Ministère de l'Énergie du Sénégal",
    destinataire:       "Direction Générale GIW'ANVO",
    objet:              "Convocation réunion partenaires énergie renouvelable",
    serviceConcerne:    "Direction Générale",
    priorite:           "URGENT",
    statut:             "EN_TRAITEMENT",
    affecteA:           "directrice@giwaanvo.com",
    dateEnregistrement: "2026-04-05",
  },
  {
    id:                 "cr2",
    reference:          "CRS-2026-018",
    type:               "SORTANT",
    date:               "2026-04-03",
    expediteur:         "GIW'ANVO Energy",
    destinataire:       "SENELEC — Direction des projets",
    objet:              "Offre technique pour l'appel d'offres éclairage public",
    serviceConcerne:    "Direction Technique",
    priorite:           "NORMALE",
    statut:             "REPONDU",
    dateEnregistrement: "2026-04-03",
  },
  {
    id:                 "cr3",
    reference:          "CRE-2026-041",
    type:               "ENTRANT",
    date:               "2026-04-01",
    expediteur:         "Banque Atlantique Sénégal",
    destinataire:       "Service Comptabilité",
    objet:              "Relevé bancaire mensuel — Mars 2026",
    serviceConcerne:    "Comptabilité",
    priorite:           "NORMALE",
    statut:             "ARCHIVE",
    dateEnregistrement: "2026-04-01",
  },
  {
    id:                 "cr4",
    reference:          "CRE-2026-043",
    type:               "ENTRANT",
    date:               "2026-04-07",
    expediteur:         "Délégation UE au Sénégal",
    destinataire:       "Responsable Partenariats",
    objet:              "Invitation forum Africa Green Energy 2026",
    serviceConcerne:    "Partenariats",
    priorite:           "CONFIDENTIEL",
    statut:             "RECU",
    dateEnregistrement: "2026-04-07",
  },
]

type Onglet = "tous" | "entrant" | "sortant" | "archives"

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

function BadgePriorite({ priorite }: { priorite: PrioriteCourrier }) {
  const cfg = {
    NORMALE:      { color: "var(--text-secondary)", bg: "var(--bg-border)" },
    URGENT:       { color: "#ef4444",               bg: "rgba(239,68,68,0.10)" },
    CONFIDENTIEL: { color: "#f59e0b",               bg: "rgba(245,158,11,0.10)" },
  }[priorite]
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20, fontFamily: "var(--font-body)" }}>
      {LABEL_PRIORITE_COURRIER[priorite]}
    </span>
  )
}

/* ════════════════════════════════════════════════
   Page — Gestion du courrier
   ════════════════════════════════════════════════ */

export default function RHCourrierPage() {
  const { role } = useCurrentUser()
  const navigate         = useNavigate()
  const access           = role ? getModuleAccess(role, "rh") : "none"

  const [courriers, setCourriers]     = useState<Courrier[]>(COURRIER_MOCK)
  const [onglet, setOnglet]           = useState<Onglet>("tous")
  const [recherche, setRecherche]     = useState("")
  const [formulaireOuvert, setForm]   = useState(false)
  const [selectionne, setSelectionne] = useState<Courrier | null>(null)

  /* État formulaire */
  const [fType, setFType]             = useState<TypeCourrier>("ENTRANT")
  const [fDate, setFDate]             = useState("")
  const [fExpediteur, setFExpediteur] = useState("")
  const [fDestinataire, setFDest]     = useState("")
  const [fObjet, setFObjet]           = useState("")
  const [fService, setFService]       = useState("")
  const [fPriorite, setFPriorite]     = useState<PrioriteCourrier>("NORMALE")

  if (access === "none") return <AccessDenied message="Accès réservé aux RH et à la direction." />

  const liste = courriers.filter((c) => {
    if (onglet === "entrant"  && c.type !== "ENTRANT")       return false
    if (onglet === "sortant"  && c.type !== "SORTANT")       return false
    if (onglet === "archives" && c.statut !== "ARCHIVE")     return false
    if (recherche) {
      const q = recherche.toLowerCase()
      return (
        c.objet.toLowerCase().includes(q) ||
        c.expediteur.toLowerCase().includes(q) ||
        c.reference.toLowerCase().includes(q)
      )
    }
    return true
  })

  /* Génère une référence auto */
  const nextRef = (): string => {
    const year = new Date().getFullYear()
    const n    = courriers.length + 1
    return `CR${fType === "ENTRANT" ? "E" : "S"}-${year}-${String(n).padStart(3, "0")}`
  }

  const resetForm = () => {
    setFType("ENTRANT"); setFDate(""); setFExpediteur("")
    setFDest(""); setFObjet(""); setFService(""); setFPriorite("NORMALE")
  }

  const handleCreer = () => {
    if (!fDate || !fExpediteur.trim() || !fObjet.trim()) {
      toast.error("Remplissez les champs obligatoires")
      return
    }
    const nouveau: Courrier = {
      id:                 `cr${Date.now()}`,
      reference:          nextRef(),
      type:               fType,
      date:               fDate,
      expediteur:         fExpediteur.trim(),
      destinataire:       fDestinataire.trim() || "GIW'ANVO Energy",
      objet:              fObjet.trim(),
      serviceConcerne:    fService.trim() || "Général",
      priorite:           fPriorite,
      statut:             "RECU",
      dateEnregistrement: new Date().toISOString().slice(0, 10),
    }
    setCourriers((prev) => [nouveau, ...prev])
    setForm(false)
    resetForm()
    toast.success("Courrier enregistré")
  }

  const handleAvancer = (id: string, statut: StatutCourrier) => {
    setCourriers((prev) => prev.map((c) => c.id === id ? { ...c, statut } : c))
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={20} style={{ color: "#34d399" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Gestion du courrier
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Enregistrement et suivi du courrier entrant et sortant
              </p>
            </div>
          </div>
          <button
            onClick={() => setForm(true)}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #34d399, #10b981)" }}
          >
            <Plus size={16} /> Enregistrer un courrier
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",     value: courriers.length,                                              color: "var(--text-primary)" },
          { label: "Entrants",  value: courriers.filter((c) => c.type === "ENTRANT").length,          color: "#34d399" },
          { label: "Sortants",  value: courriers.filter((c) => c.type === "SORTANT").length,          color: "#60a5fa" },
          { label: "En cours",  value: courriers.filter((c) => !["ARCHIVE","REPONDU"].includes(c.statut)).length, color: "#f0a500" },
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
            { id: "tous",     label: "Tous" },
            { id: "entrant",  label: "Entrants" },
            { id: "sortant",  label: "Sortants" },
            { id: "archives", label: "Archives" },
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
            placeholder="Rechercher par objet, expéditeur ou référence..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Liste */}
      {liste.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(13,26,16,0.5)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <Mail size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucun courrier trouvé</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {liste.map((c) => {
            const cfg     = STATUT_COURRIER_CONFIG[c.statut]
            const entrant = c.type === "ENTRANT"
            return (
              <button
                key={c.id}
                onClick={() => setSelectionne(c)}
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "rgba(13,26,16,0.7)", border: "1px solid var(--bg-border)", borderRadius: 12, transition: "all 150ms", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(13,26,16,0.9)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.background = "rgba(13,26,16,0.7)" }}
              >
                {/* Icône type */}
                <div style={{ width: 38, height: 38, borderRadius: 9, background: entrant ? "rgba(52,211,153,0.10)" : "rgba(96,165,250,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {entrant
                    ? <ArrowDownLeft size={16} style={{ color: "#34d399" }} />
                    : <ArrowUpRight  size={16} style={{ color: "#60a5fa" }} />
                  }
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {c.reference}
                    </span>
                    <BadgePriorite priorite={c.priorite} />
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.objet}
                  </p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <User size={11} /> {entrant ? c.expediteur : c.destinataire}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Calendar size={11} /> {formatDate(c.date)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {c.serviceConcerne}
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
          <div style={{ width: "100%", maxWidth: 540, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  {selectionne.reference} · {LABEL_TYPE_COURRIER[selectionne.type]}
                </p>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1.3 }}>
                  {selectionne.objet}
                </h2>
              </div>
              <button onClick={() => setSelectionne(null)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Type",           value: LABEL_TYPE_COURRIER[selectionne.type] },
                { label: "Expéditeur",     value: selectionne.expediteur },
                { label: "Destinataire",   value: selectionne.destinataire },
                { label: "Date",           value: formatDate(selectionne.date) },
                { label: "Service",        value: selectionne.serviceConcerne },
                { label: "Priorité",       value: LABEL_PRIORITE_COURRIER[selectionne.priorite] },
                { label: "Statut",         value: STATUT_COURRIER_CONFIG[selectionne.statut].label },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)", textAlign: "right" }}>{value}</span>
                </div>
              ))}

              {/* Actions */}
              {!["REPONDU","ARCHIVE"].includes(selectionne.statut) && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {selectionne.statut === "RECU" && (
                    <button onClick={() => handleAvancer(selectionne.id, "ENREGISTRE")} style={{ all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)" }}>
                      Enregistrer →
                    </button>
                  )}
                  {selectionne.statut === "ENREGISTRE" && (
                    <button onClick={() => handleAvancer(selectionne.id, "AFFECTE")} style={{ all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#f0a500", background: "rgba(240,165,0,0.10)", border: "1px solid rgba(240,165,0,0.30)" }}>
                      Affecter →
                    </button>
                  )}
                  {selectionne.statut === "EN_TRAITEMENT" && (
                    <button onClick={() => handleAvancer(selectionne.id, "REPONDU")} style={{ all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                      Marquer répondu
                    </button>
                  )}
                  <button onClick={() => handleAvancer(selectionne.id, "ARCHIVE")} style={{ all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                    Archiver
                  </button>
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
          <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Mail size={18} style={{ color: "#34d399" }} />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Enregistrer un courrier
                </h2>
              </div>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Type de courrier — boutons radio visuels */}
              <div>
                <label style={labelStyle}>Type de courrier</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ENTRANT", "SORTANT"] as TypeCourrier[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFType(t)}
                      style={{
                        all: "unset", cursor: "pointer",
                        flex: 1, padding: "10px 16px", borderRadius: 10,
                        display: "flex", alignItems: "center", gap: 8,
                        justifyContent: "center",
                        border: `1px solid ${fType === t ? "#34d399" : "var(--bg-border)"}`,
                        background: fType === t ? "rgba(52,211,153,0.10)" : "var(--bg-elevated)",
                        color: fType === t ? "#34d399" : "var(--text-secondary)",
                        fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
                        transition: "all 150ms",
                      }}
                    >
                      {t === "ENTRANT"
                        ? <><ArrowDownLeft size={14} /> Entrant</>
                        : <><ArrowUpRight  size={14} /> Sortant</>
                      }
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Priorité</label>
                  <select value={fPriorite} onChange={(e) => setFPriorite(e.target.value as PrioriteCourrier)} style={fieldStyle}>
                    {Object.entries(LABEL_PRIORITE_COURRIER).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Expéditeur *</label>
                <input type="text" placeholder="Nom de l'expéditeur ou organisation" value={fExpediteur} onChange={(e) => setFExpediteur(e.target.value)} style={fieldStyle} />
              </div>

              <div>
                <label style={labelStyle}>Destinataire</label>
                <input type="text" placeholder="Service ou personne destinataire" value={fDestinataire} onChange={(e) => setFDest(e.target.value)} style={fieldStyle} />
              </div>

              <div>
                <label style={labelStyle}>Objet *</label>
                <input type="text" placeholder="Résumé de l'objet du courrier" value={fObjet} onChange={(e) => setFObjet(e.target.value)} style={fieldStyle} />
              </div>

              <div>
                <label style={labelStyle}>Service concerné</label>
                <input type="text" placeholder="Ex : Direction Générale, Comptabilité..." value={fService} onChange={(e) => setFService(e.target.value)} style={fieldStyle} />
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--bg-border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setForm(false); resetForm() }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                Annuler
              </button>
              <button onClick={handleCreer} style={{ all: "unset", cursor: "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg, #34d399, #10b981)" }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
