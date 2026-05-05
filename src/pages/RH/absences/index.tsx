import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { UserX, ChevronLeft, Plus, Search, X, Loader2, AlertCircle } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission, getDataScope } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useAbsences, useCreateAbsence, useUpdateStatutAbsence } from "@/hooks/useAbsences"
import type { Absence, StatutAbsence, TypeAbsence } from "@/types/rh"
import { STATUT_ABSENCE_CONFIG, LABEL_TYPE_ABSENCE } from "@/types/rh"

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

type Onglet = "toutes" | "en-attente" | "justifiees" | "non-justifiees"

const inputStyle: React.CSSProperties = {
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

/* ════════════════════════════════════════════════
   Page — Gestion des absences
   ════════════════════════════════════════════════ */

export default function RHAbsencesPage() {
  const { role, user }  = useCurrentUser()
  const email           = user?.email ?? ""
  const navigate        = useNavigate()
  const access          = role ? getModuleAccess(role, "rh") : "none"

  const [onglet, setOnglet]           = useState<Onglet>("toutes")
  const [recherche, setRecherche]     = useState("")
  const [formulaireOuvert, setFormulaire] = useState(false)
  const [absenceActif, setAbsenceActif]   = useState<Absence | null>(null)
  const [commentaire, setCommentaire]     = useState("")

  /* Formulaire */
  const [typeAbsence, setTypeAbsence] = useState<TypeAbsence>("MALADIE")
  const [dateAbsence, setDateAbsence] = useState("")
  const [duree, setDuree]             = useState("1")
  const [motif, setMotif]             = useState("")

  /* Hooks SharePoint */
  const { data: absences = [], isLoading, isError } = useAbsences()
  const { mutate: signaler,  isPending: creation }   = useCreateAbsence()
  const { mutate: mettreAJour, isPending: enCours }  = useUpdateStatutAbsence()

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  const peutGerer = role ? hasPermission(role, "canValiderAbsence") : false
  const peutCreer = role ? hasPermission(role, "canSubmitOwnRH")    : false
  const scope     = role ? getDataScope(role)                        : "own"

  /* ── Filtrage ── */
  const absencesFiltrees = useMemo(() => {
    return absences.filter((a) => {
      if (scope === "own" && a.employe !== email) return false
      if (onglet === "en-attente"     && a.statut !== "EN_ATTENTE")    return false
      if (onglet === "justifiees"     && a.statut !== "JUSTIFIEE")     return false
      if (onglet === "non-justifiees" && a.statut !== "NON_JUSTIFIEE") return false
      if (recherche) {
        const q = recherche.toLowerCase()
        return (
          a.employe.toLowerCase().includes(q) ||
          LABEL_TYPE_ABSENCE[a.typeAbsence].toLowerCase().includes(q) ||
          a.motif.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [absences, onglet, recherche, scope, email])

  const nbEnAttente = useMemo(
    () => absences.filter((a) => a.statut === "EN_ATTENTE").length,
    [absences],
  )

  /* ── Signalement ── */
  function handleCreer(e: React.FormEvent) {
    e.preventDefault()
    signaler(
      {
        typeAbsence,
        dateAbsence,
        duree:           parseInt(duree) || 1,
        motif:           motif.trim(),
        employe:         email,
        statut:          "EN_ATTENTE",
      },
      {
        onSuccess: () => {
          setTypeAbsence("MALADIE")
          setDateAbsence("")
          setDuree("1")
          setMotif("")
          setFormulaire(false)
        },
      },
    )
  }

  /* ── Mise à jour statut ── */
  function handleStatut(id: string, statut: StatutAbsence) {
    mettreAJour(
      { id, statut, commentaire: commentaire.trim() || undefined },
      { onSuccess: () => { setAbsenceActif(null); setCommentaire("") } },
    )
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
          {peutCreer && (
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
          { label: "Total",          value: absences.length,                                               color: "var(--text-primary)" },
          { label: "En attente",     value: absences.filter((a) => a.statut === "EN_ATTENTE").length,     color: "#f59e0b" },
          { label: "Justifiées",     value: absences.filter((a) => a.statut === "JUSTIFIEE").length,      color: "#22c55e" },
          { label: "Non justifiées", value: absences.filter((a) => a.statut === "NON_JUSTIFIEE").length,  color: "#ef4444" },
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
            { id: "toutes",         label: "Toutes" },
            { id: "en-attente",     label: "En attente" },
            { id: "justifiees",     label: "Justifiées" },
            { id: "non-justifiees", label: "Non justifiées" },
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
                <span style={{ fontSize: 10, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>{nbEnAttente}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher par employé, type…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* États chargement */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: 10 }}>
          <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement des absences…</span>
        </div>
      )}
      {isError && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12 }}>
          <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontFamily: "var(--font-body)" }}>Impossible de charger les absences. Vérifiez votre connexion.</p>
        </div>
      )}

      {/* Liste */}
      {!isLoading && !isError && absencesFiltrees.length === 0 && (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--bg-elevated)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <UserX size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucune absence trouvée</p>
        </div>
      )}

      {!isLoading && !isError && absencesFiltrees.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {absencesFiltrees.map((absence) => {
            const cfg      = STATUT_ABSENCE_CONFIG[absence.statut]
            const actionnable = peutGerer && absence.statut === "EN_ATTENTE"
            return (
              <div
                key={absence.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)", borderRadius: 12 }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <UserX size={17} style={{ color: "#ef4444" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {LABEL_TYPE_ABSENCE[absence.typeAbsence]}
                    </p>
                    <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 9px", borderRadius: 20, fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {absence.employe.split("@")[0]} · {formatDate(absence.dateAbsence)} · {absence.duree} jour{absence.duree > 1 ? "s" : ""}
                  </p>
                  {absence.motif && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                      {absence.motif}
                    </p>
                  )}
                  {actionnable && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => { setAbsenceActif(absence); setCommentaire("") }}
                        style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                      >
                        Traiter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal traitement absence ── */}
      {absenceActif && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAbsenceActif(null); setCommentaire("") } }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Traiter l'absence</h2>
              <button onClick={() => { setAbsenceActif(null); setCommentaire("") }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Employé",  value: absenceActif.employe.split("@")[0] },
                  { label: "Type",     value: LABEL_TYPE_ABSENCE[absenceActif.typeAbsence] },
                  { label: "Date",     value: formatDate(absenceActif.dateAbsence) },
                  { label: "Durée",    value: `${absenceActif.duree} jour(s)` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
              {absenceActif.motif && (
                <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Motif</p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{absenceActif.motif}</p>
                </div>
              )}
              <div>
                <label style={labelStyle}>Commentaire (optionnel)</label>
                <textarea rows={2} placeholder="Précisez si nécessaire…" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setAbsenceActif(null); setCommentaire("") }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button
                  onClick={() => handleStatut(absenceActif.id, "NON_JUSTIFIEE")}
                  disabled={enCours}
                  style={{ all: "unset", cursor: enCours ? "default" : "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", opacity: enCours ? 0.6 : 1 }}
                >
                  Non justifiée
                </button>
                <button
                  onClick={() => handleStatut(absenceActif.id, "JUSTIFIEE")}
                  disabled={enCours}
                  style={{ all: "unset", cursor: enCours ? "default" : "pointer", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6, opacity: enCours ? 0.6 : 1 }}
                >
                  {enCours && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  Justifiée
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal formulaire signalement ── */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !creation) setFormulaire(false) }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Signaler une absence</h2>
              <button onClick={() => { if (!creation) setFormulaire(false) }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <form onSubmit={handleCreer} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Type d'absence *</label>
                <select value={typeAbsence} onChange={(e) => setTypeAbsence(e.target.value as TypeAbsence)} required style={inputStyle}>
                  {(Object.entries(LABEL_TYPE_ABSENCE) as [TypeAbsence, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={dateAbsence} onChange={(e) => setDateAbsence(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Durée (jours) *</label>
                  <input type="number" min="1" value={duree} onChange={(e) => setDuree(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Motif</label>
                <textarea rows={3} placeholder="Précisez le motif (optionnel)…" value={motif} onChange={(e) => setMotif(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setFormulaire(false)} disabled={creation} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button type="submit" disabled={creation} style={{ all: "unset", cursor: creation ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", gap: 8, opacity: creation ? 0.7 : 1 }}>
                  {creation && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
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
