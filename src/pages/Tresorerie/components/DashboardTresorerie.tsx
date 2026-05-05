import { useMemo } from "react"
import {
  TrendingUp, TrendingDown, BarChart2, Target,
  AlertTriangle, AlertCircle, Loader2, Hash,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts"
import { useTresorerieTransactions } from "@/hooks/useTresorerieTransactions"
import { useTresorerieBudgets } from "@/hooks/useTresorerieBudgets"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { formatFCFA } from "@/lib/utils"

/* Formate un nombre pour les axes — ex: 1500000 → "1,5M" */
function axeLabel(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace(".", ",") + "M"
  if (val >= 1_000)     return (val / 1_000).toFixed(0) + "K"
  return String(val)
}

const COULEURS_CATEGORIES: Record<string, string> = {
  "General":          "#2d9e5f",
  "Project Specific": "#f0a500",
  "Production":       "#3b82f6",
}

const MOIS_COURTS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]
const MOIS_LONGS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

function SectionHeader({ titre, soustitre }: { titre: string; soustitre?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "0.02em" }}>
        {titre}
      </h2>
      {soustitre && (
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{soustitre}</p>
      )}
      <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
    </div>
  )
}

export function DashboardTresorerie() {
  const { data: transactions = [], isLoading: loadTrans } = useTresorerieTransactions()
  const { data: budgets      = [], isLoading: loadBudget } = useTresorerieBudgets()
  const { data: projects     = [] }                        = useTresorerieProjects()
  const { data: types        = [] }                        = useTresorerieTypesDepenses()

  const maintenant    = new Date()
  const anneeCourante = maintenant.getFullYear()
  const moisCourant   = maintenant.getMonth() + 1

  const isLoading = loadTrans || loadBudget

  /* ── KPI mensuels (mois courant) ── */
  const kpiMensuels = useMemo(() => {
    const duMois = transactions.filter((t) => t.mois === moisCourant && t.annee === anneeCourante)
    const cashIn  = duMois.filter((t) => t.typeFlux === "Cash In") .reduce((s, t) => s + t.montantLocal, 0)
    const cashOut = duMois.filter((t) => t.typeFlux === "Cash Out").reduce((s, t) => s + t.montantLocal, 0)
    return { cashIn, cashOut, net: cashIn - cashOut, count: duMois.length }
  }, [transactions, moisCourant, anneeCourante])

  /* ── KPI annuels ── */
  const kpiAnnuels = useMemo(() => {
    const annee = transactions.filter((t) => t.annee === anneeCourante)
    const cashIn  = annee.filter((t) => t.typeFlux === "Cash In") .reduce((s, t) => s + t.montantLocal, 0)
    const cashOut = annee.filter((t) => t.typeFlux === "Cash Out").reduce((s, t) => s + t.montantLocal, 0)

    const totalBudgete = budgets
      .filter((b) => b.annee === anneeCourante && b.statutBudget === "Validé")
      .reduce((s, b) => s + b.montantBudgete, 0)
    const totalReel = annee
      .filter((t) => t.typeFlux === "Cash Out" && (t.statutTransaction === "Réel" || t.statutTransaction === "Validé"))
      .reduce((s, t) => s + t.montantLocal, 0)

    return {
      cashIn,
      cashOut,
      net:           cashIn - cashOut,
      tauxExecution: totalBudgete > 0 ? (totalReel / totalBudgete) * 100 : null,
      totalBudgete,
    }
  }, [transactions, budgets, anneeCourante])

  /* ── Tendance 6 mois ── */
  const tendance6Mois = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(anneeCourante, moisCourant - 1 - (5 - i))
      const m  = d.getMonth() + 1
      const a  = d.getFullYear()
      const duMois = transactions.filter((t) => t.mois === m && t.annee === a)
      return {
        label:   MOIS_COURTS[m - 1],
        "Cash In":  duMois.filter((t) => t.typeFlux === "Cash In") .reduce((s, t) => s + t.montantLocal, 0),
        "Cash Out": duMois.filter((t) => t.typeFlux === "Cash Out").reduce((s, t) => s + t.montantLocal, 0),
      }
    })
  }, [transactions, anneeCourante, moisCourant])

  /* ── Répartition Cash Out par catégorie (année courante) ── */
  const repartitionCategories = useMemo(() => {
    const cashOutAnnee = transactions.filter(
      (t) => t.annee === anneeCourante && t.typeFlux === "Cash Out" &&
             (t.statutTransaction === "Réel" || t.statutTransaction === "Validé"),
    )
    const byCategorie: Record<string, number> = {}
    cashOutAnnee.forEach((t) => {
      byCategorie[t.categorieGlobale] = (byCategorie[t.categorieGlobale] ?? 0) + t.montantLocal
    })
    return Object.entries(byCategorie).map(([name, value]) => ({
      name,
      value,
      couleur: COULEURS_CATEGORIES[name] ?? "#7a9e87",
    }))
  }, [transactions, anneeCourante])

  /* ── Top 5 projets consommateurs ── */
  const top5Projets = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p.nom]))
    /* Toutes les Cash Out de l'année — tous statuts confondus — ayant un projet résolvable */
    const cashOutReel = transactions.filter(
      (t) => t.annee === anneeCourante && t.typeFlux === "Cash Out" &&
             (t.projetId ?? t.projetNom),
    )
    const byProjet: Record<string, { nom: string; montant: number }> = {}
    cashOutReel.forEach((t) => {
      const cle = t.projetId ?? t.projetNom ?? "—"
      const nom = t.projetNom || (t.projetId ? (projectMap.get(t.projetId) ?? t.projetId) : "—")
      byProjet[cle] = { nom, montant: (byProjet[cle]?.montant ?? 0) + t.montantLocal }
    })
    return Object.values(byProjet).sort((a, b) => b.montant - a.montant).slice(0, 5)
  }, [transactions, projects, anneeCourante])

  /* ── Top 5 types de dépenses ── */
  const top5Types = useMemo(() => {
    const typeMap = new Map(types.map((t) => [t.id, t.nom]))
    /* Toutes les Cash Out de l'année — tous statuts confondus — ayant un type de dépense résolvable */
    const cashOutReel = transactions.filter(
      (t) => t.annee === anneeCourante && t.typeFlux === "Cash Out" &&
             (t.typeDepenseId ?? t.typeDepenseNom),
    )
    const byType: Record<string, { nom: string; montant: number }> = {}
    cashOutReel.forEach((t) => {
      /* Clé = ID si disponible (plus précis), sinon nom SP direct */
      const cle = t.typeDepenseId ?? t.typeDepenseNom ?? "—"
      const nom = t.typeDepenseNom || (t.typeDepenseId ? (typeMap.get(t.typeDepenseId) ?? t.typeDepenseId) : "—")
      byType[cle] = { nom, montant: (byType[cle]?.montant ?? 0) + t.montantLocal }
    })
    return Object.values(byType).sort((a, b) => b.montant - a.montant).slice(0, 5)
  }, [transactions, types, anneeCourante])

  /* ── Alertes automatiques ── */
  const alertes = useMemo(() => {
    const liste: { niveau: "critique" | "attention"; message: string }[] = []

    if (kpiAnnuels.net < 0) {
      liste.push({
        niveau: "critique",
        message: `Alerte trésorerie : déficit annuel estimé à ${formatFCFA(Math.abs(kpiAnnuels.net))}`,
      })
    }

    const previsions = transactions.filter(
      (t) => t.statutTransaction === "Prévision" && new Date(t.dateTransaction) < maintenant,
    )
    if (previsions.length > 0) {
      liste.push({
        niveau: "attention",
        message: `${previsions.length} transaction${previsions.length > 1 ? "s" : ""} en statut Prévision avec une date dépassée — à confirmer`,
      })
    }

    if (kpiAnnuels.tauxExecution !== null && kpiAnnuels.tauxExecution > 100) {
      liste.push({
        niveau: "critique",
        message: `Alerte budget : taux d'exécution à ${Math.round(kpiAnnuels.tauxExecution)}% — budget dépassé`,
      })
    } else if (kpiAnnuels.tauxExecution !== null && kpiAnnuels.tauxExecution > 85) {
      liste.push({
        niveau: "attention",
        message: `Budget proche du seuil : taux d'exécution à ${Math.round(kpiAnnuels.tauxExecution)}%`,
      })
    }

    return liste
  }, [kpiAnnuels, transactions, maintenant])

  const kpiCardsAnnuels = [
    { label: "Cash In",   value: formatFCFA(kpiAnnuels.cashIn),   couleur: "#22c55e", bg: "rgba(34,197,94,0.08)",   icon: <TrendingUp  size={15} /> },
    { label: "Cash Out",  value: formatFCFA(kpiAnnuels.cashOut),  couleur: "#ef4444", bg: "rgba(239,68,68,0.08)",  icon: <TrendingDown size={15} /> },
    {
      label: "Net cashflow",
      value: (kpiAnnuels.net >= 0 ? "+" : "") + formatFCFA(kpiAnnuels.net),
      couleur: kpiAnnuels.net >= 0 ? "#22c55e" : "#ef4444",
      bg:     kpiAnnuels.net >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      icon: <BarChart2 size={15} />,
    },
    {
      label:   "Taux d'exécution",
      value:   kpiAnnuels.tauxExecution !== null ? `${Math.round(kpiAnnuels.tauxExecution)}%` : "—",
      couleur: kpiAnnuels.tauxExecution === null ? "var(--text-muted)"
             : kpiAnnuels.tauxExecution > 100   ? "#ef4444"
             : kpiAnnuels.tauxExecution > 85    ? "#f59e0b"
             : "#22c55e",
      bg: "rgba(240,165,0,0.08)",
      icon: <Target size={15} />,
    },
  ]

  const kpiCardsMensuels = [
    { label: "Cash In",    value: formatFCFA(kpiMensuels.cashIn),  couleur: "#22c55e", bg: "rgba(34,197,94,0.08)",  icon: <TrendingUp  size={15} /> },
    { label: "Cash Out",   value: formatFCFA(kpiMensuels.cashOut), couleur: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: <TrendingDown size={15} /> },
    {
      label: "Net cashflow",
      value: (kpiMensuels.net >= 0 ? "+" : "") + formatFCFA(kpiMensuels.net),
      couleur: kpiMensuels.net >= 0 ? "#22c55e" : "#ef4444",
      bg:     kpiMensuels.net >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      icon: <BarChart2 size={15} />,
    },
    { label: "Transactions", value: String(kpiMensuels.count), couleur: "var(--gold-warm)", bg: "rgba(240,165,0,0.08)", icon: <Hash size={15} /> },
  ]

  const tooltipStyle = {
    contentStyle: {
      background: "#122018",
      border: "1px solid #1e3528",
      borderRadius: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 12,
    },
    labelStyle:   { color: "#e8f0eb", fontWeight: 600 },
    itemStyle:    { color: "#7a9e87" },
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "64px 0", justifyContent: "center" }}>
        <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement du dashboard…</span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alertes.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10,
                background: a.niveau === "critique" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${a.niveau === "critique" ? "rgba(239,68,68,0.30)" : "rgba(245,158,11,0.30)"}`,
              }}
            >
              {a.niveau === "critique"
                ? <AlertCircle  size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
                : <AlertTriangle size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
              }
              <p style={{ margin: 0, fontSize: 12, fontFamily: "var(--font-body)", color: a.niveau === "critique" ? "#ef4444" : "#f59e0b" }}>
                {a.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Synthèse annuelle ── */}
      <div>
        <SectionHeader titre={`Synthèse annuelle — ${anneeCourante}`} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {kpiCardsAnnuels.map(({ label, value, couleur, bg, icon }) => (
            <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ color: couleur, display: "flex", padding: 5, borderRadius: 6, background: bg }}>{icon}</span>
                <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              </div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)", color: couleur }}>{value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Année {anneeCourante}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Synthèse mensuelle ── */}
      <div>
        <SectionHeader titre={`Synthèse de ${MOIS_LONGS[moisCourant - 1]} ${anneeCourante}`} soustitre="mois en cours" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {kpiCardsMensuels.map(({ label, value, couleur, bg, icon }) => (
            <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ color: couleur, display: "flex", padding: 5, borderRadius: 6, background: bg }}>{icon}</span>
                <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              </div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: couleur }}>{isLoading ? "—" : value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Graphiques ── */}
      <div>
        <SectionHeader titre="Analyse des flux" soustitre="6 derniers mois · répartition par catégorie" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Tendance 6 mois */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Tendance cashflow — 6 mois
          </h3>
          {transactions.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-body)" }}>Pas encore de données</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tendance6Mois} barCategoryGap="30%" barGap={4}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#7a9e87", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={axeLabel}
                  tick={{ fill: "#7a9e87", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={false} tickLine={false} width={48}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatFCFA(value), name]}
                  {...tooltipStyle}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: "#7a9e87", paddingTop: 8 }}
                />
                <Bar dataKey="Cash In"  fill="#2d9e5f" radius={[4,4,0,0]} />
                <Bar dataKey="Cash Out" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition Cash Out */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Répartition Cash Out par catégorie
          </h3>
          {repartitionCategories.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-body)" }}>Pas encore de données</p>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Conteneur de taille fixe — ResponsiveContainer 100%/100% évite l'avertissement Recharts */}
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={repartitionCategories}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#0d1a10"
                    >
                      {repartitionCategories.map((entry, index) => (
                        <Cell key={index} fill={entry.couleur} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatFCFA(value), ""]}
                      {...tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Légende manuelle à droite */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {repartitionCategories.map(({ name, value, couleur }) => {
                  const total = repartitionCategories.reduce((s, r) => s + r.value, 0)
                  const pct   = total > 0 ? Math.round((value / total) * 100) : 0
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: couleur, flexShrink: 0 }} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                          {formatFCFA(value)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top consommateurs ── */}
      <div>
        <SectionHeader titre="Top consommateurs" soustitre={`année ${anneeCourante} — tous statuts`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Top 5 projets */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Top projets consommateurs
          </h3>
          {top5Projets.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-body)" }}>Aucune donnée projet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top5Projets.map(({ nom, montant }, i) => {
                const max = top5Projets[0].montant
                const pct = max > 0 ? (montant / max) * 100 : 0
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{nom}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#ef4444", fontFamily: "var(--font-display)", fontWeight: 700, whiteSpace: "nowrap" }}>{formatFCFA(montant)}</p>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "var(--bg-border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #ef4444, #f97316)", borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top 5 types de dépenses */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Top types de dépenses
          </h3>
          {top5Types.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-body)" }}>Aucune donnée type de dépense</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top5Types.map(({ nom, montant }, i) => {
                const max = top5Types[0].montant
                const pct = max > 0 ? (montant / max) * 100 : 0
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{nom}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#f0a500", fontFamily: "var(--font-display)", fontWeight: 700, whiteSpace: "nowrap" }}>{formatFCFA(montant)}</p>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "var(--bg-border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #f0a500, #ffc235)", borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
