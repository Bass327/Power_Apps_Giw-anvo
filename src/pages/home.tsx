import { memo, useState } from "react"
import { Link } from "react-router-dom"
import {
  BarChart3, Users, FileText, BookOpen, Wallet, LineChart,
  ArrowRight, CheckCircle2, Clock, XCircle, Send, Loader,
  AlertTriangle, Banknote, CheckCircle, Loader2,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import { useUpdateStatutDemande } from "@/hooks/useDemandesAchats"
import type { DemandeAchat } from "@/types/DemandeAchat"
import { STATUT_CONFIG } from "@/types/DemandeAchat"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import { MISSIONS_MOCK, CONGES_MOCK, ABSENCES_MOCK } from "@/data/mockRH"

/* ── Données statiques hissées hors du composant ── */
const modules = [
  {
    path:        "/budget",
    label:       "Budget",
    description: "Préparation et suivi budgétaire",
    Icon:        BarChart3,
    count:       3,
    accentColor: "#22c55e",
  },
  {
    path:        "/rh",
    label:       "Ressources Humaines",
    description: "Congés, missions et évaluations",
    Icon:        Users,
    count:       7,
    accentColor: "#3b82f6",
  },
  {
    path:        "/achats",
    label:       "Achats",
    description: "Demandes d'achat et expression de besoin",
    Icon:        FileText,
    count:       2,
    accentColor: "#8b5cf6",
  },
  {
    path:        "/comptabilite",
    label:       "Comptabilité",
    description: "Journaux et arrêtés comptables",
    Icon:        BookOpen,
    count:       5,
    accentColor: "#f59e0b",
  },
  {
    path:        "/tresorerie",
    label:       "Trésorerie",
    description: "Caisse, virements et rapprochements",
    Icon:        Wallet,
    count:       6,
    accentColor: "#2d9e5f",
  },
  {
    path:        "/suivi",
    label:       "Suivi & Contrôle",
    description: "Contrôle interne et reporting",
    Icon:        LineChart,
    count:       4,
    accentColor: "#f0a500",
  },
] as const

type ActivityType = "approved" | "pending" | "rejected" | "submitted" | "inprogress"

const recentActivity = [
  { id: 1, type: "approved"   as ActivityType, text: "Demande d'achat #ACH-001 approuvée",          detail: "validée par la RAF",                          time: "il y a 2h"     },
  { id: 2, type: "pending"    as ActivityType, text: "Ordre de mission OM-2024-003 en attente",      detail: "soumis par Fatou Diallo",                    time: "il y a 5h"     },
  { id: 3, type: "rejected"   as ActivityType, text: "Décaissement DEC-2024-012 rejeté",             detail: "motif : pièces justificatives manquantes",   time: "il y a 1 jour" },
  { id: 4, type: "submitted"  as ActivityType, text: "Demande de congé soumise",                     detail: "par Amadou Sow — 5 jours ouvrés",            time: "il y a 2 jours"},
  { id: 5, type: "inprogress" as ActivityType, text: "Évaluation de performance en cours",           detail: "Trimestre Q1 2025 — 4 évaluations restantes", time: "il y a 3 jours"},
]

const activityConfig: Record<ActivityType, {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  bg:    string
}> = {
  approved:   { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.10)"  },
  pending:    { Icon: Clock,        color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  rejected:   { Icon: XCircle,      color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
  submitted:  { Icon: Send,         color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  inprogress: { Icon: Loader,       color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
}

/* ════════════════════════════════════════════════
   ModuleCard — tuile module réutilisable
   ════════════════════════════════════════════════ */
interface ModuleCardProps {
  path:        string
  label:       string
  description: string
  Icon:        React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  count:       number
  accentColor: string
  index:       number
  /** Libellé du CTA : "Accéder au module" ou "Superviser" */
  ctaLabel?:   string
}

const ModuleCard = memo(function ModuleCard({
  path, label, description, Icon, count, accentColor, index, ctaLabel = "Accéder au module",
}: ModuleCardProps) {
  return (
    <Link
      to={path}
      className="group glass-card flex flex-col p-6 animate-slide-up"
      style={{
        animationDelay:          `${index * 80}ms`,
        animationDuration:       "400ms",
        animationTimingFunction: "ease-out",
        transition:              "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        borderTopWidth:  "2px",
        borderTopColor:  accentColor + "60",
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget
        card.style.borderColor    = "var(--green-vivid)"
        card.style.borderTopColor = accentColor
        card.style.transform      = "translateY(-2px)"
        card.style.boxShadow      = "0 8px 24px var(--green-glow)"
        const iconWrap = card.querySelector<HTMLElement>("[data-icon-wrap]")
        if (iconWrap) iconWrap.style.transform = "scale(1.1)"
        const cta = card.querySelector<HTMLElement>("[data-cta]")
        if (cta) cta.style.color = "var(--text-primary)"
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget
        card.style.borderColor    = "var(--bg-border)"
        card.style.borderTopColor = accentColor + "60"
        card.style.transform      = "translateY(0)"
        card.style.boxShadow      = "none"
        const iconWrap = card.querySelector<HTMLElement>("[data-icon-wrap]")
        if (iconWrap) iconWrap.style.transform = "scale(1)"
        const cta = card.querySelector<HTMLElement>("[data-cta]")
        if (cta) cta.style.color = "var(--gold-warm)"
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <div
          data-icon-wrap
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: accentColor + "18",
            transition:      "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Icon style={{ width: 20, height: 20, color: accentColor }} />
        </div>
        <span
          className="font-display font-bold text-xs px-2.5 py-1 rounded-lg"
          style={{
            background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
            color:      "var(--text-inverse)",
            boxShadow:  "0 0 12px var(--gold-glow)",
          }}
        >
          {count}
        </span>
      </div>

      <h3 className="font-display font-bold text-base mb-2 leading-snug" style={{ color: "var(--text-primary)" }}>
        {label}
      </h3>

      <p className="text-sm flex-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>

      <div
        data-cta
        className="mt-5 flex items-center gap-2 text-sm font-semibold font-display
          group-hover:gap-3 transition-all duration-200"
        style={{ color: "var(--gold-warm)" }}
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
      </div>
    </Link>
  )
})

/* ── Types pour la file d'approbation unifiée ── */
type ModuleTag = "ACHAT" | "MISSION" | "CONGE" | "ABSENCE"

interface ItemFile {
  id:          string
  titre:       string
  demandeur:   string
  dateDemande: string
  module:      ModuleTag
  path:        string
  achatData?:  DemandeAchat   // Uniquement pour les achats (SharePoint)
}

const MODULE_CFG: Record<ModuleTag, { label: string; color: string; bg: string; border: string }> = {
  ACHAT:   { label: "Achat",   color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.25)" },
  MISSION: { label: "Mission", color: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)" },
  CONGE:   { label: "Congé",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" },
  ABSENCE: { label: "Absence", color: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)" },
}

const STATUTS_FINAUX_ACHAT = ["APPROUVE", "EN_PAIEMENT", "SOLDE", "REJETE"] as const

/* ════════════════════════════════════════════════
   DirectriceDashboard — vue dédiée à la Directrice
   ════════════════════════════════════════════════ */
function DirectriceDashboard({ prenom }: { prenom: string }) {
  const { data: demandes = [], isLoading } = useDemandesAchats()
  const { mutate, isPending }              = useUpdateStatutDemande()
  const [rejetEnCours, setRejetEnCours]    = useState<string | null>(null)
  const [commentaireRejet, setCommentaire] = useState("")

  const mois  = new Date().getMonth()
  const annee = new Date().getFullYear()

  const duMois = (d: DemandeAchat) => {
    const date = new Date(d.dateApprobation || d.dateDemande)
    return date.getMonth() === mois && date.getFullYear() === annee
  }

  // KPIs achats (SharePoint)
  const achatsEnAttente = demandes.filter((d) => !STATUTS_FINAUX_ACHAT.includes(d.statut as typeof STATUTS_FINAUX_ACHAT[number]))
  const approuvesMois   = demandes.filter((d) => d.statut === "APPROUVE" && duMois(d))
  const rejetesMois     = demandes.filter((d) => d.statut === "REJETE"   && duMois(d))
  const montantMois     = approuvesMois.reduce((sum, d) => sum + d.montant, 0)

  // File d'approbation unifiée — achats + RH (missions, congés, absences)
  const fileApprobation: ItemFile[] = [
    ...achatsEnAttente.map((d) => ({
      id:          d.id,
      titre:       d.titre,
      demandeur:   d.demandeur,
      dateDemande: d.dateDemande,
      module:      "ACHAT" as ModuleTag,
      path:        "/expression-besoin",
      achatData:   d,
    })),
    ...MISSIONS_MOCK
      .filter((m) => m.statut === "SOUMIS")
      .map((m) => ({
        id:          m.id,
        titre:       m.intitule,
        demandeur:   m.demandeur,
        dateDemande: m.dateDemande,
        module:      "MISSION" as ModuleTag,
        path:        "/rh/missions",
      })),
    ...CONGES_MOCK
      .filter((c) => c.statut === "SOUMIS")
      .map((c) => ({
        id:          c.id,
        titre:       `Demande de congé — ${c.typeConge}`,
        demandeur:   c.demandeur,
        dateDemande: c.dateDemande,
        module:      "CONGE" as ModuleTag,
        path:        "/rh/conges",
      })),
    ...ABSENCES_MOCK
      .filter((a) => a.statut === "EN_ATTENTE")
      .map((a) => ({
        id:          a.id,
        titre:       `Absence signalée — ${a.typeAbsence}`,
        demandeur:   a.employe,
        dateDemande: a.dateSignalement,
        module:      "ABSENCE" as ModuleTag,
        path:        "/rh/absences",
      })),
  ].sort((a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime())

  // Délai d'attente en jours
  function joursAttente(dateDemande: string): number {
    return Math.floor((Date.now() - new Date(dateDemande).getTime()) / (1000 * 60 * 60 * 24))
  }

  function handleApprouver(demande: DemandeAchat) {
    mutate({ id: demande.id, update: { statut: "APPROUVE", commentaire: "" }, role: "Directrice" })
  }

  function handleRejeter(demande: DemandeAchat) {
    mutate(
      { id: demande.id, update: { statut: "REJETE", commentaire: commentaireRejet }, role: "Directrice" },
      { onSuccess: () => { setRejetEnCours(null); setCommentaire("") } },
    )
  }

  const kpis = [
    {
      label:  "En attente d'approbation",
      value:  fileApprobation.length,
      color:  "#ef4444",
      bg:     "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.20)",
      icon:   <Clock className="w-5 h-5" style={{ color: "#ef4444" }} />,
    },
    {
      label:  "Montant engagé ce mois",
      value:  montantMois > 0 ? formatFCFA(montantMois) : "—",
      color:  "var(--gold-warm)",
      bg:     "rgba(240,165,0,0.08)",
      border: "rgba(240,165,0,0.20)",
      icon:   <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />,
      raw:    true,
    },
    {
      label:  "Approuvées ce mois",
      value:  approuvesMois.length,
      color:  "#22c55e",
      bg:     "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.20)",
      icon:   <CheckCircle className="w-5 h-5" style={{ color: "#22c55e" }} />,
    },
    {
      label:  "Rejetées ce mois",
      value:  rejetesMois.length,
      color:  "#f59e0b",
      bg:     "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.20)",
      icon:   <XCircle className="w-5 h-5" style={{ color: "#f59e0b" }} />,
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ── Hero Direction ── */}
      <div
        className="relative overflow-hidden rounded-2xl animate-fade-in"
        style={{
          padding:        "20px 32px",
          background:     "var(--glass-card-bg)",
          backdropFilter: "blur(12px)",
          border:         "1px solid var(--bg-border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,165,0,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <p className="text-xs font-semibold font-display uppercase tracking-widest mb-2" style={{ color: "var(--gold-warm)" }}>
            ◉ Vue Direction
          </p>
          <h2 className="font-display font-bold leading-tight mb-1.5" style={{ fontSize: 30, color: "var(--text-primary)" }}>
            Bonjour, {prenom}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "480px" }}>
            Vue Direction — GIW'ANVO Energy · Supervision et approbations
          </p>
        </div>
      </div>

      {/* ── KPIs direction ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Indicateurs direction
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: kpi.bg, border: `1px solid ${kpi.border}` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {kpi.label}
                </p>
                {kpi.icon}
              </div>
              <p className="font-display font-extrabold text-2xl tabular-nums" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── File d'approbation urgente ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          File d'approbation
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 py-6" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}

        {!isLoading && fileApprobation.length === 0 && (
          <div
            className="flex items-center justify-center py-10 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--green-vivid)" }} />
              <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
                Aucune demande en attente d'approbation
              </p>
            </div>
          </div>
        )}

        {!isLoading && fileApprobation.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--bg-border)" }}
          >
            {fileApprobation.map((item, i) => {
              const jours    = joursAttente(item.dateDemande)
              const urgente  = jours > 3
              const modCfg   = MODULE_CFG[item.module]
              const enRejet  = rejetEnCours === item.id
              const isAchat  = item.module === "ACHAT"

              return (
                <div key={item.id}>
                  <div
                    className="px-5 py-4 flex items-center gap-4"
                    style={{
                      background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                      borderBottom: enRejet ? "none" : "1px solid var(--bg-border)",
                      borderLeft:   urgente ? "3px solid #ef4444" : `3px solid ${modCfg.color}40`,
                    }}
                  >
                    {/* Icône urgence */}
                    <div className="flex-shrink-0">
                      {urgente
                        ? <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                        : <Clock className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      }
                    </div>

                    {/* Infos demande */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {/* Badge module */}
                        <span
                          className="flex-shrink-0 text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: modCfg.bg, color: modCfg.color, border: `1px solid ${modCfg.border}` }}
                        >
                          {modCfg.label}
                        </span>
                        <p className="text-sm font-display font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {item.titre}
                        </p>
                        {urgente && (
                          <span
                            className="flex-shrink-0 text-xs font-display font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                          >
                            {jours}j d'attente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {item.demandeur.split("@")[0]} · {formatDateFr(item.dateDemande)}
                        </p>
                        {/* Montant uniquement pour les achats */}
                        {isAchat && item.achatData && (
                          <span className="text-xs font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                            {formatFCFA(item.achatData.montant)}
                          </span>
                        )}
                        {isAchat && item.achatData && (
                          <span
                            className="text-xs font-display font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: STATUT_CONFIG[item.achatData.statut]?.bg,
                              color:      STATUT_CONFIG[item.achatData.statut]?.color,
                              border:     `1px solid ${STATUT_CONFIG[item.achatData.statut]?.border}`,
                            }}
                          >
                            {STATUT_CONFIG[item.achatData.statut]?.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAchat && item.achatData ? (
                        /* Achats : approbation inline (SharePoint) */
                        <>
                          <button
                            onClick={() => {
                              setRejetEnCours(enRejet ? null : item.id)
                              setCommentaire("")
                            }}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-all disabled:opacity-50"
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              color:      "#ef4444",
                              border:     "1px solid rgba(239,68,68,0.25)",
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                          <button
                            onClick={() => handleApprouver(item.achatData!)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all disabled:opacity-50"
                            style={{
                              background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                              color:      "var(--text-inverse)",
                              boxShadow:  "0 0 10px var(--gold-glow)",
                            }}
                          >
                            {isPending
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle className="w-3.5 h-3.5" />
                            }
                            Approuver
                          </button>
                        </>
                      ) : (
                        /* RH : lien vers le module */
                        <Link
                          to={item.path}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all"
                          style={{
                            background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                            color:      "var(--text-inverse)",
                            boxShadow:  "0 0 10px var(--gold-glow)",
                          }}
                        >
                          Voir
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Zone de rejet inline — achats uniquement */}
                  {enRejet && isAchat && item.achatData && (
                    <div
                      className="px-5 py-3 flex items-center gap-3"
                      style={{
                        background:   "rgba(239,68,68,0.05)",
                        borderBottom: "1px solid var(--bg-border)",
                        borderLeft:   "3px solid #ef4444",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Motif de rejet (requis)..."
                        value={commentaireRejet}
                        onChange={(e) => setCommentaire(e.target.value)}
                        className="flex-1 text-sm"
                        style={{
                          background:   "var(--bg-surface)",
                          border:       "1px solid rgba(239,68,68,0.30)",
                          borderRadius: "8px",
                          padding:      "6px 10px",
                          color:        "var(--text-primary)",
                          outline:      "none",
                          fontFamily:   "'DM Sans', sans-serif",
                        }}
                      />
                      <button
                        onClick={() => handleRejeter(item.achatData!)}
                        disabled={isPending || !commentaireRejet.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-all disabled:opacity-40"
                        style={{
                          background: "rgba(239,68,68,0.15)",
                          color:      "#ef4444",
                          border:     "1px solid rgba(239,68,68,0.30)",
                        }}
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Confirmer le rejet
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modules (avec libellé "Superviser") ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Supervision des modules
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((mod, index) => (
            <ModuleCard key={mod.path} {...mod} index={index} ctaLabel="Superviser" />
          ))}
        </div>
      </div>

    </div>
  )
}

/* ════════════════════════════════════════════════
   Page principale — Dashboard standard
   ════════════════════════════════════════════════ */
export default function HomePage() {
  const { user: currentUser, role, isLoading } = useCurrentUser()
  const firstName = currentUser?.displayName.split(" ")[0] ?? "vous"

  // Dashboard dédié pour la Directrice
  if (!isLoading && role === "Directrice") {
    return <DirectriceDashboard prenom={firstName} />
  }

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ── Hero section ── */}
      <div
        className="relative overflow-hidden rounded-2xl animate-fade-in"
        style={{
          padding:        "20px 32px",
          background:     "var(--glass-card-bg)",
          backdropFilter: "blur(12px)",
          border:         "1px solid var(--bg-border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,165,0,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-10 left-32 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(45,158,95,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative">
          <p className="text-xs font-semibold font-display uppercase tracking-widest mb-2" style={{ color: "var(--gold-warm)" }}>
            ◉ Solar Command Center
          </p>
          <h2 className="font-display font-bold leading-tight mb-1.5" style={{ fontSize: 30, color: "var(--text-primary)" }}>
            Bonjour, {firstName}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "480px" }}>
            Gérez vos procédures administratives et financières en toute simplicité —
            tout est centralisé ici.
          </p>
        </div>
      </div>

      {/* ── Grille des 6 modules ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Accès rapide
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((mod, index) => (
            <ModuleCard key={mod.path} {...mod} index={index} />
          ))}
        </div>
      </div>

      {/* ── Activité récente ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Activité récente
        </p>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border:     "1px solid var(--bg-border)",
          }}
        >
          {recentActivity.map((item, i) => {
            const { Icon, color, bg } = activityConfig[item.type]
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderBottom: i < recentActivity.length - 1
                    ? "1px solid var(--bg-border)"
                    : "none",
                }}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: bg }}
                >
                  <Icon style={{ width: 16, height: 16, color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate" style={{ color: "var(--text-primary)" }}>
                    {item.text}
                  </p>
                  <p className="text-xs mt-1 leading-none truncate" style={{ color: "var(--text-muted)" }}>
                    {item.detail}
                  </p>
                </div>

                <span className="flex-shrink-0 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {item.time}
                </span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
