import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart3, Plus, Loader2, AlertCircle,
  TrendingUp, Wallet, CheckCircle2, Clock, X, Filter,
  FileText, PieChart, ArrowLeft,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, hasPermission, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import {
  useLignesBudgetaires,
  useCreateLigneBudgetaire,
  useUpdateStatutBudget,
  useUpdateExecutionBudget,
} from "@/hooks/useSuiviBudgetaire"
import {
  STATUT_BUDGET_CONFIG,
  LABEL_CATEGORIE_BUDGET,
  LABEL_TYPE_BUDGET,
  LABEL_TRIMESTRE,
  ANNEE_COURANTE,
} from "@/types/budget"
import type {
  LigneBudgetaire,
  StatutBudget,
  TypeBudget,
  CategorieBudget,
  Trimestre,
} from "@/types/budget"
import type { UserRole } from "@/types/user"

/* ════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════ */

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA"
}

function pct(part: number, total: number) {
  if (total === 0) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

/* ── Helpers inline — délèguent à permissions.ts ── */
function peutCreerBudget(role: UserRole):         boolean { return hasPermission(role, "canCreerLigneBudget") }
function peutValiderBudget(role: UserRole):       boolean { return hasPermission(role, "canValiderBudget") }
function peutApprouverBudget(role: UserRole):     boolean { return hasPermission(role, "canApprouverBudget") }
function peutSaisirExecution(role: UserRole):     boolean { return hasPermission(role, "canSaisirExecutionBudget") }

/* ════════════════════════════════════════════════
   Badge statut
   ════════════════════════════════════════════════ */
function StatutBadge({ statut }: { statut: StatutBudget }) {
  const cfg = STATUT_BUDGET_CONFIG[statut]
  return (
    <span
      style={{
        color: cfg.color, background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-display whitespace-nowrap"
    >
      {cfg.label}
    </span>
  )
}

/* ════════════════════════════════════════════════
   Barre de progression
   ════════════════════════════════════════════════ */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = pct(value, max)
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: "var(--bg-border)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${p}%`, background: color }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════
   Carte stat
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
   Modal générique
   ════════════════════════════════════════════════ */
function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
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
   Formulaire nouvelle ligne
   ════════════════════════════════════════════════ */
interface FormState {
  titre:         string
  code:          string
  departement:   string
  annee:         number
  categorie:     CategorieBudget
  type:          TypeBudget
  montantPAB:    string
  trimestre:     Trimestre | ""
  commentaire:   string
}

const FORM_DEFAULT: FormState = {
  titre: "", code: "", departement: "", annee: ANNEE_COURANTE,
  categorie: "FONCTIONNEMENT", type: "INITIAL",
  montantPAB: "", trimestre: "", commentaire: "",
}

const DEPARTEMENTS = ["DG", "RAF", "DSID", "DTO", "DCom", "DRH", "Technique", "Logistique", "Autre"]

function FormulaireLigne({
  userEmail, onClose,
}: {
  userEmail: string
  onClose:   () => void
}) {
  const [form, setForm]         = useState<FormState>(FORM_DEFAULT)
  const [soumettre, setSoumettre] = useState(false)
  const { mutate, isPending }   = useCreateLigneBudgetaire()

  const set = (key: keyof FormState, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }))

  function handleSubmit(submit: boolean) {
    if (!form.titre || !form.departement || !form.montantPAB) return
    setSoumettre(submit)
    const montant = Number(form.montantPAB)
    mutate({
      data: {
        titre:          form.titre,
        code:           form.code,
        departement:    form.departement,
        annee:          form.annee,
        categorie:      form.categorie,
        type:           form.type,
        montantPAB:     montant,
        montantRevise:  montant,
        montantEngage:  0,
        montantRealise: 0,
        statut:         submit ? "SOUMIS" : "BROUILLON",
        trimestre:      (form.trimestre as Trimestre) || undefined,
        demandeur:      userEmail,
        commentaire:    form.commentaire || undefined,
      },
      soumettre: submit,
    }, { onSuccess: onClose })
  }

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
  }
  const labelCls = "block text-xs mb-1.5 font-medium"
  const labelStyle = { color: "var(--text-secondary)", fontFamily: "var(--font-body)" }

  return (
    <div className="space-y-5">
      {/* Titre + Code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Intitulé du poste *</label>
          <input className={inputCls} style={inputStyle} value={form.titre}
            onChange={e => set("titre", e.target.value)} placeholder="Ex: Salaires et charges" />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Code ligne</label>
          <input className={inputCls} style={inputStyle} value={form.code}
            onChange={e => set("code", e.target.value)} placeholder="Ex: B-2026-001" />
        </div>
      </div>

      {/* Département + Année */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Département *</label>
          <select className={inputCls} style={inputStyle} value={form.departement}
            onChange={e => set("departement", e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {DEPARTEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Année</label>
          <input type="number" className={inputCls} style={inputStyle} value={form.annee}
            onChange={e => set("annee", Number(e.target.value))} min={2020} max={2030} />
        </div>
      </div>

      {/* Catégorie + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Catégorie</label>
          <select className={inputCls} style={inputStyle} value={form.categorie}
            onChange={e => set("categorie", e.target.value as CategorieBudget)}>
            {(Object.keys(LABEL_CATEGORIE_BUDGET) as CategorieBudget[]).map(k => (
              <option key={k} value={k}>{LABEL_CATEGORIE_BUDGET[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Type</label>
          <select className={inputCls} style={inputStyle} value={form.type}
            onChange={e => set("type", e.target.value as TypeBudget)}>
            {(Object.keys(LABEL_TYPE_BUDGET) as TypeBudget[]).map(k => (
              <option key={k} value={k}>{LABEL_TYPE_BUDGET[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Montant PAB + Trimestre */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Montant PAB (FCFA) *</label>
          <input type="number" className={inputCls} style={inputStyle} value={form.montantPAB}
            onChange={e => set("montantPAB", e.target.value)} placeholder="0" min={0} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Trimestre (optionnel)</label>
          <select className={inputCls} style={inputStyle} value={form.trimestre}
            onChange={e => set("trimestre", e.target.value)}>
            <option value="">Tous trimestres</option>
            {(Object.keys(LABEL_TRIMESTRE) as Trimestre[]).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Commentaire */}
      <div>
        <label className={labelCls} style={labelStyle}>Commentaire / Justification</label>
        <textarea className={inputCls} style={{ ...inputStyle, resize: "none" }} rows={3}
          value={form.commentaire} onChange={e => set("commentaire", e.target.value)}
          placeholder="Contexte ou justification de cette ligne budgétaire..." />
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} disabled={isPending}
          className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-colors"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}>
          Annuler
        </button>
        <button onClick={() => handleSubmit(false)} disabled={isPending || !form.titre || !form.departement || !form.montantPAB}
          className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-colors"
          style={{ background: "transparent", border: "1px solid var(--green-vivid)", color: "var(--green-bright)" }}>
          Enregistrer brouillon
        </button>
        <button onClick={() => handleSubmit(true)} disabled={isPending || !form.titre || !form.departement || !form.montantPAB}
          className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }}>
          {isPending && soumettre ? <Loader2 size={14} className="animate-spin" /> : null}
          Soumettre au RAF
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Modal validation RAF / approbation DG
   ════════════════════════════════════════════════ */
function ModalValidation({
  ligne, action, onClose,
}: {
  ligne:   LigneBudgetaire
  action:  "valider" | "approuver" | "rejeter"
  onClose: () => void
}) {
  const [commentaire, setCommentaire] = useState("")
  const { mutate, isPending } = useUpdateStatutBudget()

  const statut: StatutBudget =
    action === "valider"   ? "VALIDE_RAF"
    : action === "approuver" ? "APPROUVE"
    : "REJETE"

  const title =
    action === "valider"   ? "Validation RAF"
    : action === "approuver" ? "Approbation Directrice"
    : "Rejet de la ligne"

  const btnColor = action === "rejeter"
    ? { background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#ef4444" }
    : { background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }

  function handleSubmit() {
    mutate({ id: ligne.id, statut, commentaire: commentaire || undefined }, { onSuccess: onClose })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {ligne.titre}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            {ligne.departement} · {LABEL_CATEGORIE_BUDGET[ligne.categorie]} · Montant PAB : {formatFCFA(ligne.montantPAB)}
          </p>
        </div>
        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Commentaire {action === "rejeter" ? "(obligatoire)" : "(optionnel)"}
          </label>
          <textarea
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", resize: "none" }}
            rows={3} value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder={action === "rejeter" ? "Motif du rejet..." : "Observations..."}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}>
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || (action === "rejeter" && !commentaire)}
            className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold flex items-center justify-center gap-2"
            style={btnColor}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {action === "valider" ? "Valider" : action === "approuver" ? "Approuver" : "Rejeter"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════════════
   Modal saisie exécution
   ════════════════════════════════════════════════ */
function ModalExecution({
  ligne, onClose,
}: {
  ligne:   LigneBudgetaire
  onClose: () => void
}) {
  const [engage, setEngage]     = useState(String(ligne.montantEngage))
  const [realise, setRealise]   = useState(String(ligne.montantRealise))
  const { mutate, isPending }   = useUpdateExecutionBudget()

  function handleSubmit() {
    mutate({
      id:             ligne.id,
      montantEngage:  Number(engage),
      montantRealise: Number(realise),
    }, { onSuccess: onClose })
  }

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none"
  const inputStyle = { background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }

  return (
    <Modal title="Mettre à jour l'exécution" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
          <p className="text-sm font-semibold font-display" style={{ color: "var(--text-primary)" }}>{ligne.titre}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Budget disponible : {formatFCFA(ligne.montantRevise)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Montant engagé (FCFA)
            </label>
            <input type="number" className={inputCls} style={inputStyle}
              value={engage} onChange={e => setEngage(e.target.value)} min={0} />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Montant réalisé (FCFA)
            </label>
            <input type="number" className={inputCls} style={inputStyle}
              value={realise} onChange={e => setRealise(e.target.value)} min={0} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }}>
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════════════
   Page principale
   ════════════════════════════════════════════════ */
type TabId = "lignes" | "suivi"

export default function BudgetPage() {
  const { user: currentUser } = useCurrentUser()
  const navigate               = useNavigate()
  const { data: lignes = [], isLoading, isError } = useLignesBudgetaires()

  const [activeTab,    setActiveTab]    = useState<TabId>("lignes")
  const [showForm,     setShowForm]     = useState(false)
  const [filterDept,   setFilterDept]   = useState("")
  const [filterStatut, setFilterStatut] = useState<StatutBudget | "">("")
  const [filterAnnee,  setFilterAnnee]  = useState<number | "">(ANNEE_COURANTE)

  /* Modal état */
  const [modalValidation, setModalValidation] = useState<{
    ligne: LigneBudgetaire; action: "valider" | "approuver" | "rejeter"
  } | null>(null)
  const [modalExecution, setModalExecution] = useState<LigneBudgetaire | null>(null)

  const role   = currentUser?.role
  const access = role ? getModuleAccess(role, "budget") : "none"

  /* Garde d'accès module */
  if (!currentUser && !isLoading) return null
  if (access === "none") return <AccessDenied message={ACCESS_DENIED_MESSAGES.budget} />

  /* Filtrage des lignes */
  const lignesFiltrees = useMemo(() => {
    return lignes.filter(l => {
      if (filterDept   && l.departement !== filterDept) return false
      if (filterStatut && l.statut !== filterStatut)    return false
      if (filterAnnee  && l.annee !== filterAnnee)      return false
      return true
    })
  }, [lignes, filterDept, filterStatut, filterAnnee])

  /* Stats globales sur les lignes filtrées */
  const stats = useMemo(() => {
    const totalPAB      = lignesFiltrees.reduce((s, l) => s + l.montantPAB, 0)
    const totalRevise   = lignesFiltrees.reduce((s, l) => s + l.montantRevise, 0)
    const totalEngage   = lignesFiltrees.reduce((s, l) => s + l.montantEngage, 0)
    const totalRealise  = lignesFiltrees.reduce((s, l) => s + l.montantRealise, 0)
    const totalDispo    = totalRevise - totalRealise
    const tauxExecution = pct(totalRealise, totalRevise)
    return { totalPAB, totalRevise, totalEngage, totalRealise, totalDispo, tauxExecution }
  }, [lignesFiltrees])

  /* Départements distincts pour le filtre */
  const departements = useMemo(() =>
    [...new Set(lignes.map(l => l.departement).filter(Boolean))].sort(),
    [lignes],
  )

  /* ── Actions disponibles par rôle + statut ── */
  function getActions(ligne: LigneBudgetaire) {
    if (!role) return []
    const actions: { label: string; onClick: () => void; danger?: boolean }[] = []

    if (peutValiderBudget(role) && ligne.statut === "SOUMIS") {
      actions.push({ label: "Valider",  onClick: () => setModalValidation({ ligne, action: "valider" }) })
      actions.push({ label: "Rejeter",  onClick: () => setModalValidation({ ligne, action: "rejeter" }), danger: true })
    }
    if (peutApprouverBudget(role) && ligne.statut === "VALIDE_RAF") {
      actions.push({ label: "Approuver", onClick: () => setModalValidation({ ligne, action: "approuver" }) })
      actions.push({ label: "Rejeter",   onClick: () => setModalValidation({ ligne, action: "rejeter" }), danger: true })
    }
    if (peutSaisirExecution(role) && ligne.statut === "APPROUVE") {
      actions.push({ label: "Saisir exécution", onClick: () => setModalExecution(ligne) })
    }
    return actions
  }

  /* ── Suivi trimestriel : regroupement par trimestre ── */
  const suiviTrimestriel = useMemo(() => {
    const trims: Trimestre[] = ["T1", "T2", "T3", "T4"]
    return trims.map(t => {
      const l = lignesFiltrees.filter(lg => lg.trimestre === t || !lg.trimestre)
      const pab      = l.reduce((s, lg) => s + lg.montantPAB, 0)
      const realise  = l.reduce((s, lg) => s + lg.montantRealise, 0)
      return { trimestre: t, pab, realise, taux: pct(realise, pab) }
    })
  }, [lignesFiltrees])

  /* ── Regroupement par catégorie ── */
  const parCategorie = useMemo(() => {
    const cats = ["PERSONNEL", "FONCTIONNEMENT", "INVESTISSEMENT", "PROJETS"] as CategorieBudget[]
    return cats.map(cat => {
      const l = lignesFiltrees.filter(lg => lg.categorie === cat)
      const pab     = l.reduce((s, lg) => s + lg.montantPAB, 0)
      const realise = l.reduce((s, lg) => s + lg.montantRealise, 0)
      return { cat, label: LABEL_CATEGORIE_BUDGET[cat], pab, realise }
    }).filter(x => x.pab > 0)
  }, [lignesFiltrees])

  /* ── Loading / Error ── */
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
          Impossible de charger les données budgétaires.
        </p>
      </div>
    )
  }

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
          <div className="p-3 rounded-2xl" style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <BarChart3 size={28} style={{ color: "#4ade80" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Module Budget
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Plan d'Action Budgétaire · Exécution · Suivi trimestriel
            </p>
          </div>
        </div>
        {role && peutCreerBudget(role) && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #f0a500, #ffc235)", color: "#080f0b" }}
          >
            <Plus size={16} />
            Nouvelle ligne
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Budget PAB" value={formatFCFA(stats.totalPAB)} sub={`${lignesFiltrees.length} lignes`}
          icon={FileText} color="#4ade80" />
        <StatCard label="Engagé" value={formatFCFA(stats.totalEngage)} sub={`${pct(stats.totalEngage, stats.totalRevise)}% du budget`}
          icon={TrendingUp} color="#f0a500" />
        <StatCard label="Réalisé" value={formatFCFA(stats.totalRealise)} sub={`Taux d'exécution ${stats.tauxExecution}%`}
          icon={CheckCircle2} color="#22c55e" />
        <StatCard label="Disponible" value={formatFCFA(stats.totalDispo)} sub="Budget non consommé"
          icon={Wallet} color="#60a5fa" />
      </div>

      {/* ── Filtres ── */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
      >
        <Filter size={16} style={{ color: "var(--text-muted)" }} />

        <select
          value={filterAnnee}
          onChange={e => setFilterAnnee(e.target.value ? Number(e.target.value) : "")}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
        >
          <option value="">Toutes les années</option>
          {[ANNEE_COURANTE - 1, ANNEE_COURANTE, ANNEE_COURANTE + 1].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
        >
          <option value="">Tous les départements</option>
          {departements.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value as StatutBudget | "")}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUT_BUDGET_CONFIG) as StatutBudget[]).map(s => (
            <option key={s} value={s}>{STATUT_BUDGET_CONFIG[s].label}</option>
          ))}
        </select>

        {(filterDept || filterStatut || filterAnnee !== ANNEE_COURANTE) && (
          <button
            onClick={() => { setFilterDept(""); setFilterStatut(""); setFilterAnnee(ANNEE_COURANTE) }}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
          >
            <X size={12} /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        {([ ["lignes", "Lignes budgétaires", FileText], ["suivi", "Suivi trimestriel", PieChart] ] as [TabId, string, React.ElementType][]).map(([id, label, Icon]) => (
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
          TAB : Lignes budgétaires
          ══════════════════════════ */}
      {activeTab === "lignes" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
          {lignesFiltrees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ background: "var(--glass-card-bg)" }}>
              <BarChart3 size={40} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Aucune ligne budgétaire trouvée
              </p>
              {role && peutCreerBudget(role) && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 mt-2 px-4 py-2 rounded-xl text-sm font-display font-medium"
                  style={{ background: "rgba(45,158,95,0.1)", border: "1px solid var(--green-vivid)", color: "var(--green-bright)" }}>
                  <Plus size={14} /> Créer la première ligne
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
                    {["Poste budgétaire", "Dept.", "Catégorie", "Budget PAB", "Engagé", "Réalisé", "Disponible", "Taux", "Statut", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignesFiltrees.map((ligne, idx) => {
                    const dispo    = ligne.montantRevise - ligne.montantRealise
                    const taux     = pct(ligne.montantRealise, ligne.montantRevise)
                    const actions  = getActions(ligne)
                    return (
                      <tr key={ligne.id}
                        style={{
                          background: idx % 2 === 0 ? "var(--bg-elevated)" : "var(--bg-surface)",
                          borderBottom: "1px solid var(--bg-border)",
                        }}
                      >
                        {/* Poste */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="font-medium text-xs font-display truncate" style={{ color: "var(--text-primary)" }}>
                            {ligne.titre}
                          </p>
                          {ligne.code && (
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{ligne.code}</p>
                          )}
                        </td>
                        {/* Dept */}
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                          {ligne.departement}
                        </td>
                        {/* Catégorie */}
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                          {LABEL_CATEGORIE_BUDGET[ligne.categorie]}
                        </td>
                        {/* Montants */}
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                          {formatFCFA(ligne.montantPAB)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: "#f0a500" }}>
                          {formatFCFA(ligne.montantEngage)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: "#22c55e" }}>
                          {formatFCFA(ligne.montantRealise)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: dispo >= 0 ? "#60a5fa" : "#ef4444" }}>
                          {formatFCFA(dispo)}
                        </td>
                        {/* Taux */}
                        <td className="px-4 py-3 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={ligne.montantRealise} max={ligne.montantRevise}
                              color={taux > 90 ? "#ef4444" : taux > 70 ? "#f0a500" : "#22c55e"} />
                            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                              {taux}%
                            </span>
                          </div>
                        </td>
                        {/* Statut */}
                        <td className="px-4 py-3">
                          <StatutBadge statut={ligne.statut} />
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          {actions.length > 0 ? (
                            <div className="flex gap-2">
                              {actions.map(a => (
                                <button key={a.label} onClick={a.onClick}
                                  className="px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-colors whitespace-nowrap"
                                  style={a.danger
                                    ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }
                                    : { background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.3)", color: "#f0a500" }
                                  }>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════
          TAB : Suivi trimestriel
          ══════════════════════════ */}
      {activeTab === "suivi" && (
        <div className="space-y-6">

          {/* Suivi par trimestre */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suiviTrimestriel.map(({ trimestre, pab, realise, taux }) => (
              <div key={trimestre} className="rounded-2xl p-5"
                style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold font-display" style={{ color: "var(--gold-warm)" }}>{trimestre}</span>
                  <span className="text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.3)" }}>
                    {taux}%
                  </span>
                </div>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Budget</p>
                <p className="text-sm font-semibold font-display mb-3" style={{ color: "var(--text-primary)" }}>
                  {formatFCFA(pab)}
                </p>
                <ProgressBar value={realise} max={pab}
                  color={taux > 90 ? "#ef4444" : taux > 70 ? "#f0a500" : "#22c55e"} />
                <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Réalisé : {formatFCFA(realise)}
                </p>
              </div>
            ))}
          </div>

          {/* Répartition par catégorie */}
          {parCategorie.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
              <h3 className="text-sm font-bold font-display mb-5" style={{ color: "var(--text-primary)" }}>
                Répartition par catégorie
              </h3>
              <div className="space-y-4">
                {parCategorie.map(({ cat, label, pab, realise }) => {
                  const t = pct(realise, pab)
                  const totalPAB = stats.totalPAB
                  const share = pct(pab, totalPAB)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium font-display" style={{ color: "var(--text-primary)" }}>{label}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-display"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--bg-border)" }}>
                            {share}% du PAB
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                            {formatFCFA(realise)} / {formatFCFA(pab)}
                          </span>
                          <span className="text-xs font-bold font-display w-12 text-right"
                            style={{ color: t > 90 ? "#ef4444" : t > 70 ? "#f0a500" : "#22c55e" }}>
                            {t}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={realise} max={pab}
                        color={t > 90 ? "#ef4444" : t > 70 ? "#f0a500" : "#22c55e"} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Indicateurs globaux */}
          <div className="rounded-2xl p-6" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}>
            <h3 className="text-sm font-bold font-display mb-4" style={{ color: "var(--text-primary)" }}>
              Indicateurs de performance budgétaire
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              {[
                { label: "Taux d'exécution global", value: `${stats.tauxExecution}%`,
                  color: stats.tauxExecution > 90 ? "#ef4444" : stats.tauxExecution > 70 ? "#f0a500" : "#22c55e" },
                { label: "Taux d'engagement", value: `${pct(stats.totalEngage, stats.totalRevise)}%`, color: "#f0a500" },
                { label: "Solde disponible", value: formatFCFA(stats.totalDispo),
                  color: stats.totalDispo < 0 ? "#ef4444" : "#60a5fa" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-2xl font-extrabold font-display mb-1" style={{ color }}>{value}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes dépassement */}
          {lignesFiltrees.some(l => l.montantRealise > l.montantRevise) && (
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertCircle size={18} className="shrink-0" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-semibold font-display mb-1" style={{ color: "#ef4444" }}>
                  Dépassements budgétaires détectés
                </p>
                <ul className="text-xs space-y-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {lignesFiltrees.filter(l => l.montantRealise > l.montantRevise).map(l => (
                    <li key={l.id}>
                      · {l.titre} ({l.departement}) — dépassement de {formatFCFA(l.montantRealise - l.montantRevise)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Lignes en attente validation */}
          {lignesFiltrees.filter(l => l.statut === "SOUMIS" || l.statut === "VALIDE_RAF").length > 0 && (
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Clock size={18} style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-sm font-semibold font-display mb-1" style={{ color: "#f59e0b" }}>
                  Lignes en attente de validation
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {lignesFiltrees.filter(l => l.statut === "SOUMIS").length} ligne(s) soumises au RAF ·{" "}
                  {lignesFiltrees.filter(l => l.statut === "VALIDE_RAF").length} ligne(s) en attente d'approbation DG
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal formulaire ── */}
      {showForm && currentUser && (
        <Modal title="Nouvelle ligne budgétaire" onClose={() => setShowForm(false)}>
          <FormulaireLigne userEmail={currentUser.email} onClose={() => setShowForm(false)} />
        </Modal>
      )}

      {/* ── Modal validation ── */}
      {modalValidation && (
        <ModalValidation
          ligne={modalValidation.ligne}
          action={modalValidation.action}
          onClose={() => setModalValidation(null)}
        />
      )}

      {/* ── Modal exécution ── */}
      {modalExecution && (
        <ModalExecution
          ligne={modalExecution}
          onClose={() => setModalExecution(null)}
        />
      )}
    </div>
  )
}
