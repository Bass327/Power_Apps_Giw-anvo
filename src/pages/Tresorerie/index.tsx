import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Wallet, ArrowLeft, Plus, Search, X, Loader2, AlertCircle,
  Banknote, Building2, ArrowRightLeft, PieChart, BarChart2,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useDecaissements, useCreateDecaissement, useUpdateStatutDecaissement } from "@/hooks/useDecaissements"
import { useJournalCaisse, useCreateOperationCaisse } from "@/hooks/useJournalCaisse"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import type { DemandeDecaissement, OperationCaisse, StatutDecaissement, TypeDecaissement, TypeOperationCaisse } from "@/types/tresorerie"
import {
  STATUT_DECAISSEMENT_CONFIG,
  TYPE_DECAISSEMENT_CONFIG,
  TYPE_OPERATION_CAISSE_CONFIG,
  SEUIL_APPROBATION_DG,
} from "@/types/tresorerie"
import type { UserRole } from "@/types/user"
import { AccueilTransactions }   from "./components/AccueilTransactions"
import { ListeTransactions }     from "./components/ListeTransactions"
import { FormulaireTransaction } from "./components/FormulaireTransaction"
import { BudgetsMensuels }       from "./components/BudgetsMensuels"
import { DashboardTresorerie }   from "./components/DashboardTresorerie"
import { SetupTresorerie }       from "./components/SetupTresorerie"

/* ── Onglets ── */
type Onglet = "decaissements" | "caisse" | "transactions" | "budgets" | "dashboard"

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
  display: "block", fontSize: 11, color: "var(--text-secondary)",
  fontFamily: "var(--font-body)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 6,
}

/* ── Actions disponibles selon le rôle et le statut ── */
function getActions(role: UserRole, d: DemandeDecaissement): {
  label: string; statut: StatutDecaissement; style: "primary" | "danger"
}[] {
  if (hasPermission(role, "canValiderDecaissement") && d.statut === "SOUMIS") {
    return [
      { label: "Rejeter", statut: "REJETE",     style: "danger"  },
      { label: "Valider", statut: "VALIDE_RAF", style: "primary" },
    ]
  }
  if (hasPermission(role, "canApprouverDecaissement") && d.statut === "VALIDE_RAF" && d.montant > SEUIL_APPROBATION_DG) {
    return [
      { label: "Rejeter",  statut: "REJETE",  style: "danger"  },
      { label: "Approuver",statut: "APPROUVE",style: "primary" },
    ]
  }
  if (hasPermission(role, "canExecuterDecaissement")) {
    // Le RAF a validé ET soit le montant est ≤ seuil (pas besoin DG), soit la DG a approuvé
    const peutExecuter =
      (d.statut === "VALIDE_RAF" && d.montant <= SEUIL_APPROBATION_DG) ||
      d.statut === "APPROUVE"
    if (peutExecuter) {
      return [{ label: "Marquer exécuté", statut: "EXECUTE", style: "primary" }]
    }
  }
  return []
}

/* ════════════════════════════════════════════════
   Page — Trésorerie
   ════════════════════════════════════════════════ */
export default function TresoreriePage() {
  const { role, user }  = useCurrentUser()
  const email           = user?.email ?? ""
  const navigate        = useNavigate()
  const access          = role ? getModuleAccess(role, "tresorerie") : "none"

  const [onglet, setOnglet]       = useState<Onglet>("decaissements")
  const [recherche, setRecherche] = useState("")

  /* ── Onglet Transactions ── */
  const [formTransOpen, setFormTransOpen] = useState(false)
  const [sousOngletTrans, setSousOngletTrans] = useState<"accueil" | "liste">("liste")

  /* Décaissements — états modaux */
  const [decActif, setDecActif]       = useState<DemandeDecaissement | null>(null)
  const [commentaire, setCommentaire] = useState("")
  const [reference, setReference]     = useState("")
  const [actionCourante, setAction]   = useState<{ label: string; statut: StatutDecaissement; style: "primary" | "danger" } | null>(null)
  const [formDecOpen, setFormDecOpen] = useState(false)

  /* Décaissements — formulaire création */
  const [decTitre, setDecTitre]         = useState("")
  const [decMontant, setDecMontant]     = useState("")
  const [decType, setDecType]           = useState<TypeDecaissement>("VIREMENT")
  const [decBenef, setDecBenef]         = useState("")
  const [decMotif, setDecMotif]         = useState("")
  const [decEcheance, setDecEcheance]   = useState("")

  /* Journal caisse — états modaux */
  const [formCaisseOpen, setFormCaisseOpen] = useState(false)
  const [caisseType, setCaisseType]         = useState<TypeOperationCaisse>("SORTIE")
  const [caisseMontant, setCaisseMontant]   = useState("")
  const [caisseDesc, setCaisseDesc]         = useState("")
  const [caisseBenef, setCaisseBenef]       = useState("")
  const [caisseRef, setCaisseRef]           = useState("")

  /* Hooks */
  const { data: decaissements = [], isLoading: loadDec,    isError: errDec }   = useDecaissements()
  const { data: operations    = [], isLoading: loadCaisse, isError: errCaisse } = useJournalCaisse()
  const { mutate: creerDec,   isPending: creatingDec }  = useCreateDecaissement()
  const { mutate: updateDec,  isPending: updatingDec }  = useUpdateStatutDecaissement()
  const { mutate: creerOp,    isPending: creatingOp }   = useCreateOperationCaisse()

  if (access === "none") {
    return <AccessDenied message="Accès réservé au service financier (RAF, Comptable, Directrice)." />
  }

  const peutCreerCaisse = role ? hasPermission(role, "canSaisirCaisse")       : false
  const estLecture      = access === "read"

  /* ── Filtrage décaissements ── */
  const decFiltres = useMemo(() => {
    if (!recherche.trim()) return decaissements
    const q = recherche.toLowerCase()
    return decaissements.filter(
      (d) => d.titre.toLowerCase().includes(q) || d.beneficiaire.toLowerCase().includes(q),
    )
  }, [decaissements, recherche])

  /* ── Stats décaissements ── */
  const statsDecaissements = useMemo(() => [
    { label: "Total",        value: decaissements.length,                                          color: "var(--text-primary)" },
    { label: "En attente",   value: decaissements.filter((d) => d.statut === "SOUMIS").length,     color: "#60a5fa" },
    { label: "À approuver",  value: decaissements.filter((d) => d.statut === "VALIDE_RAF" && d.montant > SEUIL_APPROBATION_DG).length, color: "#a78bfa" },
    { label: "Exécutés",     value: decaissements.filter((d) => d.statut === "EXECUTE").length,    color: "#34d399" },
  ], [decaissements])

  /* ── Filtrage journal caisse par recherche ── */
  const opsFiltrees = useMemo(() => {
    if (!recherche.trim()) return operations
    const q = recherche.toLowerCase()
    return operations.filter(
      (op) =>
        op.description.toLowerCase().includes(q) ||
        (op.beneficiaire ?? "").toLowerCase().includes(q) ||
        (op.reference    ?? "").toLowerCase().includes(q),
    )
  }, [operations, recherche])

  /* ── Stats journal caisse ── */
  const statsCaisse = useMemo(() => {
    const mois = new Date().getMonth()
    const annee = new Date().getFullYear()
    const duMois = (op: OperationCaisse) => {
      const d = new Date(op.dateSaisie)
      return d.getMonth() === mois && d.getFullYear() === annee
    }
    const entrees = operations
      .filter((o) => (o.typeOperation === "ENTREE" || o.typeOperation === "APPROVISIONNEMENT") && duMois(o))
      .reduce((s, o) => s + o.montant, 0)
    const sorties = operations
      .filter((o) => o.typeOperation === "SORTIE" && duMois(o))
      .reduce((s, o) => s + o.montant, 0)
    return [
      { label: "Opérations (mois)", value: operations.filter(duMois).length,    color: "var(--text-primary)" },
      { label: "Entrées (mois)",    value: formatFCFA(entrees),              color: "#22c55e",   raw: true },
      { label: "Sorties (mois)",    value: formatFCFA(sorties),              color: "#ef4444",   raw: true },
      { label: "Total opérations",  value: operations.length,                    color: "var(--text-secondary)" },
    ]
  }, [operations])

  /* ── Soumettre décaissement ── */
  function handleCreerDecaissement(e: React.FormEvent) {
    e.preventDefault()
    creerDec(
      {
        data: {
          titre:            decTitre.trim(),
          montant:          parseFloat(decMontant.replace(/\s/g, "")) || 0,
          typeDecaissement: decType,
          beneficiaire:     decBenef.trim(),
          motif:            decMotif.trim(),
          demandeur:        email,
          statut:           "SOUMIS",
          dateEcheance:     decEcheance || undefined,
        },
        soumettre: true,
      },
      {
        onSuccess: () => {
          setDecTitre(""); setDecMontant(""); setDecBenef("")
          setDecMotif(""); setDecEcheance(""); setDecType("VIREMENT")
          setFormDecOpen(false)
        },
      },
    )
  }

  /* ── Valider / approuver / exécuter un décaissement ── */
  function handleAction() {
    if (!decActif || !actionCourante) return
    updateDec(
      {
        id:             decActif.id,
        statut:         actionCourante.statut,
        commentaire:    commentaire.trim() || undefined,
        reference:      reference.trim()   || undefined,
        demandeurEmail: decActif.demandeur,
        montant:        decActif.montant,
        titre:          decActif.titre,
      },
      {
        onSuccess: () => {
          setDecActif(null); setAction(null)
          setCommentaire(""); setReference("")
        },
      },
    )
  }

  /* ── Saisir opération caisse ── */
  function handleCreerOperation(e: React.FormEvent) {
    e.preventDefault()
    creerOp(
      {
        typeOperation: caisseType,
        montant:       parseFloat(caisseMontant.replace(/\s/g, "")) || 0,
        description:   caisseDesc.trim(),
        saiseur:       email,
        beneficiaire:  caisseBenef.trim() || undefined,
        reference:     caisseRef.trim()   || undefined,
      },
      {
        onSuccess: () => {
          setCaisseType("SORTIE"); setCaisseMontant(""); setCaisseDesc("")
          setCaisseBenef(""); setCaisseRef(""); setFormCaisseOpen(false)
        },
      },
    )
  }

  /* ── Rendu ── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* En-tête */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Tableau de bord
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.20)" }}>
              <Wallet className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Trésorerie</h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Décaissements, caisse et opérations financières</p>
            </div>
          </div>
          {!estLecture && onglet === "decaissements" && (
            <button
              onClick={() => setFormDecOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))", color: "var(--text-inverse)", boxShadow: "0 0 16px var(--gold-glow)" }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
            >
              <Plus className="w-4 h-4" />
              Nouveau décaissement
            </button>
          )}
          {!estLecture && onglet === "caisse" && (
            <button
              onClick={() => setFormCaisseOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))", color: "var(--text-inverse)", boxShadow: "0 0 16px var(--gold-glow)" }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
            >
              <Plus className="w-4 h-4" />
              Nouvelle opération de caisse
            </button>
          )}
          {!estLecture && onglet === "transactions" && (
            <button
              onClick={() => setFormTransOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))", color: "var(--text-inverse)", boxShadow: "0 0 16px var(--gold-glow)" }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
            >
              <Plus className="w-4 h-4" />
              Nouvelle transaction
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {(onglet === "decaissements" ? statsDecaissements : statsCaisse).map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
              <p className="text-xs font-display font-semibold uppercase tracking-widest truncate" style={{ color: "var(--text-muted)" }}>{label}</p>
              <p className="font-display font-bold text-xl mt-1 truncate" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div className="px-6 flex items-center gap-1 pt-4" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        {([
          { id: "decaissements", label: "Décaissements",     icon: <Building2      className="w-4 h-4" /> },
          { id: "caisse",        label: "Journal de caisse", icon: <Banknote       className="w-4 h-4" /> },
          { id: "transactions",  label: "Transactions",      icon: <ArrowRightLeft className="w-4 h-4" /> },
          { id: "budgets",       label: "Budgets",           icon: <PieChart       className="w-4 h-4" /> },
          { id: "dashboard",     label: "Dashboard",         icon: <BarChart2      className="w-4 h-4" /> },
        ] as { id: Onglet; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => { setOnglet(id); setRecherche("") }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-display font-medium transition-all"
            style={{
              color:        onglet === id ? "var(--text-primary)" : "var(--text-muted)",
              background:   onglet === id ? "var(--bg-surface)"  : "transparent",
              borderBottom: onglet === id ? "2px solid var(--gold-warm)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Description contextuelle de l'onglet */}
      {(() => {
        const descriptions: Record<Onglet, string> = {
          decaissements: "Demandes de décaissement — workflow de validation RAF / Directrice Générale avant exécution",
          caisse:        "Mouvements de caisse physique — entrées et sorties d'espèces enregistrées au jour le jour",
          transactions:  "Transactions analytiques — suivi Cash In / Cash Out par projet, catégorie et type de dépense",
          budgets:       "Budget vs Réel — comparaison des montants budgétés vs dépenses réelles par mois",
          dashboard:     "Vue consolidée — KPIs annuels, synthèse mensuelle, tendances et alertes automatiques",
        }
        return (
          <div className="px-6 pt-3 pb-1">
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {descriptions[onglet]}
            </p>
          </div>
        )
      })()}

      {/* Filtre recherche — masqué sur transactions (filtres intégrés) et dashboard/budgets */}
      {(onglet === "decaissements" || onglet === "caisse") && (
        <div className="px-6 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", maxWidth: 480 }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={onglet === "decaissements" ? "Rechercher par objet, bénéficiaire…" : "Rechercher par description, bénéficiaire, référence…"}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: 14, color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}
            />
            {recherche && (
              <button onClick={() => setRecherche("")} style={{ all: "unset", cursor: "pointer", display: "flex" }}>
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ ONGLET DÉCAISSEMENTS ══════════ */}
      {onglet === "decaissements" && (
        <div className="px-6 pb-6">
          {loadDec && <LoadingRow />}
          {errDec  && <ErrorRow />}
          {!loadDec && !errDec && decFiltres.length === 0 && (
            <EmptyState
              icon={<Building2 className="w-8 h-8" style={{ color: "var(--text-muted)" }} />}
              message="Aucune demande de décaissement"
              cta={undefined}
            />
          )}
          {!loadDec && !errDec && decFiltres.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    {["Objet", "Bénéficiaire", "Montant", "Type", "Échéance", "Statut", ""].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decFiltres.map((d, i) => {
                    const cfg     = STATUT_DECAISSEMENT_CONFIG[d.statut]
                    const actions = role ? getActions(role, d) : []
                    return (
                      <tr
                        key={d.id}
                        style={{
                          background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                          borderBottom: "1px solid var(--bg-border)",
                          transition:   "background 150ms",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                      >
                        <td className="px-4 py-3 overflow-hidden">
                          <p className="text-sm font-display font-medium truncate" style={{ color: "var(--text-primary)" }}>{d.titre}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{d.demandeur.split("@")[0]}</p>
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{d.beneficiaire || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-display font-semibold whitespace-nowrap" style={{ color: d.montant > SEUIL_APPROBATION_DG ? "#f0a500" : "var(--text-primary)" }}>
                            {formatFCFA(d.montant)}
                          </p>
                          {d.montant > SEUIL_APPROBATION_DG && (
                            <p className="text-xs" style={{ color: "#f59e0b" }}>Approbation DG</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-display font-medium px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}>
                            {TYPE_DECAISSEMENT_CONFIG[d.typeDecaissement]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                            {d.dateEcheance ? formatDateFr(d.dateEcheance) : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-display font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {actions.length > 0 && (
                            <div className="flex gap-2">
                              {actions.map((action) => (
                                <button
                                  key={action.statut}
                                  onClick={() => { setDecActif(d); setAction(action); setCommentaire(""); setReference("") }}
                                  className="text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-all"
                                  style={
                                    action.style === "primary"
                                      ? { background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", color: "var(--text-inverse)" }
                                      : { background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }
                                  }
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3" style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--bg-border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{decFiltres.length} demande{decFiltres.length > 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ONGLET JOURNAL CAISSE ══════════ */}
      {onglet === "caisse" && (
        <div className="px-6 pb-6">
          {loadCaisse && <LoadingRow />}
          {errCaisse  && <ErrorRow />}
          {!loadCaisse && !errCaisse && operations.length === 0 && (
            <EmptyState
              icon={<Banknote className="w-8 h-8" style={{ color: "var(--text-muted)" }} />}
              message="Aucune opération de caisse enregistrée"
              cta={peutCreerCaisse ? { label: "Nouvelle opération de caisse", onClick: () => setFormCaisseOpen(true) } : undefined}
            />
          )}
          {!loadCaisse && !errCaisse && operations.length > 0 && opsFiltrees.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                Aucune opération ne correspond à la recherche
              </p>
            </div>
          )}
          {!loadCaisse && !errCaisse && opsFiltrees.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    {["Date", "Type", "Description", "Bénéficiaire / Source", "Montant", "Référence"].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {opsFiltrees.map((op, i) => {
                    const cfg = TYPE_OPERATION_CAISSE_CONFIG[op.typeOperation]
                    return (
                      <tr
                        key={op.id}
                        style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)", transition: "background 120ms" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDateFr(op.dateSaisie)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-display font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${cfg.couleur}18`, color: cfg.couleur, border: `1px solid ${cfg.couleur}44` }}>
                            {cfg.signe} {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <p className="text-sm font-display font-medium truncate" style={{ color: "var(--text-primary)" }}>{op.description}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{op.saiseur.split("@")[0]}</p>
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{op.beneficiaire || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-display font-bold whitespace-nowrap" style={{ color: cfg.couleur }}>
                            {cfg.signe}{formatFCFA(op.montant)}
                          </p>
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{op.reference || "—"}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 flex items-center gap-4" style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--bg-border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {opsFiltrees.length} opération{opsFiltrees.length > 1 ? "s" : ""}
                  {recherche.trim() && ` sur ${operations.length} au total`}
                </p>
                {(() => {
                  const entrees = opsFiltrees.filter((o) => o.typeOperation === "ENTREE" || o.typeOperation === "APPROVISIONNEMENT").reduce((s, o) => s + o.montant, 0)
                  const sorties = opsFiltrees.filter((o) => o.typeOperation === "SORTIE").reduce((s, o) => s + o.montant, 0)
                  return (
                    <div className="flex gap-4 ml-auto">
                      <span className="text-xs font-display font-semibold">
                        <span style={{ color: "var(--text-muted)" }}>Entrées : </span>
                        <span style={{ color: "#22c55e" }}>+{formatFCFA(entrees)}</span>
                      </span>
                      <span className="text-xs font-display font-semibold">
                        <span style={{ color: "var(--text-muted)" }}>Sorties : </span>
                        <span style={{ color: "#ef4444" }}>-{formatFCFA(sorties)}</span>
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ONGLET TRANSACTIONS ══════════ */}
      {onglet === "transactions" && (
        <div className="px-6 pb-6">
          <SetupTresorerie />

          {/* Bascule résumé / liste */}
          <div className="flex items-center gap-2 mb-4">
            {(["liste", "accueil"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSousOngletTrans(v)}
                className="px-4 py-1.5 rounded-lg text-xs font-display font-semibold transition-all"
                style={{
                  background:   sousOngletTrans === v ? "var(--bg-elevated)" : "transparent",
                  color:        sousOngletTrans === v ? "var(--text-primary)" : "var(--text-muted)",
                  border:       sousOngletTrans === v ? "1px solid var(--bg-border)" : "1px solid transparent",
                }}
              >
                {v === "liste" ? "Liste & filtres" : "Résumé du mois"}
              </button>
            ))}
          </div>

          {sousOngletTrans === "liste" ? (
            <ListeTransactions />
          ) : (
            <AccueilTransactions
              peutCreer={!estLecture}
              onNouvelleTransaction={() => setFormTransOpen(true)}
              onVoirTout={() => setSousOngletTrans("liste")}
              onVoirBudgets={() => { setOnglet("budgets") }}
              onVoirDashboard={() => { setOnglet("dashboard") }}
            />
          )}
        </div>
      )}

      {/* ══════════ ONGLET BUDGETS ══════════ */}
      {onglet === "budgets" && (
        <div className="px-6 pb-6">
          <BudgetsMensuels peutCreer={!estLecture} />
        </div>
      )}

      {/* ══════════ ONGLET DASHBOARD ══════════ */}
      {onglet === "dashboard" && (
        <div className="px-6 pb-6">
          <DashboardTresorerie />
        </div>
      )}

      {/* ── Modal formulaire transaction ── */}
      {formTransOpen && user?.email && (
        <FormulaireTransaction
          saisiPar={user.email}
          onClose={() => setFormTransOpen(false)}
        />
      )}

      {/* ── Modal action décaissement (validation / approbation / exécution) ── */}
      {decActif && actionCourante && (
        <Modal title={actionCourante.label} onClose={() => { setDecActif(null); setAction(null); setCommentaire(""); setReference("") }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Récap */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Objet",        value: decActif.titre },
                { label: "Montant",      value: formatFCFA(decActif.montant) },
                { label: "Bénéficiaire", value: decActif.beneficiaire || "—" },
                { label: "Type",         value: TYPE_DECAISSEMENT_CONFIG[decActif.typeDecaissement]?.label },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{value}</p>
                </div>
              ))}
            </div>
            {decActif.motif && (
              <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Motif</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{decActif.motif}</p>
              </div>
            )}
            {/* Référence (saisie lors de l'exécution) */}
            {actionCourante.statut === "EXECUTE" && (
              <div>
                <label style={labelStyle}>Référence (n° chèque / virement)</label>
                <input type="text" placeholder="Ex : CHQ-2026-001" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
              </div>
            )}
            {/* Commentaire */}
            <div>
              <label style={labelStyle}>Commentaire {actionCourante.statut !== "EXECUTE" ? "(optionnel)" : ""}</label>
              <textarea rows={2} placeholder="Ajouter un commentaire…" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setDecActif(null); setAction(null) }} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>Annuler</button>
              <button
                onClick={handleAction}
                disabled={updatingDec}
                style={{
                  all: "unset",
                  cursor: updatingDec ? "default" : "pointer",
                  padding: "10px 22px", borderRadius: 8, fontSize: 13,
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 8,
                  opacity: updatingDec ? 0.7 : 1,
                  ...(actionCourante.style === "primary"
                    ? { background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", color: "var(--text-inverse)" }
                    : { background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }),
                }}
              >
                {updatingDec && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal formulaire décaissement ── */}
      {formDecOpen && (
        <Modal title="Nouvelle demande de décaissement" onClose={() => !creatingDec && setFormDecOpen(false)}>
          <form onSubmit={handleCreerDecaissement} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Objet *</label>
              <input type="text" required placeholder="Ex : Achat matériel informatique" value={decTitre} onChange={(e) => setDecTitre(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Montant (FCFA) *</label>
                <input type="number" required min="1" placeholder="0" value={decMontant} onChange={(e) => setDecMontant(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mode de paiement *</label>
                <select value={decType} onChange={(e) => setDecType(e.target.value as TypeDecaissement)} required style={inputStyle}>
                  {(Object.entries(TYPE_DECAISSEMENT_CONFIG) as [TypeDecaissement, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {decMontant && parseFloat(decMontant) > SEUIL_APPROBATION_DG && (
              <div style={{ padding: "10px 14px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#a78bfa", fontFamily: "var(--font-body)" }}>
                  ⚠️ Montant supérieur à {formatFCFA(SEUIL_APPROBATION_DG)} — l'approbation de la Directrice Générale sera requise.
                </p>
              </div>
            )}
            <div>
              <label style={labelStyle}>Bénéficiaire *</label>
              <input type="text" required placeholder="Nom du fournisseur ou de la personne" value={decBenef} onChange={(e) => setDecBenef(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Motif *</label>
              <textarea rows={2} required placeholder="Justification de la dépense…" value={decMotif} onChange={(e) => setDecMotif(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div>
              <label style={labelStyle}>Date d'échéance souhaitée</label>
              <input type="date" value={decEcheance} onChange={(e) => setDecEcheance(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setFormDecOpen(false)} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>Annuler</button>
              <button type="submit" disabled={creatingDec} style={{ all: "unset", cursor: creatingDec ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", display: "flex", alignItems: "center", gap: 8, opacity: creatingDec ? 0.7 : 1 }}>
                {creatingDec && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Soumettre
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal opération caisse ── */}
      {formCaisseOpen && (
        <Modal title="Nouvelle opération de caisse" onClose={() => !creatingOp && setFormCaisseOpen(false)}>
          <form onSubmit={handleCreerOperation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Type d'opération *</label>
              <select value={caisseType} onChange={(e) => setCaisseType(e.target.value as TypeOperationCaisse)} required style={inputStyle}>
                {(Object.entries(TYPE_OPERATION_CAISSE_CONFIG) as [TypeOperationCaisse, { label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Montant (FCFA) *</label>
                <input type="number" required min="1" placeholder="0" value={caisseMontant} onChange={(e) => setCaisseMontant(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bénéficiaire / Source</label>
                <input type="text" placeholder="Nom ou service" value={caisseBenef} onChange={(e) => setCaisseBenef(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea rows={2} required placeholder="Objet de l'opération…" value={caisseDesc} onChange={(e) => setCaisseDesc(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div>
              <label style={labelStyle}>Référence (pièce justificative)</label>
              <input type="text" placeholder="N° reçu, facture, bon…" value={caisseRef} onChange={(e) => setCaisseRef(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setFormCaisseOpen(false)} style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>Annuler</button>
              <button type="submit" disabled={creatingOp} style={{ all: "unset", cursor: creatingOp ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", display: "flex", alignItems: "center", gap: 8, opacity: creatingOp ? 0.7 : 1 }}>
                {creatingOp && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════
   Sous-composants locaux
   ════════════════════════════════════════════════ */

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-16 gap-3">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>Chargement…</span>
    </div>
  )
}

function ErrorRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)" }}>
      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
      <p className="text-sm" style={{ color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>Impossible de charger les données. Vérifiez votre connexion.</p>
    </div>
  )
}

function EmptyState({ icon, message, cta }: { icon: React.ReactNode; message: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
        {icon}
      </div>
      <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>{message}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="text-sm font-display font-semibold px-4 py-2 rounded-lg"
          style={{ background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", color: "var(--text-inverse)" }}
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{title}</h2>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
        <div style={{ padding: "20px 28px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
