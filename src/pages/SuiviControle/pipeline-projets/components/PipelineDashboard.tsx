import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  AlertTriangle,
  Activity,
  Sun,
  DollarSign,
  TrendingUp,
  Clock,
  Briefcase,
  Zap,
  BarChart3,
  MapPin,
  Calendar,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { useProjets } from "@/hooks/usePipeline"
import {
  PHASE_COLORS,
  PHASES_PIPELINE,
  formatFCFA,
  formatKwp,
} from "@/types/pipeline"
import type { PhaseProjet, BusinessModel } from "@/types/pipeline"

// ─── Labels courts pour l'axe X du graphique phases ──────────────────────────

const PHASE_SHORT: Record<PhaseProjet, string> = {
  "Prospect":             "Prospect",
  "Étude de faisabilité": "Étude",
  "Offre soumise":        "Offre",
  "Négociation":          "Négo.",
  "Contrat signé":        "Contrat",
  "En développement":     "Dév.",
  "Construction":         "Const.",
  "En exploitation":      "Exploit.",
  "Abandonné":            "Abandonné",
}

// ─── Couleurs par business model ──────────────────────────────────────────────

const BM_COLORS: Record<BusinessModel, string> = {
  "ERD":            "#2d9e5f",
  "Client direct":  "#f0a500",
  "Institutionnel": "#60a5fa",
  "PPP":            "#a78bfa",
  "Autre":          "#9ca3af",
}

// ─── Tooltip recharts personnalisé ────────────────────────────────────────────

interface TooltipPayload {
  value:   number
  name?:   string
  payload?: { color?: string }
}
interface ChartTooltipProps {
  active?:  boolean
  payload?: TooltipPayload[]
  label?:   string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div
      style={{
        background:   "#0d1a10",
        border:       "1px solid #1e3528",
        borderRadius: 10,
        padding:      "8px 12px",
        fontSize:     12,
      }}
    >
      {label && (
        <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
      )}
      <p style={{ color: item.payload?.color ?? "#f0a500", fontWeight: 600 }}>
        {item.value} projet{Number(item.value) !== 1 ? "s" : ""}
      </p>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label:       string
  value:       string | number
  icon:        React.ElementType
  color:       string
  bgColor:     string
  borderColor: string
  sublabel?:   string
}

function KpiCard({ label, value, icon: Icon, color, bgColor, borderColor, sublabel }: KpiProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background:     "rgba(13,26,16,0.7)",
        backdropFilter: "blur(12px)",
        border:         `1px solid ${borderColor}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p
          className="text-3xl font-extrabold leading-none mb-1"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
        >
          {value}
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Carte graphique ──────────────────────────────────────────────────────────

interface ChartCardProps {
  title:    string
  icon:     React.ElementType
  children: React.ReactNode
}

function ChartCard({ title, icon: Icon, children }: ChartCardProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background:     "rgba(13,26,16,0.7)",
        backdropFilter: "blur(12px)",
        border:         "1px solid #1e3528",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} style={{ color: "#2d9e5f" }} />
        <h3
          className="font-semibold text-sm"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PipelineDashboard() {
  const { data: projets = [], isLoading, isError, refetch } = useProjets()

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const in30  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const total        = projets.length
    const actifs       = projets.filter((p) => p.statut === "Actif").length
    const critiques    = projets.filter(
      (p) => p.priorite === "Critique" || p.statut === "Critique",
    ).length
    const exploitation = projets.filter((p) => p.phase === "En exploitation").length
    const totalKwp     = projets.reduce((s, p) => s + (p.puissanceKwp ?? 0), 0)
    const enRetard     = projets.filter(
      (p) =>
        p.dateProchaineEtape &&
        p.dateProchaineEtape < today &&
        p.statut !== "Terminé" &&
        p.phase  !== "Abandonné",
    ).length
    const totalFinancement = projets
      .filter((p) => p.financementNecessaire)
      .reduce((s, p) => s + (p.montantFinancement ?? 0), 0)
    const totalRevenus = projets.reduce((s, p) => s + (p.revenusAnnuelsPrevus ?? 0), 0)

    // Données graphique phases
    const phasesData = PHASES_PIPELINE
      .filter((ph) => ph !== "Abandonné")
      .map((ph) => ({
        phase: ph,
        label: PHASE_SHORT[ph],
        count: projets.filter((p) => p.phase === ph).length,
        color: PHASE_COLORS[ph].text,
      }))

    // Données graphique business model
    const bmMap: Partial<Record<BusinessModel, number>> = {}
    for (const p of projets) {
      bmMap[p.businessModel] = (bmMap[p.businessModel] ?? 0) + 1
    }
    const bmData = (Object.entries(bmMap) as [BusinessModel, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: BM_COLORS[name] ?? "#9ca3af",
      }))
      .sort((a, b) => b.value - a.value)

    // Top régions
    const regionMap: Record<string, number> = {}
    for (const p of projets) {
      if (p.region) regionMap[p.region] = (regionMap[p.region] ?? 0) + 1
    }
    const regionsData = Object.entries(regionMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    // Échéances dans les 30 prochains jours
    const prochaines = projets
      .filter(
        (p) =>
          p.dateProchaineEtape &&
          p.dateProchaineEtape >= today &&
          p.dateProchaineEtape <= in30 &&
          p.statut !== "Terminé",
      )
      .sort((a, b) => a.dateProchaineEtape.localeCompare(b.dateProchaineEtape))
      .slice(0, 8)

    // Points d'attention
    const alertes = projets
      .filter((p) => {
        const retard = p.dateProchaineEtape && p.dateProchaineEtape < today
        return (
          (p.priorite === "Critique" || p.statut === "Critique" || retard) &&
          p.phase  !== "Abandonné" &&
          p.statut !== "Terminé"
        )
      })
      .slice(0, 5)

    return {
      total,
      actifs,
      critiques,
      exploitation,
      totalKwp,
      enRetard,
      totalFinancement,
      totalRevenus,
      phasesData,
      bmData,
      regionsData,
      prochaines,
      alertes,
    }
  }, [projets])

  /* ── États de chargement ────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Chargement du pipeline…
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
        style={{
          background: "rgba(239,68,68,0.05)",
          border:     "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <AlertTriangle size={32} style={{ color: "#ef4444" }} />
        <div className="text-center">
          <p className="font-semibold" style={{ color: "#f87171" }}>
            Impossible de charger les projets
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Vérifiez votre connexion et les permissions SharePoint
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            background: "rgba(45,158,95,0.12)",
            border:     "1px solid rgba(45,158,95,0.3)",
            color:      "#2d9e5f",
          }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  if (projets.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.5)", border: "1px dashed #1e3528" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "rgba(240,165,0,0.1)",
            border:     "1px solid rgba(240,165,0,0.2)",
          }}
        >
          <Zap size={28} style={{ color: "#f0a500" }} />
        </div>
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
        >
          Aucun projet dans le pipeline
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Les projets SharePoint apparaîtront automatiquement ici
        </p>
      </div>
    )
  }

  /* ── Rendu principal ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">

      {/* KPI — Rangée 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total projets"
          value={stats.total}
          icon={Briefcase}
          color="#2d9e5f"
          bgColor="rgba(45,158,95,0.12)"
          borderColor="rgba(45,158,95,0.25)"
        />
        <KpiCard
          label="Projets actifs"
          value={stats.actifs}
          icon={Activity}
          color="#60a5fa"
          bgColor="rgba(59,130,246,0.12)"
          borderColor="rgba(59,130,246,0.25)"
          sublabel={`${stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total`}
        />
        <KpiCard
          label="Critiques"
          value={stats.critiques}
          icon={AlertTriangle}
          color="#f87171"
          bgColor="rgba(239,68,68,0.12)"
          borderColor="rgba(239,68,68,0.25)"
        />
        <KpiCard
          label="En exploitation"
          value={stats.exploitation}
          icon={Sun}
          color="#22c55e"
          bgColor="rgba(34,197,94,0.12)"
          borderColor="rgba(34,197,94,0.25)"
        />
      </div>

      {/* KPI — Rangée 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Puissance totale"
          value={stats.totalKwp > 0 ? formatKwp(stats.totalKwp) : "—"}
          icon={Zap}
          color="#f0a500"
          bgColor="rgba(240,165,0,0.12)"
          borderColor="rgba(240,165,0,0.25)"
        />
        <KpiCard
          label="Financement nécessaire"
          value={stats.totalFinancement > 0 ? formatFCFA(stats.totalFinancement) : "—"}
          icon={DollarSign}
          color="#a78bfa"
          bgColor="rgba(139,92,246,0.12)"
          borderColor="rgba(139,92,246,0.25)"
        />
        <KpiCard
          label="Revenus prévus / an"
          value={stats.totalRevenus > 0 ? formatFCFA(stats.totalRevenus) : "—"}
          icon={TrendingUp}
          color="#34d399"
          bgColor="rgba(16,185,129,0.12)"
          borderColor="rgba(16,185,129,0.25)"
        />
        <KpiCard
          label="Projets en retard"
          value={stats.enRetard}
          icon={Clock}
          color={stats.enRetard > 0 ? "#fbbf24" : "#9ca3af"}
          bgColor={
            stats.enRetard > 0
              ? "rgba(245,158,11,0.12)"
              : "rgba(107,114,128,0.12)"
          }
          borderColor={
            stats.enRetard > 0
              ? "rgba(245,158,11,0.25)"
              : "rgba(107,114,128,0.25)"
          }
        />
      </div>

      {/* Graphiques — Rangée 1 : phases + business model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Pipeline par phase" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.phasesData}
              margin={{ top: 5, right: 10, bottom: 5, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#7a9e87", fontSize: 11 }}
                axisLine={{ stroke: "#1e3528" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#7a9e87", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="projets">
                {stats.phasesData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition par business model" icon={Activity}>
          {stats.bmData.length === 0 ? (
            <div
              className="flex items-center justify-center h-52"
              style={{ color: "var(--text-muted)", fontSize: 13 }}
            >
              Aucun business model renseigné
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.bmData}
                  cx="45%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.bmData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]
                    const col =
                      (d.payload as { color?: string } | undefined)?.color ??
                      "#f0a500"
                    return (
                      <div
                        style={{
                          background:   "#0d1a10",
                          border:       "1px solid #1e3528",
                          borderRadius: 10,
                          padding:      "8px 12px",
                          fontSize:     12,
                        }}
                      >
                        <p style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
                          {d.name}
                        </p>
                        <p style={{ color: col, fontWeight: 600 }}>
                          {d.value} projet{Number(d.value) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span
                      style={{ color: "var(--text-secondary)", fontSize: 12 }}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Graphiques — Rangée 2 : régions + échéances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Projets par région" icon={MapPin}>
          {stats.regionsData.length === 0 ? (
            <div
              className="flex items-center justify-center h-52"
              style={{ color: "var(--text-muted)", fontSize: 13 }}
            >
              Aucune région renseignée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, stats.regionsData.length * 32)}>
              <BarChart
                data={stats.regionsData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#7a9e87", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#7a9e87", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                  dataKey="count"
                  name="projets"
                  radius={[0, 6, 6, 0]}
                  fill="#f0a500"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Prochaines échéances (30 jours)" icon={Calendar}>
          {stats.prochaines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-2">
              <Calendar size={24} style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Aucune échéance dans les 30 prochains jours
              </p>
            </div>
          ) : (
            <div className="space-y-0 max-h-52 overflow-y-auto pr-1">
              {stats.prochaines.map((p) => {
                const parts   = p.dateProchaineEtape.split("-")
                const dateStr = parts.length === 3
                  ? `${parts[2]}/${parts[1]}/${parts[0]}`
                  : p.dateProchaineEtape
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b"
                    style={{ borderColor: "#1e3528" }}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color:      "var(--text-primary)",
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {p.codeProjet ? `[${p.codeProjet}] ` : ""}
                        {p.titre || "Sans nom"}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.region || "—"} · {p.phase}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold flex-shrink-0"
                      style={{ color: "#f0a500", fontFamily: "'Syne', sans-serif" }}
                    >
                      {dateStr}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Points d'attention */}
      {stats.alertes.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(239,68,68,0.05)",
            border:     "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} style={{ color: "#ef4444" }} />
            <h3
              className="font-semibold text-sm"
              style={{ fontFamily: "'Syne', sans-serif", color: "#f87171" }}
            >
              Points d'attention ({stats.alertes.length})
            </h3>
          </div>
          <div className="space-y-2">
            {stats.alertes.map((p) => {
              const today  = new Date().toISOString().slice(0, 10)
              const retard =
                p.dateProchaineEtape && p.dateProchaineEtape < today
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border:     "1px solid rgba(239,68,68,0.15)",
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color:      "var(--text-primary)",
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {p.codeProjet ? `[${p.codeProjet}] ` : ""}
                      {p.titre || "Projet sans nom"}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {p.region || "—"} · {p.phase}
                      {retard && (
                        <span
                          style={{ color: "#fbbf24", marginLeft: "0.5rem" }}
                        >
                          · Étape dépassée
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(p.priorite === "Critique" || p.statut === "Critique") && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "rgba(239,68,68,0.15)",
                          color:      "#f87171",
                          border:     "1px solid rgba(239,68,68,0.35)",
                        }}
                      >
                        Critique
                      </span>
                    )}
                    {retard && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color:      "#fbbf24",
                          border:     "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        En retard
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
