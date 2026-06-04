import { memo, useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  BarChart3, Users, FileText, BookOpen, Wallet, LineChart,
  ArrowRight, Clock, XCircle, X,
  AlertTriangle, Banknote, CheckCircle, Loader2,
} from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import { useUpdateStatutDemande } from "@/hooks/useDemandesAchats"
import { useMissions, useUpdateStatutMission } from "@/hooks/useMissions"
import type { DemandeAchat } from "@/types/DemandeAchat"
import type { Mission } from "@/types/rh"
import { STATUT_CONFIG, LABEL_TYPE_DEMANDE, LABEL_JUSTIFICATION_OP, TYPE_CONFIG } from "@/types/DemandeAchat"
import { STATUT_MISSION_CONFIG, LABEL_TYPE_MISSION, LABEL_MOYEN_TRANSPORT_MISSION } from "@/types/rh"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import { canAccessModule } from "@/lib/permissions"
import type { UserRole } from "@/types/user"

/* ── Sépare "14,1 M FCFA" → { main: "14,1 M", currency: "FCFA" } ── */
function splitKpiValue(v: string | number): { main: string; currency?: string } {
  const s   = String(v)
  const idx = s.lastIndexOf(" FCFA")
  if (idx === -1) return { main: s }
  return { main: s.slice(0, idx).trim(), currency: "FCFA" }
}

/* ── Carte KPI partagée entre les dashboards Chef Dept. et Directrice ── */
interface DashboardKpiCardProps {
  label:  string
  value:  string | number
  color:  string
  bg:     string
  border: string
  icon:   React.ReactNode
}

function DashboardKpiCard({ label, value, color, bg, border, icon }: DashboardKpiCardProps) {
  const { main, currency } = splitKpiValue(value)
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 min-w-0"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest leading-snug flex-1 min-w-0"
          style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </p>
        <span className="flex-shrink-0">{icon}</span>
      </div>
      <p className="kpi-value" style={{ color }}>
        {main}
        {currency && <span className="kpi-currency"> {currency}</span>}
      </p>
    </div>
  )
}

/* ── Catalogue complet des modules — filtré selon le rôle au runtime ── */
const ALL_MODULES = [
  {
    path:        "/budget",
    label:       "Budget",
    description: "Préparation et suivi budgétaire",
    Icon:        BarChart3,
    module:      "budget" as const,
    accentColor: "#22c55e",
  },
  {
    path:        "/rh",
    label:       "Ressources Humaines",
    description: "Congés, missions et évaluations",
    Icon:        Users,
    module:      "rh" as const,
    accentColor: "#3b82f6",
  },
  {
    path:        "/achats",
    label:       "Achats",
    description: "Demandes d'achat et expression de besoin",
    Icon:        FileText,
    module:      "achats" as const,
    accentColor: "#8b5cf6",
  },
  {
    path:        "/comptabilite",
    label:       "Comptabilité",
    description: "Journaux et arrêtés comptables",
    Icon:        BookOpen,
    module:      "comptabilite" as const,
    accentColor: "#f59e0b",
  },
  {
    path:        "/tresorerie",
    label:       "Trésorerie",
    description: "Caisse, virements et rapprochements",
    Icon:        Wallet,
    module:      "tresorerie" as const,
    accentColor: "#2d9e5f",
  },
  {
    path:        "/suivi",
    label:       "Suivi & Contrôle",
    description: "Contrôle interne et reporting",
    Icon:        LineChart,
    module:      "suivi" as const,
    accentColor: "#f0a500",
  },
]


/* ════════════════════════════════════════════════
   ModuleCard — tuile module réutilisable
   ════════════════════════════════════════════════ */
interface ModuleCardProps {
  path:        string
  label:       string
  description: string
  Icon:        React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  accentColor: string
  index:       number
  /** Libellé du CTA : "Accéder au module" ou "Superviser" */
  ctaLabel?:   string
}

const ModuleCard = memo(function ModuleCard({
  path, label, description, Icon, accentColor, index, ctaLabel = "Accéder au module",
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
  id:            string
  titre:         string
  demandeur:     string
  dateDemande:   string
  module:        ModuleTag
  path:          string
  achatData?:    DemandeAchat   // Uniquement pour les achats (SharePoint)
  missionData?:  Mission        // Uniquement pour les missions (SharePoint)
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
  const { data: demandes  = [], isLoading: isLoadingAchats }  = useDemandesAchats()
  const { data: missions  = [], isLoading: isLoadingMissions } = useMissions()
  const { mutate, isPending }                                  = useUpdateStatutDemande()
  const { mutate: mutateMission, isPending: isMissionPending } = useUpdateStatutMission()
  const [demandeSelectee, setDemandeSelectee]   = useState<DemandeAchat | null>(null)
  const [missionSelectee, setMissionSelectee]   = useState<Mission | null>(null)

  const isLoading = isLoadingAchats || isLoadingMissions

  const mois  = new Date().getMonth()
  const annee = new Date().getFullYear()

  const duMois = (d: DemandeAchat) => {
    const date = new Date(d.dateApprobation || d.dateDemande)
    return date.getMonth() === mois && date.getFullYear() === annee
  }

  // KPIs achats (SharePoint)
  const achatsEnAttente        = demandes.filter((d) => !STATUTS_FINAUX_ACHAT.includes(d.statut as typeof STATUTS_FINAUX_ACHAT[number]))
  const approuvesMois          = demandes.filter((d) => d.statut === "APPROUVE" && duMois(d))
  const montantMois            = approuvesMois.reduce((sum, d) => sum + d.montant, 0)
  const totalPiecesCaisse      = demandes.filter((d) => d.typeDemande === "PIECE_CAISSE").reduce((sum, d) => sum + d.montant, 0)
  const totalAchatsPrestations = demandes.filter((d) => d.typeDemande === "ACHAT_PRESTATION").reduce((sum, d) => sum + d.montant, 0)

  // Missions en attente d'approbation DG
  const missionsEnAttente = missions.filter((m) => m.statut === "SOUMIS")

  // File d'approbation unifiée : achats + missions en attente
  const fileApprobation: ItemFile[] = [
    ...achatsEnAttente.map((d) => ({
      id:          d.id,
      titre:       d.titre,
      demandeur:   d.demandeur,
      dateDemande: d.dateDemande,
      module:      "ACHAT" as ModuleTag,
      path:        "/achats",
      achatData:   d,
    })),
    ...missionsEnAttente.map((m) => ({
      id:           m.id,
      titre:        m.intitule,
      demandeur:    m.demandeur,
      dateDemande:  m.dateDemande,
      module:       "MISSION" as ModuleTag,
      path:         "/rh",
      missionData:  m,
    })),
  ].sort((a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime())

  // Délai d'attente en jours
  function joursAttente(dateDemande: string): number {
    return Math.floor((Date.now() - new Date(dateDemande).getTime()) / (1000 * 60 * 60 * 24))
  }

  function handleApprouver(demande: DemandeAchat, commentaire: string) {
    mutate(
      {
        id:             demande.id,
        update:         { statut: "APPROUVE", commentaire },
        role:           "Directrice",
        demandeurEmail: demande.demandeur,
        titre:          demande.titre,
      },
      { onSuccess: () => setDemandeSelectee(null) },
    )
  }

  function handleRejeter(demande: DemandeAchat, commentaire: string) {
    mutate(
      {
        id:             demande.id,
        update:         { statut: "REJETE", commentaire },
        role:           "Directrice",
        demandeurEmail: demande.demandeur,
        titre:          demande.titre,
      },
      { onSuccess: () => setDemandeSelectee(null) },
    )
  }

  function handleApprouverMission(mission: Mission, commentaire: string) {
    mutateMission(
      { id: mission.id, statut: "APPROUVE", commentaire, demandeurEmail: mission.demandeur, titre: mission.intitule },
      { onSuccess: () => setMissionSelectee(null) },
    )
  }

  function handleRejeterMission(mission: Mission, commentaire: string) {
    mutateMission(
      { id: mission.id, statut: "REJETE", commentaire, demandeurEmail: mission.demandeur, titre: mission.intitule },
      { onSuccess: () => setMissionSelectee(null) },
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
      label:  "Missions à approuver",
      value:  missionsEnAttente.length,
      color:  "#3b82f6",
      bg:     "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.20)",
      icon:   <Clock className="w-5 h-5" style={{ color: "#3b82f6" }} />,
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
      label:  "Total pièces de caisse",
      value:  totalPiecesCaisse > 0 ? formatFCFA(totalPiecesCaisse) : "—",
      color:  "#8b5cf6",
      bg:     "rgba(139,92,246,0.08)",
      border: "rgba(139,92,246,0.20)",
      icon:   <Wallet className="w-5 h-5" style={{ color: "#8b5cf6" }} />,
    },
    {
      label:  "Total achats & prestations",
      value:  totalAchatsPrestations > 0 ? formatFCFA(totalAchatsPrestations) : "—",
      color:  "var(--gold-warm)",
      bg:     "rgba(240,165,0,0.08)",
      border: "rgba(240,165,0,0.20)",
      icon:   <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />,
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Modal détail achat */}
      {demandeSelectee && (
        <DemandeDetailModal
          demande={demandeSelectee}
          onClose={() => setDemandeSelectee(null)}
          onValider={(comment) => handleApprouver(demandeSelectee, comment)}
          onRejeter={(comment) => handleRejeter(demandeSelectee, comment)}
          isPending={isPending}
          canAct={!STATUTS_FINAUX_ACHAT.includes(demandeSelectee.statut as typeof STATUTS_FINAUX_ACHAT[number])}
          actionLabel="Approuver définitivement"
        />
      )}

      {/* Modal détail mission */}
      {missionSelectee && (
        <MissionDetailModal
          mission={missionSelectee}
          onClose={() => setMissionSelectee(null)}
          onApprouver={(comment) => handleApprouverMission(missionSelectee, comment)}
          onRejeter={(comment) => handleRejeterMission(missionSelectee, comment)}
          isPending={isMissionPending}
        />
      )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <DashboardKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              color={kpi.color}
              bg={kpi.bg}
              border={kpi.border}
              icon={kpi.icon}
            />
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
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
            {fileApprobation.map((item, i) => {
              const jours   = joursAttente(item.dateDemande)
              const urgente = jours > 3
              const modCfg  = MODULE_CFG[item.module]
              const isAchat = item.module === "ACHAT"

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isAchat && item.achatData) setDemandeSelectee(item.achatData)
                    else if (item.module === "MISSION" && item.missionData) setMissionSelectee(item.missionData)
                  }}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors duration-150"
                  style={{
                    background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                    borderBottom: "1px solid var(--bg-border)",
                    borderLeft:   urgente ? "3px solid #ef4444" : `3px solid ${modCfg.color}40`,
                    cursor:       "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                >
                  {/* Icône urgence */}
                  <div className="flex-shrink-0">
                    {urgente
                      ? <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                      : <Clock className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className="flex-shrink-0 text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: modCfg.bg, color: modCfg.color, border: `1px solid ${modCfg.border}` }}
                      >
                        {modCfg.label}
                      </span>
                      <p className="text-sm font-display font-semibold truncate flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
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

                  {/* CTA */}
                  <div
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                      color:      "var(--text-inverse)",
                    }}
                  >
                    Voir <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
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
          {ALL_MODULES.map((mod, index) => (
            <ModuleCard key={mod.path} {...mod} index={index} ctaLabel="Superviser" />
          ))}
        </div>
      </div>

    </div>
  )
}

/* ════════════════════════════════════════════════
   DemandeDetailModal — popup détail + actions Chef
   ════════════════════════════════════════════════ */
function DemandeDetailModal({
  demande,
  onClose,
  onValider,
  onRejeter,
  isPending,
  canAct,
  actionLabel = "Valider la demande",
}: {
  demande:      DemandeAchat
  onClose:      () => void
  onValider:    (comment: string) => void
  onRejeter:    (comment: string) => void
  isPending:    boolean
  canAct?:      boolean
  actionLabel?: string
}) {
  const [commentaire, setCommentaire] = useState("")
  const [modeRejet,   setModeRejet]   = useState(false)

  // Fermeture sur touche Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  /* Petit composant inline pour afficher un champ label + valeur */
  function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
    if (!value && value !== 0) return null
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5"
           style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
          {label}
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
          {String(value)}
        </p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--modal-overlay)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
      >
        {/* Header modal */}
        <div
          className="sticky top-0 flex items-start justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ background: "var(--glass-header-bg)", borderBottom: "1px solid var(--bg-border)", backdropFilter: "blur(20px)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: STATUT_CONFIG[demande.statut].bg,
                  color:      STATUT_CONFIG[demande.statut].color,
                  border:     `1px solid ${STATUT_CONFIG[demande.statut].border}`,
                }}
              >
                {STATUT_CONFIG[demande.statut].label}
              </span>
              {demande.typeDemande && (
                <span
                  className="text-xs font-display px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(139,92,246,0.10)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                >
                  {LABEL_TYPE_DEMANDE[demande.typeDemande]}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold font-display leading-snug" style={{ color: "var(--text-primary)" }}>
              {demande.titre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps — détails de la demande */}
        <div className="px-6 py-5 space-y-5 flex-1">

          {/* Grille infos essentielles */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Demandeur"       value={demande.demandeur.split("@")[0]} />
            <Field label="Date de demande" value={formatDateFr(demande.dateDemande)} />
            <Field label="Montant estimé"  value={formatFCFA(demande.montant)} />
            <Field label="Date de besoin"  value={demande.dateBesoin ? formatDateFr(demande.dateBesoin) : null} />
            <Field label="Type d'achat"    value={TYPE_CONFIG[demande.typeAchat]?.label} />
            <Field label="Ligne budgétaire" value={demande.ligneBudgetaire} />
            <Field label="Fournisseur"     value={demande.fournisseur} />
            <Field label="Justification opérationnelle"
                   value={demande.justificationOp ? LABEL_JUSTIFICATION_OP[demande.justificationOp] : null} />
          </div>

          {/* Description */}
          {demande.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Description du besoin
              </p>
              <p className="text-sm leading-relaxed p-3 rounded-lg"
                 style={{ color: "var(--text-primary)", background: "var(--bg-elevated)", fontFamily: "'DM Sans', sans-serif" }}>
                {demande.description}
              </p>
            </div>
          )}

          {/* Justification */}
          {demande.justification && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Justification
              </p>
              <p className="text-sm leading-relaxed p-3 rounded-lg"
                 style={{ color: "var(--text-primary)", background: "var(--bg-elevated)", fontFamily: "'DM Sans', sans-serif" }}>
                {demande.justification}
              </p>
            </div>
          )}

          {/* Commentaire Chef existant si déjà traité */}
          {demande.commentaireChef && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Votre commentaire précédent
              </p>
              <p className="text-sm leading-relaxed p-3 rounded-lg"
                 style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)", fontFamily: "'DM Sans', sans-serif" }}>
                {demande.commentaireChef}
              </p>
            </div>
          )}
        </div>

        {/* Footer — actions de validation */}
        {(canAct ?? demande.statut === "SOUMIS") && (
          <div
            className="sticky bottom-0 px-6 py-4 flex-shrink-0 space-y-3"
            style={{ background: "var(--glass-header-bg)", borderTop: "1px solid var(--bg-border)", backdropFilter: "blur(20px)" }}
          >
            {modeRejet ? (
              <div className="space-y-2">
                <textarea
                  placeholder="Motif de rejet (requis)…"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={2}
                  className="w-full text-sm resize-none"
                  style={{
                    background:   "var(--bg-surface)",
                    border:       "1px solid rgba(239,68,68,0.30)",
                    borderRadius: "8px",
                    padding:      "8px 12px",
                    color:        "var(--text-primary)",
                    outline:      "none",
                    fontFamily:   "'DM Sans', sans-serif",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModeRejet(false); setCommentaire("") }}
                    className="flex-1 py-2 rounded-lg text-sm font-display font-medium"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => onRejeter(commentaire)}
                    disabled={isPending || !commentaire.trim()}
                    className="flex-1 py-2 rounded-lg text-sm font-display font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }}
                  >
                    {isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                    Confirmer le rejet
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setModeRejet(true)}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-display font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Rejeter
                </button>
                <button
                  onClick={() => onValider("")}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-display font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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
                  {actionLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   MissionDetailModal — popup détail + approbation mission
   ════════════════════════════════════════════════ */
function MissionDetailModal({
  mission,
  onClose,
  onApprouver,
  onRejeter,
  isPending,
}: {
  mission:     Mission
  onClose:     () => void
  onApprouver: (comment: string) => void
  onRejeter:   (comment: string) => void
  isPending:   boolean
}) {
  const [commentaire, setCommentaire] = useState("")
  const [modeRejet,   setModeRejet]   = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
    if (!value && value !== 0) return null
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5"
           style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
          {label}
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
          {String(value)}
        </p>
      </div>
    )
  }

  const statutCfg = STATUT_MISSION_CONFIG[mission.statut]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--modal-overlay)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-start justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ background: "var(--glass-header-bg)", borderBottom: "1px solid var(--bg-border)", backdropFilter: "blur(20px)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                style={{ background: statutCfg.bg, color: statutCfg.color, border: `1px solid ${statutCfg.border}` }}
              >
                {statutCfg.label}
              </span>
              <span
                className="text-xs font-display px-2 py-0.5 rounded-full"
                style={{ background: "rgba(59,130,246,0.10)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}
              >
                Ordre de mission
              </span>
            </div>
            <h2 className="text-base font-bold font-display leading-snug" style={{ color: "var(--text-primary)" }}>
              {mission.intitule}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 py-5 space-y-5 flex-1">

          {/* Infos principales */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Demandeur"      value={mission.demandeur.split("@")[0]} />
            <Field label="Date de demande" value={formatDateFr(mission.dateDemande)} />
            <Field label="Département"     value={mission.departement} />
            <Field label="Type de mission" value={LABEL_TYPE_MISSION[mission.typeMission]} />
            <Field label="Région"          value={mission.region} />
            <Field label="Lieu(x)"         value={mission.lieux} />
            <Field label="Départ"          value={formatDateFr(mission.dateDepart)} />
            <Field label="Retour"          value={formatDateFr(mission.dateRetour)} />
            <Field label="Durée"           value={`${mission.duree} jour(s)`} />
            <Field label="Moyen(s) de transport" value={mission.moyenTransport.map(k => LABEL_MOYEN_TRANSPORT_MISSION[k]).join(" / ")} />
            {mission.matricule && <Field label="Matricule véhicule" value={mission.matricule} />}
            {(mission.montantAvance ?? 0) > 0 && (
              <Field label="Avance demandée" value={formatFCFA(mission.montantAvance!)} />
            )}
          </div>

          {/* Objectif */}
          {mission.objectif && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Objectif(s)
              </p>
              <p className="text-sm leading-relaxed p-3 rounded-lg"
                 style={{ color: "var(--text-primary)", background: "var(--bg-elevated)", fontFamily: "'DM Sans', sans-serif",
                          whiteSpace: "pre-line" }}>
                {mission.objectif}
              </p>
            </div>
          )}

          {/* Prises en charge */}
          {mission.chargesIncluses && mission.chargesIncluses.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Prises en charge
              </p>
              <div className="flex flex-wrap gap-2">
                {mission.chargesIncluses.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-display px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(45,158,95,0.12)", color: "var(--green-bright)", border: "1px solid rgba(45,158,95,0.30)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          {mission.participants && mission.participants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Participants ({mission.participants.length})
              </p>
              <div className="flex flex-col gap-1">
                {mission.participants.map((p) => (
                  <p key={p} className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
                    · {p}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — actions */}
        {mission.statut === "SOUMIS" && (
          <div
            className="sticky bottom-0 px-6 py-4 flex-shrink-0 space-y-3"
            style={{ background: "var(--glass-header-bg)", borderTop: "1px solid var(--bg-border)", backdropFilter: "blur(20px)" }}
          >
            {modeRejet ? (
              <div className="space-y-2">
                <textarea
                  placeholder="Motif de rejet (requis)…"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={2}
                  className="w-full text-sm resize-none"
                  style={{
                    background:   "var(--bg-surface)",
                    border:       "1px solid rgba(239,68,68,0.30)",
                    borderRadius: "8px",
                    padding:      "8px 12px",
                    color:        "var(--text-primary)",
                    outline:      "none",
                    fontFamily:   "'DM Sans', sans-serif",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModeRejet(false); setCommentaire("") }}
                    className="flex-1 py-2 rounded-lg text-sm font-display font-medium"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => onRejeter(commentaire)}
                    disabled={isPending || !commentaire.trim()}
                    className="flex-1 py-2 rounded-lg text-sm font-display font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }}
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Confirmer le rejet
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setModeRejet(true)}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-display font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Rejeter
                </button>
                <button
                  onClick={() => onApprouver(commentaire)}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-display font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                    color:      "var(--text-inverse)",
                    boxShadow:  "0 0 10px var(--gold-glow)",
                  }}
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approuver la mission
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   ChefDeptDashboard — vue dédiée au Chef de Dept.
   ════════════════════════════════════════════════ */
function ChefDeptDashboard({ prenom }: { prenom: string }) {
  const { data: demandes = [], isLoading } = useDemandesAchats()
  const { mutate, isPending }              = useUpdateStatutDemande()
  const [demandeSelectee, setDemandeSelectee] = useState<DemandeAchat | null>(null)

  const mois  = new Date().getMonth()
  const annee = new Date().getFullYear()

  const duMois = (d: DemandeAchat) => {
    const date = new Date(d.dateValidationChef || d.dateDemande)
    return date.getMonth() === mois && date.getFullYear() === annee
  }

  // Demandes en attente de la validation du Chef (statut SOUMIS)
  const demandesEnAttente = demandes.filter((d) => d.statut === "SOUMIS")
  const valideesMois      = demandes.filter((d) => d.statut === "VALIDE_CHEF" && duMois(d))
  const rejetesMois       = demandes.filter((d) => d.statut === "REJETE"      && duMois(d))
  const montantValideMois = valideesMois.reduce((sum, d) => sum + d.montant, 0)

  function joursAttente(dateDemande: string): number {
    return Math.floor((Date.now() - new Date(dateDemande).getTime()) / (1000 * 60 * 60 * 24))
  }

  function handleValider(demande: DemandeAchat, commentaire: string) {
    mutate(
      {
        id:             demande.id,
        update:         { statut: "VALIDE_CHEF", commentaire },
        role:           "Chef Dept.",
        demandeurEmail: demande.demandeur,
        titre:          demande.titre,
      },
      { onSuccess: () => setDemandeSelectee(null) },
    )
  }

  function handleRejeter(demande: DemandeAchat, commentaire: string) {
    mutate(
      {
        id:             demande.id,
        update:         { statut: "REJETE", commentaire },
        role:           "Chef Dept.",
        demandeurEmail: demande.demandeur,
        titre:          demande.titre,
      },
      { onSuccess: () => setDemandeSelectee(null) },
    )
  }

  const kpis = [
    {
      label:  "En attente de validation",
      value:  demandesEnAttente.length,
      color:  "#ef4444",
      bg:     "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.20)",
      icon:   <Clock className="w-5 h-5" style={{ color: "#ef4444" }} />,
    },
    {
      label:  "Montant validé ce mois",
      value:  montantValideMois > 0 ? formatFCFA(montantValideMois) : "—",
      color:  "var(--gold-warm)",
      bg:     "rgba(240,165,0,0.08)",
      border: "rgba(240,165,0,0.20)",
      icon:   <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />,
      raw:    true,
    },
    {
      label:  "Validées ce mois",
      value:  valideesMois.length,
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

      {/* Modal détail */}
      {demandeSelectee && (
        <DemandeDetailModal
          demande={demandeSelectee}
          onClose={() => setDemandeSelectee(null)}
          onValider={(comment) => handleValider(demandeSelectee, comment)}
          onRejeter={(comment) => handleRejeter(demandeSelectee, comment)}
          isPending={isPending}
        />
      )}

      {/* Hero Chef */}
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
            ◉ Vue Chef de Département
          </p>
          <h2 className="font-display font-bold leading-tight mb-1.5" style={{ fontSize: 30, color: "var(--text-primary)" }}>
            Bonjour, {prenom}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "480px" }}>
            Validation N1 — Consultez et validez les demandes soumises par votre équipe.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Indicateurs
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <DashboardKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              color={kpi.color}
              bg={kpi.bg}
              border={kpi.border}
              icon={kpi.icon}
            />
          ))}
        </div>
      </div>

      {/* File de validation */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Demandes en attente de validation
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 py-6" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}

        {!isLoading && demandesEnAttente.length === 0 && (
          <div
            className="flex items-center justify-center py-10 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--green-vivid)" }} />
              <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
                Aucune demande en attente de validation
              </p>
            </div>
          </div>
        )}

        {!isLoading && demandesEnAttente.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
            {demandesEnAttente
              .sort((a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime())
              .map((demande, i) => {
                const jours   = joursAttente(demande.dateDemande)
                const urgente = jours > 3

                return (
                  <button
                    key={demande.id}
                    onClick={() => setDemandeSelectee(demande)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors duration-150"
                    style={{
                      background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                      borderBottom: "1px solid var(--bg-border)",
                      borderLeft:   urgente ? "3px solid #ef4444" : "3px solid rgba(139,92,246,0.40)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
                  >
                    {/* Icône urgence */}
                    <div className="flex-shrink-0">
                      {urgente
                        ? <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                        : <Clock className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {demande.typeDemande && (
                          <span
                            className="flex-shrink-0 text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(139,92,246,0.10)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                          >
                            {LABEL_TYPE_DEMANDE[demande.typeDemande]}
                          </span>
                        )}
                        <p className="text-sm font-display font-semibold truncate flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
                          {demande.titre}
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
                          {demande.demandeur.split("@")[0]} · {formatDateFr(demande.dateDemande)}
                        </p>
                        <span className="text-xs font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                          {formatFCFA(demande.montant)}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                        color:      "var(--text-inverse)",
                      }}
                    >
                      Voir <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      {/* Modules */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Accès rapide
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ALL_MODULES.map((mod, index) => (
            <ModuleCard key={mod.path} {...mod} index={index} />
          ))}
        </div>
      </div>

    </div>
  )
}

/* ════════════════════════════════════════════════
   ComptableDashboard — vue dédiée au Comptable
   ════════════════════════════════════════════════ */
function ComptableDashboard({ prenom }: { prenom: string }) {
  const { data: demandes = [], isLoading } = useDemandesAchats()
  const { mutate, isPending }              = useUpdateStatutDemande()

  const aTraiter               = demandes.filter((d) => d.statut === "APPROUVE")
  const enPaiement             = demandes.filter((d) => d.statut === "EN_PAIEMENT")
  const soldees                = demandes.filter((d) => d.statut === "SOLDE")
  const volumeATraiter         = aTraiter.reduce((sum, d) => sum + d.montant, 0)
  const totalPiecesCaisse      = demandes.filter((d) => d.typeDemande === "PIECE_CAISSE").reduce((sum, d) => sum + d.montant, 0)
  const totalAchatsPrestations = demandes.filter((d) => d.typeDemande === "ACHAT_PRESTATION").reduce((sum, d) => sum + d.montant, 0)

  const kpis = [
    {
      label:  "À traiter",
      value:  aTraiter.length,
      color:  "#ef4444",
      bg:     "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.20)",
      icon:   <Clock className="w-5 h-5" style={{ color: "#ef4444" }} />,
    },
    {
      label:  "Volume à traiter",
      value:  volumeATraiter > 0 ? formatFCFA(volumeATraiter) : "—",
      color:  "var(--gold-warm)",
      bg:     "rgba(240,165,0,0.08)",
      border: "rgba(240,165,0,0.20)",
      icon:   <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />,
    },
    {
      label:  "En paiement",
      value:  enPaiement.length,
      color:  "#3b82f6",
      bg:     "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.20)",
      icon:   <CheckCircle className="w-5 h-5" style={{ color: "#3b82f6" }} />,
    },
    {
      label:  "Soldées",
      value:  soldees.length,
      color:  "#22c55e",
      bg:     "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.20)",
      icon:   <CheckCircle className="w-5 h-5" style={{ color: "#22c55e" }} />,
    },
    {
      label:  "Total pièces de caisse",
      value:  totalPiecesCaisse > 0 ? formatFCFA(totalPiecesCaisse) : "—",
      color:  "#8b5cf6",
      bg:     "rgba(139,92,246,0.08)",
      border: "rgba(139,92,246,0.20)",
      icon:   <Wallet className="w-5 h-5" style={{ color: "#8b5cf6" }} />,
    },
    {
      label:  "Total achats & prestations",
      value:  totalAchatsPrestations > 0 ? formatFCFA(totalAchatsPrestations) : "—",
      color:  "var(--gold-warm)",
      bg:     "rgba(240,165,0,0.08)",
      border: "rgba(240,165,0,0.20)",
      icon:   <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />,
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Hero */}
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
            ◉ Vue Comptable
          </p>
          <h2 className="font-display font-bold leading-tight mb-1.5" style={{ fontSize: 30, color: "var(--text-primary)" }}>
            Bonjour, {prenom}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "480px" }}>
            Paiements en attente de traitement — GIW'ANVO Energy
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Indicateurs paiements
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <DashboardKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              color={kpi.color}
              bg={kpi.bg}
              border={kpi.border}
              icon={kpi.icon}
            />
          ))}
        </div>
      </div>

      {/* Demandes approuvées par la DG — à mettre en paiement */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Demandes approuvées — en attente de paiement
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 py-6" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}

        {!isLoading && aTraiter.length === 0 && (
          <div
            className="flex items-center justify-center py-10 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--green-vivid)" }} />
              <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
                Aucune demande en attente de paiement
              </p>
            </div>
          </div>
        )}

        {!isLoading && aTraiter.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--bg-border)" }}>
            {aTraiter
              .sort((a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime())
              .map((demande, i) => (
                <div
                  key={demande.id}
                  className="px-5 py-4 flex items-center gap-4 flex-wrap"
                  style={{
                    background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                    borderBottom: "1px solid var(--bg-border)",
                    borderLeft:   "3px solid rgba(34,197,94,0.60)",
                  }}
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#22c55e" }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {demande.typeDemande && (
                        <span
                          className="flex-shrink-0 text-xs font-display font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(139,92,246,0.10)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                        >
                          {LABEL_TYPE_DEMANDE[demande.typeDemande]}
                        </span>
                      )}
                      <p className="text-sm font-display font-semibold truncate flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
                        {demande.titre}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {demande.demandeur.split("@")[0]} · {formatDateFr(demande.dateDemande)}
                      </p>
                      <span className="text-xs font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                        {formatFCFA(demande.montant)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      mutate({
                        id:             demande.id,
                        update:         { statut: "EN_PAIEMENT", commentaire: "" },
                        role:           "Comptable",
                        demandeurEmail: demande.demandeur,
                        titre:          demande.titre,
                      })
                    }
                    disabled={isPending}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                      color:      "var(--text-inverse)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
                  >
                    {isPending
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <CheckCircle className="w-3 h-3" />
                    }
                    <span className="hidden sm:inline">Mettre en paiement</span>
                    <span className="sm:hidden">Payer</span>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modules */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4 font-display" style={{ color: "var(--green-mid)" }}>
          Accès rapide
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ALL_MODULES.map((mod, index) => (
            <ModuleCard key={mod.path} {...mod} index={index} />
          ))}
        </div>
      </div>

    </div>
  )
}

/* ── Sous-titre selon le rôle ── */
const ROLE_SUBTITLE: Partial<Record<UserRole, string>> = {
  "Employé":   "Gérez vos demandes personnelles — congés, missions, achats.",
  "Chef Dept.": "Pilotez votre équipe — validations, demandes et suivi de département.",
  "RAF":        "Supervision financière et RH — pilotage global de l'activité.",
  "Comptable":  "Comptabilité et trésorerie — saisie, journaux et rapprochements.",
  "Directrice": "Vue Direction — GIW'ANVO Energy · Supervision et approbations.",
}

/* ════════════════════════════════════════════════
   Page principale — Dashboard standard
   ════════════════════════════════════════════════ */
export default function HomePage() {
  const { user: currentUser, role, isLoading } = useCurrentUser()
  const firstName = currentUser?.displayName.split(" ")[0] ?? "vous"

  /* Filtrage des modules accessibles selon le rôle */
  const modules = useMemo(
    () => role ? ALL_MODULES.filter((m) => canAccessModule(role, m.module)) : ALL_MODULES,
    [role],
  )

  // Dashboard dédié pour la Directrice
  if (!isLoading && role === "Directrice") {
    return <DirectriceDashboard prenom={firstName} />
  }

  // Dashboard dédié pour le Chef de Département
  if (!isLoading && role === "Chef Dept.") {
    return <ChefDeptDashboard prenom={firstName} />
  }

  // Dashboard dédié pour le Comptable
  if (!isLoading && role === "Comptable") {
    return <ComptableDashboard prenom={firstName} />
  }

  const subtitle = (role && ROLE_SUBTITLE[role]) ??
    "Gérez vos procédures administratives et financières en toute simplicité."

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
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Grille des modules accessibles ── */}
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

    </div>
  )
}
