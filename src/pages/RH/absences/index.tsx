import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  UserX, ChevronLeft, Plus, Search, Loader2, AlertCircle,
  FileCheck, Check, X, RotateCcw, Save, ShieldCheck,
} from "lucide-react"
import { loadDraftAbsence, formatSavedAt } from "@/lib/draftAbsence"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"

/* ── Module signalement absences (existant) ── */
import { useAbsences, useCreateAbsence, useUpdateStatutAbsence } from "@/hooks/useAbsences"
import type { Absence, StatutAbsence, TypeAbsence } from "@/types/rh"
import { STATUT_ABSENCE_CONFIG, LABEL_TYPE_ABSENCE } from "@/types/rh"

/* ── Module demandes d'autorisation (nouveau) ── */
import { useDemandesAbsences, useUpdateStatutDemandeAbsence } from "@/hooks/useDemandesAbsences"
import type { DemandeAbsence, StatutDemandeAbsence } from "@/types/rh"
import {
  STATUT_DEMANDE_ABSENCE_CONFIG,
  LABEL_TYPE_DEMANDE_ABSENCE,
  LABEL_EVENEMENT_FAMILIAL,
} from "@/types/rh"
import { FormulaireDemandeAbsence } from "./components/FormulaireDemandeAbsence"

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)", border: "1px solid var(--bg-border)",
  borderRadius: 8, color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "var(--text-secondary)",
  fontFamily: "var(--font-body)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 6,
}

type OngletPrincipal = "autorisations" | "signalements"
type OngletAuto      = "toutes" | "en-attente" | "approuvees" | "refusees"
type OngletSignal    = "toutes" | "en-attente" | "justifiees" | "non-justifiees"

/* ════════════════════════════════════════════════
   Page — Gestion des absences
   ════════════════════════════════════════════════ */

export default function RHAbsencesPage() {
  const { role, user }  = useCurrentUser()
  const email           = user?.email ?? ""
  const navigate        = useNavigate()
  const access          = role ? getModuleAccess(role, "rh") : "none"

  const [ongletPrincipal, setOngletPrincipal] = useState<OngletPrincipal>("autorisations")

  /* ── Brouillon en cours ── */
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [restoreDraft, setRestoreDraft] = useState(false)

  useEffect(() => {
    if (!email) return
    const draft = loadDraftAbsence(email)
    setDraftSavedAt(draft ? draft.savedAt : null)
  }, [email])

  /* ── État onglet Autorisations ── */
  const [ongletAuto, setOngletAuto]               = useState<OngletAuto>("toutes")
  const [rechercheAuto, setRechercheAuto]         = useState("")
  const [formulaireOuvert, setFormulaire]         = useState(false)
  const [demandeActif, setDemandeActif]           = useState<DemandeAbsence | null>(null)
  const [commentaireDecision, setCommentaireDecision] = useState("")

  /* ── État onglet Signalements ── */
  const [ongletSignal, setOngletSignal]           = useState<OngletSignal>("toutes")
  const [rechercheSignal, setRechercheSignal]     = useState("")
  const [absenceActif, setAbsenceActif]           = useState<Absence | null>(null)
  const [commentaireSignal, setCommentaireSignal] = useState("")
  const [formulaireSignal, setFormulaireSignal]   = useState(false)

  /* ── Formulaire signalement ── */
  const [typeAbsence, setTypeAbsence] = useState<TypeAbsence>("MALADIE")
  const [dateAbsence, setDateAbsence] = useState("")
  const [duree, setDuree]             = useState("1")
  const [motif, setMotif]             = useState("")

  /* Scope calculé avant les hooks (règle React : pas de hook après un return conditionnel).
     RAF et Directrice voient tout ; Chef Dept. voit son département ; sinon "own". */
  const scope: "own" | "department" | "global" =
    role === "RAF" || role === "Directrice" ? "global" :
    role === "Chef Dept."                   ? "department" : "own"

  /* Pour scope "own" : filtre côté serveur par email — chaque employé ne voit que ses propres demandes.
     On passe l'email tel quel (même vide) ; le hook désactive la requête si email = "". */
  const filterEmailParam: string | undefined = scope === "own" ? email : undefined

  /* ── Hooks données ── */
  const { data: demandes  = [], isLoading: loadingAuto,   isError: errorAuto   } = useDemandesAbsences(filterEmailParam)
  const { data: absences  = [], isLoading: loadingSignal, isError: errorSignal } = useAbsences()
  const { mutate: majStatutAuto,    isPending: enCoursAuto }    = useUpdateStatutDemandeAbsence()
  const { mutate: signalerAbsence,  isPending: creationSignal } = useCreateAbsence()
  const { mutate: mettreAJourAbsence, isPending: enCoursSignal } = useUpdateStatutAbsence()

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  const peutCreerDemande  = role ? hasPermission(role, "canSubmitOwnRH")    : false
  /* Signalements : uniquement Directrice et Chef Dept. */
  const peutVoirSignalements = role === "Directrice" || role === "Chef Dept."
  const peutCreerSignal      = peutVoirSignalements
  const peutGererSignal      = peutVoirSignalements && (role ? hasPermission(role, "canValiderAbsence") : false)
  /* Chef de département valide les demandes SOUMIS de son département */
  const peutValiderChef   = role === "Chef Dept."
  /* Directrice a le dernier mot : approuve/refuse SOUMIS ou VALIDE_CHEF */
  const peutApprouverDG   = role === "Directrice"

  /* ── Portée des données selon le rôle (insensible à la casse) ── */
  const demandesScope = useMemo(() => {
    const emailLower = email.toLowerCase()
    return demandes.filter((d) => {
      if (scope === "own" && d.demandeur.toLowerCase() !== emailLower) return false
      if (scope === "department" && d.departement !== user?.departement) return false
      return true
    })
  }, [demandes, scope, email, user])

  /* ── Filtrage par onglet + recherche ── */
  const demandesFiltrees = useMemo(() => {
    return demandesScope.filter((d) => {
      if (ongletAuto === "en-attente" && !["SOUMIS", "VALIDE_CHEF"].includes(d.statut)) return false
      if (ongletAuto === "approuvees" && d.statut !== "APPROUVE_DG") return false
      if (ongletAuto === "refusees"   && d.statut !== "REFUSE_DG" && d.statut !== "REJETE_CHEF") return false

      if (rechercheAuto) {
        const q = rechercheAuto.toLowerCase()
        return (
          d.codeDemande.toLowerCase().includes(q) ||
          d.nomDemandeur.toLowerCase().includes(q) ||
          d.departement.toLowerCase().includes(q) ||
          LABEL_TYPE_DEMANDE_ABSENCE[d.typeDemande].toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [demandesScope, ongletAuto, rechercheAuto])

  /* ── Filtrage — signalements ── */
  const absencesFiltrees = useMemo(() => {
    const emailLower = email.toLowerCase()
    return absences.filter((a) => {
      if (scope === "own" && a.employe.toLowerCase() !== emailLower) return false
      if (ongletSignal === "en-attente"     && a.statut !== "EN_ATTENTE")    return false
      if (ongletSignal === "justifiees"     && a.statut !== "JUSTIFIEE")     return false
      if (ongletSignal === "non-justifiees" && a.statut !== "NON_JUSTIFIEE") return false
      if (rechercheSignal) {
        const q = rechercheSignal.toLowerCase()
        return (
          a.employe.toLowerCase().includes(q) ||
          LABEL_TYPE_ABSENCE[a.typeAbsence].toLowerCase().includes(q) ||
          a.motif.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [absences, ongletSignal, rechercheSignal, scope, email])

  /* ── Compteurs badges ── */
  const nbEnAttenteAuto = useMemo(() => {
    if (peutApprouverDG)
      return demandesScope.filter((d) => d.statut === "SOUMIS" || d.statut === "VALIDE_CHEF").length
    if (peutValiderChef)
      return demandesScope.filter((d) => d.statut === "SOUMIS" && d.departement === user?.departement).length
    return 0
  }, [demandesScope, peutApprouverDG, peutValiderChef, user])

  const nbEnAttenteSignal = useMemo(() => absences.filter((a) => a.statut === "EN_ATTENTE").length, [absences])

  /* ── Actions autorisations ── */
  function handleDecision(statut: StatutDemandeAbsence) {
    if (!demandeActif) return
    majStatutAuto(
      {
        id:             demandeActif.id,
        statut,
        commentaire:    commentaireDecision.trim() || undefined,
        validePar:      user?.displayName,
        role:           role ?? undefined,
        demandeurEmail: demandeActif.demandeur,
        nomDemandeur:   demandeActif.nomDemandeur,
        codeDemande:    demandeActif.codeDemande,
      },
      { onSuccess: () => { setDemandeActif(null); setCommentaireDecision("") } },
    )
  }

  /* ── Actions signalements ── */
  function handleCreerSignal(e: React.FormEvent) {
    e.preventDefault()
    signalerAbsence(
      { typeAbsence, dateAbsence, duree: parseInt(duree) || 1, motif: motif.trim(), employe: email, statut: "EN_ATTENTE" },
      {
        onSuccess: () => {
          setTypeAbsence("MALADIE")
          setDateAbsence("")
          setDuree("1")
          setMotif("")
          setFormulaireSignal(false)
        },
      },
    )
  }

  function handleStatutSignal(id: string, statut: StatutAbsence) {
    mettreAJourAbsence(
      { id, statut, commentaire: commentaireSignal.trim() || undefined },
      { onSuccess: () => { setAbsenceActif(null); setCommentaireSignal("") } },
    )
  }

  /* Libellé du bouton "Traiter" selon le statut de la demande et le rôle */
  function labelBoutonTraiter(d: DemandeAbsence): string | null {
    if (peutValiderChef && d.statut === "SOUMIS" && d.departement === user?.departement) return "Valider"
    if (peutApprouverDG && (d.statut === "SOUMIS" || d.statut === "VALIDE_CHEF")) return "Traiter"
    return null
  }

  /* ════ RENDU ════ */
  return (
    <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-12 sm:pb-16" style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", marginBottom: 12 }}
        >
          <ChevronLeft size={14} />
          Ressources Humaines
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserX size={20} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                Gestion des absences
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Autorisations d'absence et signalements
              </p>
            </div>
          </div>

          {ongletPrincipal === "autorisations" && peutCreerDemande && (
            <button
              onClick={() => setFormulaire(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)" }}
            >
              <Plus size={16} />
              Demande d'autorisation d'absence
            </button>
          )}
          {ongletPrincipal === "signalements" && peutVoirSignalements && peutCreerSignal && (
            <button
              onClick={() => setFormulaireSignal(true)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
            >
              <Plus size={16} />
              Signaler une absence
            </button>
          )}
        </div>
      </div>

      {/* ── Onglets principaux ── */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {([
          { id: "autorisations", label: "Autorisations d'absence", icon: <FileCheck size={14} />, badge: nbEnAttenteAuto,  visible: true },
          { id: "signalements",  label: "Signalements",             icon: <UserX size={14} />,   badge: nbEnAttenteSignal, visible: peutVoirSignalements },
        ] as { id: OngletPrincipal; label: string; icon: React.ReactNode; badge: number; visible: boolean }[])
        .filter((o) => o.visible)
        .map((o) => (
          <button
            key={o.id}
            onClick={() => setOngletPrincipal(o.id)}
            style={{
              all: "unset", cursor: "pointer", padding: "8px 18px", borderRadius: 9,
              fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
              background: ongletPrincipal === o.id ? "var(--bg-border)" : "transparent",
              color:      ongletPrincipal === o.id ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 150ms",
            }}
          >
            {o.icon}
            {o.label}
            {o.badge > 0 && (
              <span style={{ fontSize: 10, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>
                {o.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Bannière brouillon en cours ── */}
      {ongletPrincipal === "autorisations" && peutCreerDemande && draftSavedAt && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.30)", borderRadius: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Save size={16} style={{ color: "#f0a500", flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Demande en cours de saisie
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Brouillon enregistré automatiquement à {formatSavedAt(draftSavedAt)}. Reprenez où vous en étiez.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setRestoreDraft(true); setFormulaire(true) }}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", whiteSpace: "nowrap" }}
          >
            <RotateCcw size={13} />
            Reprendre ma demande
          </button>
        </div>
      )}

      {/* ════════════════════════════════════
          SECTION — AUTORISATIONS D'ABSENCE
          ════════════════════════════════════ */}
      {ongletPrincipal === "autorisations" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total",       value: demandesScope.length,                                                                           color: "var(--text-primary)" },
              { label: "En attente",  value: demandesScope.filter((d) => d.statut === "SOUMIS" || d.statut === "VALIDE_CHEF").length,        color: "#f59e0b" },
              { label: "Approuvées",  value: demandesScope.filter((d) => d.statut === "APPROUVE_DG").length,                               color: "#22c55e" },
              { label: "Refusées",    value: demandesScope.filter((d) => d.statut === "REFUSE_DG" || d.statut === "REJETE_CHEF").length,    color: "#ef4444" },
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
                { id: "toutes",     label: "Toutes" },
                { id: "en-attente", label: peutValiderChef ? "À valider" : peutApprouverDG ? "À approuver" : "En attente" },
                { id: "approuvees", label: "Approuvées" },
                { id: "refusees",   label: "Refusées" },
              ] as { id: OngletAuto; label: string }[]).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOngletAuto(o.id)}
                  style={{ all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, background: ongletAuto === o.id ? "var(--bg-border)" : "transparent", color: ongletAuto === o.id ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 0 }}>
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Rechercher par demandeur, code, type…"
                value={rechercheAuto}
                onChange={(e) => setRechercheAuto(e.target.value)}
                style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {loadingAuto && <LoadingRow />}
          {errorAuto   && <ErrorRow message="Impossible de charger les demandes d'autorisation." />}

          {!loadingAuto && !errorAuto && demandesFiltrees.length === 0 && (
            <EmptyState icon={<FileCheck size={28} style={{ color: "var(--text-muted)" }} />} message="Aucune demande d'autorisation d'absence trouvée." />
          )}

          {!loadingAuto && !errorAuto && demandesFiltrees.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code", "Demandeur", "Département", "Type d'absence", "Date début", "Date fin", "Jours", "Statut", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--bg-border)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demandesFiltrees.map((d, i) => {
                    const cfg   = STATUT_DEMANDE_ABSENCE_CONFIG[d.statut]
                    const label = labelBoutonTraiter(d)
                    return (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(13,26,16,0.3)" }}>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "#f0a500" }}>
                            {d.codeDemande || "—"}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                            {d.nomDemandeur || d.demandeur.split("@")[0]}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                            {d.departement || "—"}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                            {d.typeDemande === "EVENEMENT_FAMILIAL" && d.evenementFamilial
                              ? LABEL_EVENEMENT_FAMILIAL[d.evenementFamilial]
                              : LABEL_TYPE_DEMANDE_ABSENCE[d.typeDemande]}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{formatDate(d.dateDebut)}</span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{formatDate(d.dateFin)}</span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{d.nbJoursDemandes}</span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ fontSize: 11, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-body)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          {label && (
                            <button
                              onClick={() => { setDemandeActif(d); setCommentaireDecision("") }}
                              style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600, color: "#f0a500", background: "rgba(240,165,0,0.10)", border: "1px solid rgba(240,165,0,0.30)", whiteSpace: "nowrap" }}
                            >
                              {label}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════
          SECTION — SIGNALEMENTS (Directrice + Chef Dept. uniquement)
          ════════════════════════════════════ */}
      {ongletPrincipal === "signalements" && peutVoirSignalements && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total",          value: absences.length,                                                color: "var(--text-primary)" },
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

          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, padding: 4 }}>
              {([
                { id: "toutes",         label: "Toutes" },
                { id: "en-attente",     label: "En attente" },
                { id: "justifiees",     label: "Justifiées" },
                { id: "non-justifiees", label: "Non justifiées" },
              ] as { id: OngletSignal; label: string }[]).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOngletSignal(o.id)}
                  style={{ all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, background: ongletSignal === o.id ? "var(--bg-border)" : "transparent", color: ongletSignal === o.id ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 10, flex: 1, minWidth: 0 }}>
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Rechercher par employé, type…"
                value={rechercheSignal}
                onChange={(e) => setRechercheSignal(e.target.value)}
                style={{ all: "unset", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {loadingSignal && <LoadingRow />}
          {errorSignal   && <ErrorRow message="Impossible de charger les signalements." />}

          {!loadingSignal && !errorSignal && absencesFiltrees.length === 0 && (
            <EmptyState icon={<UserX size={28} style={{ color: "var(--text-muted)" }} />} message="Aucun signalement trouvé." />
          )}

          {!loadingSignal && !errorSignal && absencesFiltrees.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {absencesFiltrees.map((absence) => {
                const cfg       = STATUT_ABSENCE_CONFIG[absence.statut]
                const actionnable = peutGererSignal && absence.statut === "EN_ATTENTE"
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
                        <div style={{ marginTop: 10 }}>
                          <button
                            onClick={() => { setAbsenceActif(absence); setCommentaireSignal("") }}
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
        </>
      )}

      {/* ════════════════════════════════════
          MODALS
          ════════════════════════════════════ */}

      {/* Formulaire demande d'autorisation */}
      {formulaireOuvert && (
        <FormulaireDemandeAbsence
          user={user ?? null}
          restoreDraft={restoreDraft}
          onClose={() => {
            setFormulaire(false)
            setRestoreDraft(false)
            setTimeout(() => {
              const draft = email ? loadDraftAbsence(email) : null
              setDraftSavedAt(draft ? draft.savedAt : null)
            }, 300)
          }}
        />
      )}

      {/* ── Modal décision — Chef Dept. OU Directrice ── */}
      {demandeActif && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !enCoursAuto) { setDemandeActif(null); setCommentaireDecision("") } }}
        >
          <div style={{ width: "100%", maxWidth: 540, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            {/* En-tête modal */}
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {peutValiderChef ? "Validation Chef de département" : "Décision Direction Générale"} — {demandeActif.codeDemande}
                </h2>
                {peutApprouverDG && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    Vous avez le dernier mot quelle que soit la position du chef de département.
                  </p>
                )}
              </div>
              <button onClick={() => { setDemandeActif(null); setCommentaireDecision("") }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Bandeau "Validé par le Chef" — visible pour la DG si statut VALIDE_CHEF */}
              {peutApprouverDG && demandeActif.statut === "VALIDE_CHEF" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.30)", borderRadius: 10 }}>
                  <ShieldCheck size={16} style={{ color: "#f0a500", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#f0a500", fontFamily: "var(--font-display)" }}>
                      Validé par le Chef de département
                      {demandeActif.valideParChef ? ` — ${demandeActif.valideParChef}` : ""}
                    </p>
                    {demandeActif.commentaireChef && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {demandeActif.commentaireChef}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Récap de la demande */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 10 }}>
                {[
                  { label: "Demandeur",      value: demandeActif.nomDemandeur || demandeActif.demandeur.split("@")[0] },
                  { label: "Département",    value: demandeActif.departement  || "—" },
                  { label: "Type",           value: LABEL_TYPE_DEMANDE_ABSENCE[demandeActif.typeDemande] },
                  { label: "Période",        value: `${formatDate(demandeActif.dateDebut)} → ${formatDate(demandeActif.dateFin)}` },
                  { label: "Jours demandés", value: `${demandeActif.nbJoursDemandes} jour${demandeActif.nbJoursDemandes > 1 ? "s" : ""}` },
                  ...(demandeActif.nbJoursAutorises != null
                    ? [{ label: "Jours autorisés", value: `${demandeActif.nbJoursAutorises} jour${demandeActif.nbJoursAutorises > 1 ? "s" : ""}` }]
                    : []
                  ),
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>

              {demandeActif.motifAbsence && (
                <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Motif</p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{demandeActif.motifAbsence}</p>
                </div>
              )}

              {/* Commentaire */}
              <div>
                <label style={labelStyle}>Commentaire (optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Justification ou précision…"
                  value={commentaireDecision}
                  onChange={(e) => setCommentaireDecision(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Boutons d'action selon le rôle */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setDemandeActif(null); setCommentaireDecision("") }}
                  style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
                >
                  Annuler
                </button>

                {/* Boutons Chef de département */}
                {peutValiderChef && (
                  <>
                    <button
                      onClick={() => handleDecision("REJETE_CHEF")}
                      disabled={enCoursAuto}
                      style={{ all: "unset", cursor: enCoursAuto ? "default" : "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", opacity: enCoursAuto ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <X size={14} />
                      Rejeter
                    </button>
                    <button
                      onClick={() => handleDecision("VALIDE_CHEF")}
                      disabled={enCoursAuto}
                      style={{ all: "unset", cursor: enCoursAuto ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#f0a500,#ffc235)", display: "flex", alignItems: "center", gap: 6, opacity: enCoursAuto ? 0.6 : 1 }}
                    >
                      {enCoursAuto ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                      Valider
                    </button>
                  </>
                )}

                {/* Boutons Directrice */}
                {peutApprouverDG && (
                  <>
                    <button
                      onClick={() => handleDecision("REFUSE_DG")}
                      disabled={enCoursAuto}
                      style={{ all: "unset", cursor: enCoursAuto ? "default" : "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", opacity: enCoursAuto ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <X size={14} />
                      Refuser
                    </button>
                    <button
                      onClick={() => handleDecision("APPROUVE_DG")}
                      disabled={enCoursAuto}
                      style={{ all: "unset", cursor: enCoursAuto ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6, opacity: enCoursAuto ? 0.6 : 1 }}
                    >
                      {enCoursAuto ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                      Approuver
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal traitement signalement absence */}
      {absenceActif && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAbsenceActif(null); setCommentaireSignal("") } }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Traiter l'absence</h2>
              <button onClick={() => { setAbsenceActif(null); setCommentaireSignal("") }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12 }}>
                {[
                  { label: "Employé", value: absenceActif.employe.split("@")[0] },
                  { label: "Type",    value: LABEL_TYPE_ABSENCE[absenceActif.typeAbsence] },
                  { label: "Date",    value: formatDate(absenceActif.dateAbsence) },
                  { label: "Durée",   value: `${absenceActif.duree} jour(s)` },
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
                <textarea rows={2} placeholder="Précisez si nécessaire…" value={commentaireSignal} onChange={(e) => setCommentaireSignal(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setAbsenceActif(null); setCommentaireSignal("") }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button onClick={() => handleStatutSignal(absenceActif.id, "NON_JUSTIFIEE")} disabled={enCoursSignal} style={{ all: "unset", cursor: enCoursSignal ? "default" : "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", opacity: enCoursSignal ? 0.6 : 1 }}>
                  Non justifiée
                </button>
                <button onClick={() => handleStatutSignal(absenceActif.id, "JUSTIFIEE")} disabled={enCoursSignal} style={{ all: "unset", cursor: enCoursSignal ? "default" : "pointer", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6, opacity: enCoursSignal ? 0.6 : 1 }}>
                  {enCoursSignal && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  Justifiée
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire signalement */}
      {formulaireSignal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !creationSignal) setFormulaireSignal(false) }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16 }}>
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Signaler une absence</h2>
              <button onClick={() => { if (!creationSignal) setFormulaireSignal(false) }} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <form onSubmit={handleCreerSignal} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Type d'absence *</label>
                <select value={typeAbsence} onChange={(e) => setTypeAbsence(e.target.value as TypeAbsence)} required style={inputStyle}>
                  {(Object.entries(LABEL_TYPE_ABSENCE) as [TypeAbsence, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12 }}>
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
                <button type="button" onClick={() => setFormulaireSignal(false)} disabled={creationSignal} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  Annuler
                </button>
                <button type="submit" disabled={creationSignal} style={{ all: "unset", cursor: creationSignal ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", gap: 8, opacity: creationSignal ? 0.7 : 1 }}>
                  {creationSignal && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
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

/* ── Sous-composants utilitaires ── */

const cellStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid rgba(30,53,40,0.5)",
  verticalAlign: "middle",
}

function LoadingRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: 10 }}>
      <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 14, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement…</span>
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12 }}>
      <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontFamily: "var(--font-body)" }}>{message}</p>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--bg-elevated)", border: "1px dashed var(--bg-border)", borderRadius: 14 }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{message}</p>
    </div>
  )
}
