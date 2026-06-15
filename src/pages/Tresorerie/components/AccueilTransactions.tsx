import { useMemo } from "react"
import { Plus, BarChart2, PieChart, TrendingUp, TrendingDown, Hash } from "lucide-react"
import { useTresorerieTransactions } from "@/hooks/useTresorerieTransactions"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import { TYPE_FLUX_CONFIG, STATUT_TRANSACTION_CONFIG } from "@/types/tresorerieTransactions"

interface Props {
  peutCreer:             boolean
  onNouvelleTransaction: () => void
  onVoirTout:            () => void
  onVoirBudgets:         () => void
  onVoirDashboard:       () => void
}

export function AccueilTransactions({
  peutCreer,
  onNouvelleTransaction,
  onVoirTout,
  onVoirBudgets,
  onVoirDashboard,
}: Props) {
  const { data: transactions = [], isLoading } = useTresorerieTransactions()
  const { data: projects     = [] }            = useTresorerieProjects()
  const { data: types        = [] }            = useTresorerieTypesDepenses()

  const maintenant    = new Date()
  const moisCourant   = maintenant.getMonth() + 1
  const anneeCourante = maintenant.getFullYear()

  /* KPI du mois courant */
  const kpi = useMemo(() => {
    const duMois  = transactions.filter((t) => t.mois === moisCourant && t.annee === anneeCourante)
    const cashIn  = duMois.filter((t) => t.typeFlux === "Cash In") .reduce((s, t) => s + t.montantLocal, 0)
    const cashOut = duMois.filter((t) => t.typeFlux === "Cash Out").reduce((s, t) => s + t.montantLocal, 0)
    return { cashIn, cashOut, net: cashIn - cashOut, count: duMois.length }
  }, [transactions, moisCourant, anneeCourante])

  /* 5 dernières transactions avec résolution des lookups */
  const dernieres = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p.nom]))
    const typeMap    = new Map(types.map((t)    => [t.id, t.nom]))
    return transactions.slice(0, 5).map((t) => ({
      ...t,
      projetNom:      t.projetNom      || (t.projetId      ? (projectMap.get(t.projetId)      ?? "—") : undefined),
      typeDepenseNom: t.typeDepenseNom || (t.typeDepenseId  ? (typeMap.get(t.typeDepenseId)    ?? "—") : undefined),
    }))
  }, [transactions, projects, types])

  const netPositif = kpi.net >= 0

  const kpiCards = [
    {
      label:   "Cash In (mois en cours)",
      value:   formatFCFA(kpi.cashIn),
      couleur: "#22c55e",
      bg:      "rgba(34,197,94,0.08)",
      icon:    <TrendingUp  size={15} />,
    },
    {
      label:   "Cash Out (mois en cours)",
      value:   formatFCFA(kpi.cashOut),
      couleur: "#ef4444",
      bg:      "rgba(239,68,68,0.08)",
      icon:    <TrendingDown size={15} />,
    },
    {
      label:   "Net cashflow (mois en cours)",
      value:   (netPositif ? "+" : "") + formatFCFA(kpi.net),
      couleur:  netPositif ? "#22c55e" : "#ef4444",
      bg:       netPositif ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      icon:    <BarChart2  size={15} />,
    },
    {
      label:   "Transactions (mois en cours)",
      value:   String(kpi.count),
      couleur: "var(--gold-warm)",
      bg:      "rgba(240,165,0,0.08)",
      icon:    <Hash size={15} />,
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {kpiCards.map(({ label, value, couleur, bg, icon }) => (
          <div
            key={label}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: 12, padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ color: couleur, display: "flex", padding: "5px", borderRadius: 6, background: bg }}>{icon}</span>
              <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: couleur }}>
              {isLoading ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      {/* Accès rapides */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {peutCreer && (
          <button
            onClick={onNouvelleTransaction}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 8,
              fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700,
              background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))",
              color: "var(--text-inverse)", cursor: "pointer", border: "none",
              boxShadow: "0 0 16px var(--gold-glow)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
          >
            <Plus size={15} />
            Nouvelle transaction
          </button>
        )}
        <button
          onClick={onVoirBudgets}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 8,
            fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
            background: "transparent", color: "var(--green-bright)",
            border: "1px solid var(--green-vivid)", cursor: "pointer",
          }}
        >
          <PieChart size={15} />
          Budgets
        </button>
        <button
          onClick={onVoirDashboard}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 8,
            fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
            background: "transparent", color: "var(--green-bright)",
            border: "1px solid var(--green-vivid)", cursor: "pointer",
          }}
        >
          <BarChart2 size={15} />
          Dashboard
        </button>
      </div>

      {/* 5 dernières transactions */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{
            margin: 0, fontSize: 11, fontWeight: 700,
            fontFamily: "var(--font-display)", color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Dernières transactions
          </h3>
          <button
            onClick={onVoirTout}
            style={{ all: "unset", cursor: "pointer", fontSize: 12, color: "var(--gold-warm)", fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            Voir tout →
          </button>
        </div>

        {isLoading && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-body)", padding: "16px 0" }}>Chargement…</p>
        )}

        {!isLoading && dernieres.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Aucune transaction enregistrée
            </p>
            {peutCreer && (
              <button
                onClick={onNouvelleTransaction}
                style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", color: "var(--text-inverse)", cursor: "pointer", border: "none" }}
              >
                <Plus size={14} />
                Saisir la première transaction
              </button>
            )}
          </div>
        )}

        {!isLoading && dernieres.length > 0 && (
          <div style={{ borderRadius: 12, border: "1px solid var(--bg-border)", overflowX: "auto" }}>
            <div style={{ minWidth: 480 }}>
            {dernieres.map((t, i) => {
              const fluxCfg   = TYPE_FLUX_CONFIG[t.typeFlux]
              const statutCfg = STATUT_TRANSACTION_CONFIG[t.statutTransaction]
              return (
                <div
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px 90px 1fr 130px 82px",
                    alignItems: "center",
                    gap: 12, padding: "12px 16px",
                    background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                    borderBottom: i < dernieres.length - 1 ? "1px solid var(--bg-border)" : "none",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", whiteSpace: "nowrap" }}>
                    {formatDateFr(t.dateTransaction)}
                  </p>

                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 20,
                    background: fluxCfg.bg, color: fluxCfg.couleur,
                    border: `1px solid ${fluxCfg.border}`,
                    fontFamily: "var(--font-display)", whiteSpace: "nowrap",
                  }}>
                    {fluxCfg.signe} {t.typeFlux}
                  </span>

                  <div style={{ overflow: "hidden" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.partenaire}
                    </p>
                    {(t.projetNom || t.typeDepenseNom) && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[t.projetNom, t.typeDepenseNom].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    color: fluxCfg.couleur, textAlign: "right", whiteSpace: "nowrap",
                  }}>
                    {fluxCfg.signe}{formatFCFA(t.montantLocal)}
                    {t.deviseCode !== "XOF" && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>{t.deviseCode}</span>
                    )}
                  </p>

                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 600,
                    padding: "3px 7px", borderRadius: 20,
                    background: statutCfg.bg, color: statutCfg.couleur,
                    border: `1px solid ${statutCfg.border}`,
                    fontFamily: "var(--font-display)", whiteSpace: "nowrap", textAlign: "center",
                  }}>
                    {statutCfg.label}
                  </span>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
