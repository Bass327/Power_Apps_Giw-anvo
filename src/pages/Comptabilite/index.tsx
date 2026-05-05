import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  BookOpen, Loader2, AlertCircle, TrendingUp, TrendingDown, Wallet,
  CheckCircle2, FileText, Calendar, Receipt, BarChart4, Plus,
  ArrowRightLeft, AlertTriangle, X, ExternalLink, ArrowLeft,
} from "lucide-react"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useJournalCaisse, useCreateOperationCaisse } from "@/hooks/useJournalCaisse"
import { useDecaissements } from "@/hooks/useDecaissements"
import { useLignesBudgetaires } from "@/hooks/useSuiviBudgetaire"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"
import type { OperationCaisse, TypeOperationCaisse } from "@/types/tresorerie"
import type { DemandeAchat } from "@/types/DemandeAchat"

/* ════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════ */

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA"
}

function formatFCFAShort(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return (Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")) + "\u00A0M FCFA"
  }
  if (n >= 1_000) {
    const v = n / 1_000
    return (Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")) + "\u00A0K FCFA"
  }
  return n + "\u00A0FCFA"
}

function formatDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function mois(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/* Labels mois */
const LABEL_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

const LABEL_TYPE_OP: Record<TypeOperationCaisse, string> = {
  ENTREE:            "Entrée",
  SORTIE:            "Sortie",
  APPROVISIONNEMENT: "Approvisionnement",
  INVENTAIRE:        "Inventaire",
}

/* ════════════════════════════════════════════════
   Carte stat (réutilisable)
   ════════════════════════════════════════════════ */
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
    >
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          {label}
        </p>
        <p className="text-xl font-extrabold font-display tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Modal
   ════════════════════════════════════════════════ */
function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--bg-border)" }}>
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Formulaire saisie écriture comptable (opération caisse)
   ════════════════════════════════════════════════ */
function FormulaireEcriture({
  userEmail, onClose,
}: {
  userEmail: string
  onClose:   () => void
}) {
  const [typeOp,       setTypeOp]        = useState<TypeOperationCaisse>("SORTIE")
  const [montant,      setMontant]       = useState("")
  const [description,  setDescription]   = useState("")
  const [beneficiaire, setBeneficiaire]  = useState("")
  const [reference,    setReference]     = useState("")
  const { mutate, isPending } = useCreateOperationCaisse()

  function handleSubmit() {
    if (!montant || !description) return
    mutate({
      typeOperation: typeOp,
      montant:       Number(montant),
      description,
      saiseur:       userEmail,
      beneficiaire:  beneficiaire || undefined,
      reference:     reference || undefined,
    }, { onSuccess: onClose })
  }

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none"
  const inputStyle = { background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }
  const labelCls = "block text-xs mb-1.5 font-medium"
  const labelStyle = { color: "var(--text-secondary)", fontFamily: "var(--font-body)" }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls} style={labelStyle}>Type d'opération *</label>
        <select className={inputCls} style={inputStyle} value={typeOp}
          onChange={e => setTypeOp(e.target.value as TypeOperationCaisse)}>
          {(Object.keys(LABEL_TYPE_OP) as TypeOperationCaisse[]).map(k => (
            <option key={k} value={k}>{LABEL_TYPE_OP[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Montant (FCFA) *</label>
        <input type="number" className={inputCls} style={inputStyle} value={montant}
          onChange={e => setMontant(e.target.value)} min={0} placeholder="0" />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Description / Libellé *</label>
        <input className={inputCls} style={inputStyle} value={description}
          onChange={e => setDescription(e.target.value)} placeholder="Nature de l'opération..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Bénéficiaire</label>
          <input className={inputCls} style={inputStyle} value={beneficiaire}
            onChange={e => setBeneficiaire(e.target.value)} placeholder="Nom" />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Référence pièce</label>
          <input className={inputCls} style={inputStyle} value={reference}
            onChange={e => setReference(e.target.value)} placeholder="Ex: CAISSE-2026-001" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} disabled={isPending}
          className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}>
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={isPending || !montant || !description}
          className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }}>
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Mouvement unifié (journal caisse + décaissements exécutés)
   ════════════════════════════════════════════════ */
interface MouvementComptable {
  id:          string
  date:        string
  source:      "CAISSE" | "DECAISSEMENT"
  typeLabel:   string
  description: string
  beneficiaire?: string
  reference?:  string
  entree:      number   // 0 si sortie
  sortie:      number   // 0 si entrée
}

/* ════════════════════════════════════════════════
   Page principale
   ════════════════════════════════════════════════ */
type TabId = "dashboard" | "journal" | "justificatifs" | "synthese"

export default function ComptabilitePage() {
  const { data: currentUser, role } = useCurrentUser()
  const navigate                    = useNavigate()
  const access = role ? getModuleAccess(role, "comptabilite") : "none"

  /* Données */
  const opsQuery     = useJournalCaisse()
  const decQuery     = useDecaissements()
  const budQuery     = useLignesBudgetaires()
  const achatsQuery  = useDemandesAchats()

  const [activeTab,   setActiveTab]   = useState<TabId>("dashboard")
  const [filterMois,  setFilterMois]  = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  )
  const [showForm, setShowForm] = useState(false)

  /* ── Accès refusé ── */
  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.comptabilite} />
  }

  /* ── Chargement ── */
  const isLoading = opsQuery.isLoading || decQuery.isLoading || achatsQuery.isLoading
  const isError   = opsQuery.isError || decQuery.isError || achatsQuery.isError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--green-vivid)" }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Impossible de charger les données comptables.
        </p>
      </div>
    )
  }

  const operations    = opsQuery.data   ?? []
  const decaissements = decQuery.data   ?? []
  const lignesBudget  = budQuery.data   ?? []
  const demandes      = achatsQuery.data ?? []

  /* ── Journal unifié ── */
  const mouvements = useMemoMouvements(operations, decaissements)
  const mouvementsDuMois = mouvements.filter(m => mois(m.date) === filterMois)

  /* ── Stats mensuelles ── */
  const stats = useMemo(() => {
    const totalEntrees = mouvementsDuMois.reduce((s, m) => s + m.entree, 0)
    const totalSorties = mouvementsDuMois.reduce((s, m) => s + m.sortie, 0)
    const solde        = totalEntrees - totalSorties
    const nbOps        = mouvementsDuMois.length
    return { totalEntrees, totalSorties, solde, nbOps }
  }, [mouvementsDuMois])

  /* ── Pièces justificatives ── */
  const pieces = useMemo(() =>
    demandes.filter((d: DemandeAchat) =>
      d.typeDemande === "PIECE_CAISSE" &&
      (d.statut === "APPROUVE" || d.statut === "EN_PAIEMENT" || d.statut === "SOLDE"),
    ),
    [demandes],
  )
  const piecesDuMois = pieces.filter(p => mois(p.dateDemande) === filterMois)

  /* ── Mois disponibles pour le filtre ── */
  const moisDispos = useMemo(() => {
    const set = new Set<string>()
    mouvements.forEach(m => m.date && set.add(mois(m.date)))
    pieces.forEach(p => p.dateDemande && set.add(mois(p.dateDemande)))
    return [...set].sort().reverse()
  }, [mouvements, pieces])

  /* ── Synthèse annuelle par mois (12 mois) ── */
  const anneeCourante = new Date().getFullYear()
  const syntheseMensuelle = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = `${anneeCourante}-${String(i + 1).padStart(2, "0")}`
      const mouvM = mouvements.filter(x => mois(x.date) === m)
      const entrees = mouvM.reduce((s, x) => s + x.entree, 0)
      const sorties = mouvM.reduce((s, x) => s + x.sortie, 0)
      return { mois: i, label: LABEL_MOIS[i], entrees, sorties, solde: entrees - sorties }
    })
  }, [mouvements, anneeCourante])

  const totalAnnuel = syntheseMensuelle.reduce(
    (acc, m) => ({
      entrees: acc.entrees + m.entrees,
      sorties: acc.sorties + m.sorties,
    }),
    { entrees: 0, sorties: 0 },
  )

  /* ── Budget annuel / alerte ── */
  const budgetAnnuel = lignesBudget
    .filter(l => l.annee === anneeCourante && l.statut === "APPROUVE")
    .reduce((s, l) => s + l.montantRevise, 0)

  const maxMois = Math.max(...syntheseMensuelle.map(m => Math.max(m.entrees, m.sorties)), 1)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Retour tableau de bord ── */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Tableau de bord
      </button>

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.2)" }}>
            <BookOpen size={28} style={{ color: "#fb923c" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Module Comptabilité
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Journaux · Tableau de bord · Pièces justificatives · Arrêté des comptes
            </p>
          </div>
        </div>
        {access === "full" && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }}
          >
            <Plus size={16} />
            Nouvelle écriture
          </button>
        )}
      </div>

      {/* ── Filtre mois ── */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
      >
        <Calendar size={16} style={{ color: "var(--text-muted)" }} />
        <select
          value={filterMois}
          onChange={e => setFilterMois(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
        >
          {moisDispos.length === 0 && <option value={filterMois}>{filterMois}</option>}
          {moisDispos.map(m => {
            const [a, mo] = m.split("-")
            return <option key={m} value={m}>{LABEL_MOIS[Number(mo) - 1]} {a}</option>
          })}
        </select>
        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          {mouvementsDuMois.length} mouvement(s) · {piecesDuMois.length} pièce(s) justificative(s)
        </span>
      </div>

      {/* ── Stats mensuelles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Entrées du mois" value={formatFCFAShort(stats.totalEntrees)}
          sub={`${mouvementsDuMois.filter(m => m.entree > 0).length} op.`}
          icon={TrendingUp} color="#22c55e" />
        <StatCard label="Sorties du mois" value={formatFCFAShort(stats.totalSorties)}
          sub={`${mouvementsDuMois.filter(m => m.sortie > 0).length} op.`}
          icon={TrendingDown} color="#ef4444" />
        <StatCard label="Solde net" value={formatFCFAShort(stats.solde)}
          sub={stats.solde >= 0 ? "Excédent" : "Déficit"}
          icon={Wallet} color={stats.solde >= 0 ? "#60a5fa" : "#ef4444"} />
        <StatCard label="Opérations" value={String(stats.nbOps)}
          sub="Total ce mois" icon={ArrowRightLeft} color="#f0a500" />
      </div>

      {/* ── Onglets ── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        {([
          ["dashboard",    "Tableau de bord", BarChart4],
          ["journal",      "Journal comptable", FileText],
          ["justificatifs","Pièces justificatives", Receipt],
          ["synthese",     "Synthèse annuelle", Calendar],
        ] as [TabId, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium transition-all"
            style={activeTab === id
              ? { background: "var(--bg-elevated)", color: "var(--text-primary)", boxShadow: "0 0 12px var(--green-glow)" }
              : { color: "var(--text-muted)" }
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════
          TAB : Tableau de bord
          ══════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          {/* Répartition des mouvements du mois */}
          <div className="rounded-2xl p-6" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
            <h3 className="text-sm font-bold font-display mb-4" style={{ color: "var(--text-primary)" }}>
              Répartition par source — mois en cours
            </h3>
            {mouvementsDuMois.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Aucun mouvement ce mois
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {(["CAISSE", "DECAISSEMENT"] as const).map(src => {
                  const filtered = mouvementsDuMois.filter(m => m.source === src)
                  const totalE = filtered.reduce((s, m) => s + m.entree, 0)
                  const totalS = filtered.reduce((s, m) => s + m.sortie, 0)
                  const label  = src === "CAISSE" ? "Journal de caisse" : "Décaissements bancaires"
                  const color  = src === "CAISSE" ? "#f0a500" : "#60a5fa"
                  return (
                    <div key={src} className="rounded-xl p-4"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-semibold font-display" style={{ color: "var(--text-primary)" }}>{label}</span>
                        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                          {filtered.length} op.
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Entrées</p>
                          <p className="font-semibold mt-0.5" style={{ color: "#22c55e" }}>{formatFCFA(totalE)}</p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Sorties</p>
                          <p className="font-semibold mt-0.5" style={{ color: "#ef4444" }}>{formatFCFA(totalS)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Derniers mouvements */}
          <div className="rounded-2xl p-6" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-display" style={{ color: "var(--text-primary)" }}>
                Derniers mouvements
              </h3>
              <button
                onClick={() => setActiveTab("journal")}
                className="text-xs flex items-center gap-1 hover:opacity-80"
                style={{ color: "var(--gold-warm)", fontFamily: "var(--font-body)" }}
              >
                Voir tout le journal <ExternalLink size={12} />
              </button>
            </div>
            {mouvementsDuMois.slice(0, 5).length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Aucun mouvement récent
              </p>
            ) : (
              <div className="space-y-2">
                {mouvementsDuMois.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                    <div className="text-xs w-16 shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {formatDate(m.date)}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-display shrink-0"
                      style={m.source === "CAISSE"
                        ? { background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.3)" }
                        : { background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }
                      }>
                      {m.source === "CAISSE" ? "Caisse" : "Banque"}
                    </span>
                    <p className="text-xs flex-1 truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {m.description}
                    </p>
                    <p className="text-xs font-mono font-semibold whitespace-nowrap"
                      style={{ color: m.entree > 0 ? "#22c55e" : "#ef4444" }}>
                      {m.entree > 0 ? "+" : "−"} {formatFCFA(m.entree + m.sortie)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation rapide vers Trésorerie */}
          <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ background: "rgba(240,165,0,0.06)", border: "1px solid rgba(240,165,0,0.25)" }}>
            <div className="flex items-center gap-3">
              <Wallet size={20} style={{ color: "#f0a500" }} />
              <div>
                <p className="text-sm font-semibold font-display" style={{ color: "var(--text-primary)" }}>
                  Gestion des paiements et décaissements
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Exécuter les décaissements validés et saisir les opérations de caisse
                </p>
              </div>
            </div>
            <Link to="/tresorerie"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-semibold transition-colors whitespace-nowrap"
              style={{ background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.4)", color: "#f0a500" }}>
              Ouvrir la trésorerie <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════
          TAB : Journal comptable
          ══════════════════════════ */}
      {activeTab === "journal" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
          {mouvementsDuMois.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ background: "var(--glass-card-bg)" }}>
              <FileText size={40} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Aucune écriture ce mois
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                    {["Date", "Source", "Type", "Description", "Bénéficiaire", "Référence", "Entrée", "Sortie"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mouvementsDuMois.map((m, idx) => (
                    <tr key={m.id}
                      style={{
                        background: idx % 2 === 0 ? "var(--bg-elevated)" : "var(--bg-surface)",
                        borderBottom: "1px solid var(--bg-border)",
                      }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {formatDate(m.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-display"
                          style={m.source === "CAISSE"
                            ? { background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.3)" }
                            : { background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }
                          }>
                          {m.source === "CAISSE" ? "Caisse" : "Banque"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {m.typeLabel}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        {m.description}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {m.beneficiaire ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {m.reference ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold whitespace-nowrap" style={{ color: "#22c55e" }}>
                        {m.entree > 0 ? formatFCFA(m.entree) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold whitespace-nowrap" style={{ color: "#ef4444" }}>
                        {m.sortie > 0 ? formatFCFA(m.sortie) : "—"}
                      </td>
                    </tr>
                  ))}
                  {/* Totaux */}
                  <tr style={{ background: "var(--bg-elevated)", borderTop: "2px solid var(--bg-border)" }}>
                    <td colSpan={6} className="px-4 py-3 text-xs font-bold font-display text-right"
                      style={{ color: "var(--text-primary)" }}>
                      TOTAUX
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: "#22c55e" }}>
                      {formatFCFA(stats.totalEntrees)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: "#ef4444" }}>
                      {formatFCFA(stats.totalSorties)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════
          TAB : Pièces justificatives
          ══════════════════════════ */}
      {activeTab === "justificatifs" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
          {piecesDuMois.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ background: "var(--glass-card-bg)" }}>
              <Receipt size={40} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Aucune pièce de caisse approuvée ce mois
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                    {["Date", "Titre", "Demandeur", "Bénéficiaire", "Motif", "Mode", "Montant", "Statut"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {piecesDuMois.map((p, idx) => (
                    <tr key={p.id}
                      style={{
                        background: idx % 2 === 0 ? "var(--bg-elevated)" : "var(--bg-surface)",
                        borderBottom: "1px solid var(--bg-border)",
                      }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {formatDate(p.dateDemande)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium font-display" style={{ color: "var(--text-primary)" }}>
                        {p.titre}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {p.demandeur.split("@")[0]}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {p.encaissementPar ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {p.motifCaisse ?? p.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {p.modePaiementCaisse ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                        {formatFCFA(p.montant)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-display"
                          style={p.statut === "SOLDE"
                            ? { background: "rgba(52,211,153,0.10)", color: "#34d399", border: "1px solid rgba(52,211,153,0.30)" }
                            : p.statut === "EN_PAIEMENT"
                            ? { background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.35)" }
                            : { background: "rgba(34,197,94,0.10)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.30)" }
                          }>
                          {p.statut === "SOLDE" ? "Soldé" : p.statut === "EN_PAIEMENT" ? "En paiement" : "Approuvé"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "var(--bg-elevated)", borderTop: "2px solid var(--bg-border)" }}>
                    <td colSpan={6} className="px-4 py-3 text-xs font-bold font-display text-right"
                      style={{ color: "var(--text-primary)" }}>
                      TOTAL
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatFCFA(piecesDuMois.reduce((s, p) => s + p.montant, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════
          TAB : Synthèse annuelle
          ══════════════════════════ */}
      {activeTab === "synthese" && (
        <div className="space-y-5">
          {/* KPIs annuels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Entrées annuelles" value={formatFCFAShort(totalAnnuel.entrees)}
              sub={`Année ${anneeCourante}`} icon={TrendingUp} color="#22c55e" />
            <StatCard label="Sorties annuelles" value={formatFCFAShort(totalAnnuel.sorties)}
              sub={`Année ${anneeCourante}`} icon={TrendingDown} color="#ef4444" />
            <StatCard label="Résultat net" value={formatFCFAShort(totalAnnuel.entrees - totalAnnuel.sorties)}
              sub={totalAnnuel.entrees - totalAnnuel.sorties >= 0 ? "Bénéfice" : "Perte"}
              icon={Wallet} color={totalAnnuel.entrees >= totalAnnuel.sorties ? "#60a5fa" : "#ef4444"} />
            <StatCard label="Budget approuvé" value={formatFCFAShort(budgetAnnuel)}
              sub={`${lignesBudget.filter(l => l.annee === anneeCourante && l.statut === "APPROUVE").length} lignes`}
              icon={CheckCircle2} color="#4ade80" />
          </div>

          {/* Graphique mensuel */}
          <div className="rounded-2xl p-6" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
            <h3 className="text-sm font-bold font-display mb-5" style={{ color: "var(--text-primary)" }}>
              Évolution mensuelle {anneeCourante}
            </h3>
            <div className="space-y-3">
              {syntheseMensuelle.map(m => (
                <div key={m.mois} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium font-display w-20" style={{ color: "var(--text-primary)" }}>
                      {m.label}
                    </span>
                    <div className="flex items-center gap-6 text-xs flex-1 ml-4">
                      {/* Entrées bar */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg-border)" }}>
                            <div className="h-2 rounded-full"
                              style={{
                                width: `${(m.entrees / maxMois) * 100}%`,
                                background: "linear-gradient(90deg, rgba(34,197,94,0.4), #22c55e)",
                              }} />
                          </div>
                          <span className="font-mono w-28 text-right" style={{ color: "#22c55e" }}>
                            {m.entrees > 0 ? formatFCFA(m.entrees) : "—"}
                          </span>
                        </div>
                      </div>
                      {/* Sorties bar */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg-border)" }}>
                            <div className="h-2 rounded-full"
                              style={{
                                width: `${(m.sorties / maxMois) * 100}%`,
                                background: "linear-gradient(90deg, rgba(239,68,68,0.4), #ef4444)",
                              }} />
                          </div>
                          <span className="font-mono w-28 text-right" style={{ color: "#ef4444" }}>
                            {m.sorties > 0 ? formatFCFA(m.sorties) : "—"}
                          </span>
                        </div>
                      </div>
                      {/* Solde */}
                      <span className="font-mono w-28 text-right font-semibold"
                        style={{ color: m.solde >= 0 ? "#60a5fa" : "#ef4444" }}>
                        {m.solde !== 0 ? formatFCFA(m.solde) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Légende */}
            <div className="flex items-center gap-6 mt-5 pt-4 text-xs"
              style={{ borderTop: "1px solid var(--bg-border)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full" style={{ background: "#22c55e" }} /> Entrées</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full" style={{ background: "#ef4444" }} /> Sorties</div>
              <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full" style={{ background: "#60a5fa" }} /> Solde net</div>
            </div>
          </div>

          {/* Alertes arrêté des comptes */}
          {totalAnnuel.sorties > totalAnnuel.entrees && (
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertTriangle size={18} style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-semibold font-display mb-0.5" style={{ color: "#ef4444" }}>
                  Déficit annuel en cours
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Les sorties dépassent les entrées de {formatFCFA(totalAnnuel.sorties - totalAnnuel.entrees)} depuis le début de l'année.
                </p>
              </div>
            </div>
          )}

          {budgetAnnuel > 0 && totalAnnuel.sorties / budgetAnnuel > 0.9 && (
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-sm font-semibold font-display mb-0.5" style={{ color: "#f59e0b" }}>
                  Budget annuel bientôt atteint
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Les sorties représentent {Math.round((totalAnnuel.sorties / budgetAnnuel) * 100)}% du budget approuvé.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal saisie écriture ── */}
      {showForm && currentUser && (
        <Modal title="Nouvelle écriture de caisse" onClose={() => setShowForm(false)}>
          <FormulaireEcriture userEmail={currentUser.email} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════
   Hook local : unification mouvements caisse + décaissements
   ════════════════════════════════════════════════ */
function useMemoMouvements(
  operations:    OperationCaisse[],
  decaissements: ReturnType<typeof useDecaissements>["data"],
): MouvementComptable[] {
  return useMemo(() => {
    const opsMouv: MouvementComptable[] = operations.map(o => ({
      id:           `caisse-${o.id}`,
      date:         o.dateSaisie,
      source:       "CAISSE",
      typeLabel:    LABEL_TYPE_OP[o.typeOperation],
      description:  o.description,
      beneficiaire: o.beneficiaire,
      reference:    o.reference,
      entree:       (o.typeOperation === "ENTREE" || o.typeOperation === "APPROVISIONNEMENT") ? o.montant : 0,
      sortie:       (o.typeOperation === "SORTIE") ? o.montant : 0,
    }))

    const decMouv: MouvementComptable[] = (decaissements ?? [])
      .filter(d => d.statut === "EXECUTE")
      .map(d => ({
        id:           `dec-${d.id}`,
        date:         d.dateExecution ?? d.dateDemande,
        source:       "DECAISSEMENT",
        typeLabel:    d.typeDecaissement,
        description:  d.titre,
        beneficiaire: d.beneficiaire,
        reference:    d.reference,
        entree:       0,
        sortie:       d.montant,
      }))

    return [...opsMouv, ...decMouv].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }, [operations, decaissements])
}
