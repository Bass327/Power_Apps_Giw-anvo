import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Calendar, ChevronLeft, Plus, Search,
  X, CheckCircle, XCircle, Loader2, AlertCircle,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission, getDataScope } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useDemandesConges, useCreateDemandeConge, useUpdateStatutConge } from "@/hooks/useDemandesConges"
import type { DemandeConge, TypeConge } from "@/types/rh"
import { STATUT_CONGE_CONFIG, LABEL_TYPE_CONGE } from "@/types/rh"

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function calculerDuree(dateDebut: string, dateFin: string): number {
  if (!dateDebut || !dateFin) return 1
  const diff = new Date(dateFin).getTime() - new Date(dateDebut).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
}

type Onglet = "toutes" | "a-valider" | "approuvees" | "terminees"

/* ── Styles partagés ── */
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
  color: "var(--text-secondary)",
  fontFamily: "var(--font-body)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  marginBottom: 6,
}

/* ════════════════════════════════════════════════
   Page — Gestion des congés
   ════════════════════════════════════════════════ */

export default function RHCongesPage() {
  const { role, user }  = useCurrentUser()
  const email           = user?.email ?? ""
  const navigate        = useNavigate()
  const access          = role ? getModuleAccess(role, "rh") : "none"

  const [onglet, setOnglet]           = useState<Onglet>("toutes")
  const [recherche, setRecherche]     = useState("")
  const [formulaireOuvert, setFormulaire] = useState(false)
  const [congeActif, setCongeActif]   = useState<DemandeConge | null>(null)
  const [commentaire, setCommentaire] = useState("")

  /* Formulaire création */
  const [typeConge, setTypeConge]   = useState<TypeConge>("ANNUEL")
  const [dateDebut, setDateDebut]   = useState("")
  const [dateFin, setDateFin]       = useState("")
  const [motif, setMotif]           = useState("")

  /* Hooks SharePoint */
  const { data: conges = [], isLoading, isError } = useDemandesConges()
  const { mutate: creer,    isPending: creation }  = useCreateDemandeConge()
  const { mutate: mettreAJour, isPending: validation } = useUpdateStatutConge()

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  /* ── Permissions actions ── */
  const peutValider = role ? hasPermission(role, "canValiderConge")  : false
  const peutCreer   = role ? hasPermission(role, "canSubmitOwnRH")   : false
  const scope       = role ? getDataScope(role) : "own"

  /* ── Filtrage selon le scope ── */
  const congesFiltres = useMemo(() => {
    return conges.filter((c) => {
      // Filtrage par scope de données
      if (scope === "own"        && c.demandeur !== email)  return false
      // Chef Dept. : voit son équipe (scope department — on filtre sur demandeur non vide pour l'instant)
      // RAF / Directrice / Comptable : voient tout

      if (onglet === "a-valider"  && c.statut !== "SOUMIS")   return false
      if (onglet === "approuvees" && c.statut !== "APPROUVE")  return false
      if (onglet === "terminees"  && c.statut !== "TERMINE")   return false

      if (recherche) {
        const q = recherche.toLowerCase()
        return (
          c.demandeur.toLowerCase().includes(q) ||
          LABEL_TYPE_CONGE[c.typeConge].toLowerCase().includes(q) ||
          c.motif.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [conges, onglet, recherche, role, email])

  const nbAValider = useMemo(
    () => peutValider ? conges.filter((c) => c.statut === "SOUMIS").length : 0,
    [conges, peutValider],
  )

  /* ── Création d'une demande ── */
  function handleCreer(e: React.FormEvent) {
    e.preventDefault()
    if (!dateDebut || !dateFin) return

    creer(
      {
        data: {
          typeConge,
          dateDebut,
          dateFin,
          duree:      calculerDuree(dateDebut, dateFin),
          motif:      motif.trim() || LABEL_TYPE_CONGE[typeConge],
          demandeur:  email,
          statut:     "SOUMIS",
        },
        soumettre: true,
      },
      {
        onSuccess: () => {
          setTypeConge("ANNUEL")
          setDateDebut("")
          setDateFin("")
          setMotif("")
          setFormulaire(false)
        },
      },
    )
  }

  /* ── Approbation ── */
  function handleApprouver(id: string) {
    mettreAJour(
      { id, statut: "APPROUVE", commentaire: commentaire.trim() || undefined, valideur: email },
      {
        onSuccess: () => {
          setCongeActif(null)
          setCommentaire("")
        },
      },
    )
  }

  /* ── Rejet ── */
  function handleRejeter(id: string) {
    mettreAJour(
      { id, statut: "REJETE", commentaire: commentaire.trim() || undefined, valideur: email },
      {
        onSuccess: () => {
          setCongeActif(null)
          setCommentaire("")
        },
      },
    )
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
          {peutCreer && (
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
          { label: "Total",      value: conges.length,                                         color: "var(--text-primary)" },
          { label: "En attente", value: conges.filter((c) => c.statut === "SOUMIS").length,    color: "#60a5fa" },
          { label: "Approuvés",  value: conges.filter((c) => c.statut === "APPROUVE").length,  color: "#22c55e" },
          { label: "Terminés",   value: conges.filter((c) => c.statut === "TERMINE").length,   color: "#34d399" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "14px 18px", background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)", borderRadius: 12 }}>
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
            placeholder="Rechercher par demandeur, type, motif…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* États de chargement */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: 10 }}>
          <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement des congés…</span>
        </div>
      )}

      {isError && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12 }}>
          <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontFamily: "var(--font-body)" }}>
            Impossible de charger les congés. Vérifiez votre connexion et réessayez.
          </p>
        </div>
      )}

      {/* Liste */}
      {!isLoading && !isError && congesFiltres.length === 0 && (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--bg-elevated)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
          <Calendar size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Aucune demande trouvée</p>
          {onglet === "toutes" && peutCreer && (
            <button
              onClick={() => setFormulaire(true)}
              style={{ marginTop: 14, all: "unset", cursor: "pointer", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
            >
              Créer ma première demande
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && congesFiltres.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {congesFiltres.map((conge) => {
            const cfg     = STATUT_CONGE_CONFIG[conge.statut]
            const actionnable = peutValider && conge.statut === "SOUMIS"
            return (
              <div
                key={conge.id}
                onClick={() => actionnable && setCongeActif(conge)}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px",
                  background: "var(--glass-card-bg)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 12,
                  cursor: actionnable ? "pointer" : "default",
                  transition: "border-color 150ms",
                }}
                onMouseEnter={(e) => { if (actionnable) e.currentTarget.style.borderColor = "var(--green-vivid)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)" }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(34,197,94,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={17} style={{ color: "#22c55e" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {LABEL_TYPE_CONGE[conge.typeConge]}
                    {conge.motif && <span style={{ fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8, fontSize: 13 }}>— {conge.motif}</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {conge.demandeur.split("@")[0]} · {formatDate(conge.dateDebut)} → {formatDate(conge.dateFin)}
                    <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>({conge.duree} j.)</span>
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-body)", fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                  {/* Actions rapides inline (sans ouvrir de modal) */}
                  {actionnable && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCongeActif(conge) }}
                        style={{ all: "unset", cursor: "pointer", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                      >
                        Voir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal validation ── */}
      {congeActif && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setCongeActif(null); setCommentaire("") } }}
        >
          <div style={{ width: "100%", maxWidth: 500, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Demande de congé
              </h2>
              <button
                onClick={() => { setCongeActif(null); setCommentaire("") }}
                style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Récapitulatif */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Demandeur",  value: congeActif.demandeur.split("@")[0] },
                  { label: "Type",       value: LABEL_TYPE_CONGE[congeActif.typeConge] },
                  { label: "Du",         value: formatDate(congeActif.dateDebut) },
                  { label: "Au",         value: formatDate(congeActif.dateFin) },
                  { label: "Durée",      value: `${congeActif.duree} jour(s)` },
                  { label: "Soumis le",  value: formatDate(congeActif.dateDemande) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
              {congeActif.motif && (
                <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Motif</p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{congeActif.motif}</p>
                </div>
              )}
              {/* Commentaire optionnel */}
              <div>
                <label style={labelStyle}>Commentaire (optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Ajouter un commentaire à votre décision…"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setCongeActif(null); setCommentaire("") }}
                  style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                >
                  Fermer
                </button>
                <button
                  onClick={() => handleRejeter(congeActif.id)}
                  disabled={validation}
                  style={{ all: "unset", cursor: validation ? "default" : "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", display: "flex", alignItems: "center", gap: 6, opacity: validation ? 0.6 : 1 }}
                >
                  <XCircle size={14} /> Refuser
                </button>
                <button
                  onClick={() => handleApprouver(congeActif.id)}
                  disabled={validation}
                  style={{ all: "unset", cursor: validation ? "default" : "pointer", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6, opacity: validation ? 0.6 : 1 }}
                >
                  {validation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={14} />}
                  Approuver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal formulaire création ── */}
      {formulaireOuvert && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !creation) setFormulaire(false) }}
        >
          <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Nouvelle demande de congé
              </h2>
              <button
                onClick={() => { if (!creation) setFormulaire(false) }}
                style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <form onSubmit={handleCreer} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Type de congé *</label>
                <select
                  value={typeConge}
                  onChange={(e) => setTypeConge(e.target.value as TypeConge)}
                  required
                  style={inputStyle}
                >
                  {(Object.entries(LABEL_TYPE_CONGE) as [TypeConge, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Du *</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Au *</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    required
                    min={dateDebut}
                    style={inputStyle}
                  />
                </div>
              </div>
              {dateDebut && dateFin && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Durée calculée : <strong style={{ color: "var(--gold-warm)" }}>{calculerDuree(dateDebut, dateFin)} jour(s)</strong>
                </p>
              )}
              <div>
                <label style={labelStyle}>Motif</label>
                <textarea
                  rows={3}
                  placeholder="Motif de la demande (optionnel)…"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setFormulaire(false)}
                  disabled={creation}
                  style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creation}
                  style={{ all: "unset", cursor: creation ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 8, opacity: creation ? 0.7 : 1 }}
                >
                  {creation && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
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
