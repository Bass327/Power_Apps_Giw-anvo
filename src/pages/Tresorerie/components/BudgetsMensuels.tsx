import { useState, useMemo } from "react"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { useTresorerieBudgets } from "@/hooks/useTresorerieBudgets"
import { useTresorerieTransactions } from "@/hooks/useTresorerieTransactions"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { formatFCFA } from "@/lib/utils"
import {
  ALERTE_BUDGET_CONFIG,
  getAlerteBudget,
  type LigneBudgetReel,
} from "@/types/tresorerieTransactions"
import { FormulaireBudget } from "./FormulaireBudget"

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
]

interface Props {
  peutCreer: boolean
}

export function BudgetsMensuels({ peutCreer }: Props) {
  const { data: budgets      = [], isLoading: loadBudgets, isError: errBudgets } = useTresorerieBudgets()
  const { data: transactions = [], isLoading: loadTrans }                        = useTresorerieTransactions()
  const { data: projects     = [] }                                              = useTresorerieProjects()
  const { data: types        = [] }                                              = useTresorerieTypesDepenses()

  const maintenant = new Date()
  const [mois,         setMois]         = useState(maintenant.getMonth() + 1)
  const [annee,        setAnnee]        = useState(maintenant.getFullYear())
  const [formOpen,     setFormOpen]     = useState(false)

  /* Résolution des maps de lookup */
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.nom])), [projects])
  const typeMap    = useMemo(() => new Map(types.map((t)    => [t.id, t.nom])), [types])

  /* Années disponibles dans les budgets */
  const annees = useMemo(() => {
    const set = new Set(budgets.map((b) => b.annee))
    const arr = Array.from(set).sort((a, b) => b - a)
    return arr.length > 0 ? arr : [maintenant.getFullYear()]
  }, [budgets, maintenant])

  /* Calcul du tableau Budget vs Réel */
  const lignes = useMemo((): LigneBudgetReel[] => {
    /* Budgets du mois sélectionné, enrichis avec noms */
    const budgetsFiltres = budgets
      .filter((b) => b.mois === mois && b.annee === annee)
      .map((b) => ({
        ...b,
        projetNom:      b.projetNom      || (b.projetId      ? (projectMap.get(b.projetId)      ?? "—") : undefined),
        typeDepenseNom: b.typeDepenseNom || (b.typeDepenseId  ? (typeMap.get(b.typeDepenseId)    ?? "—") : undefined),
      }))

    /* Transactions Cash Out réelles/validées du même mois */
    const transReel = transactions.filter(
      (t) =>
        t.mois === mois && t.annee === annee &&
        t.typeFlux === "Cash Out" &&
        (t.statutTransaction === "Réel" || t.statutTransaction === "Validé"),
    )

    return budgetsFiltres.map((b) => {
      /* Transactions qui correspondent à cette ligne de budget */
      const transCorr = transReel.filter((t) => {
        if (t.categorieGlobale !== b.categorieGlobale)        return false
        if (b.projetId      && t.projetId      !== b.projetId)      return false
        if (b.typeDepenseId && t.typeDepenseId !== b.typeDepenseId) return false
        return true
      })

      const montantReel = transCorr.reduce((s, t) => s + t.montantLocal, 0)
      const ecart       = b.montantBudgete - montantReel
      const pourcent    = b.montantBudgete > 0 ? (montantReel / b.montantBudgete) * 100 : 0

      return {
        cle:              `${b.categorieGlobale}::${b.projetId ?? "—"}::${b.typeDepenseId ?? "—"}::${b.id}`,
        categorieGlobale: b.categorieGlobale,
        projetNom:        b.projetNom,
        typeDepenseNom:   b.typeDepenseNom,
        montantBudgete:   b.montantBudgete,
        montantReel,
        ecart,
        pourcent,
        alerte:           getAlerteBudget(pourcent),
      }
    })
  }, [budgets, transactions, projects, types, mois, annee, projectMap, typeMap])

  /* Totaux du tableau */
  const totaux = useMemo(() => ({
    budgete: lignes.reduce((s, l) => s + l.montantBudgete, 0),
    reel:    lignes.reduce((s, l) => s + l.montantReel,    0),
    ecart:   lignes.reduce((s, l) => s + l.ecart,          0),
  }), [lignes])

  const isLoading = loadBudgets || loadTrans

  const selectSt: React.CSSProperties = {
    padding: "8px 12px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    borderRadius: 8, fontSize: 13,
    color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
    outline: "none", cursor: "pointer",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Barre de contrôle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select value={mois} onChange={(e) => setMois(Number(e.target.value))} style={selectSt}>
          {MOIS_FR.map((label, i) => <option key={i+1} value={i+1}>{label}</option>)}
        </select>

        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={selectSt}>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        {peutCreer && (
          <button
            onClick={() => setFormOpen(true)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", color: "var(--text-inverse)", cursor: "pointer", border: "none" }}
          >
            <Plus size={14} />
            Nouvelle ligne de budget
          </button>
        )}
      </div>

      {/* États */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", justifyContent: "center" }}>
          <Loader2 size={18} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement…</span>
        </div>
      )}

      {errBudgets && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12 }}>
          <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontFamily: "var(--font-body)" }}>
            Impossible de charger les budgets. Vérifiez votre connexion.
          </p>
        </div>
      )}

      {!isLoading && !errBudgets && lignes.length === 0 && (
        <div style={{ padding: "56px 0", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "var(--font-body)" }}>
            Aucun budget défini pour {MOIS_FR[mois - 1]} {annee}
          </p>
        </div>
      )}

      {/* KPI de synthèse */}
      {!isLoading && !errBudgets && lignes.length > 0 && (() => {
        const tauxExec = totaux.budgete > 0 ? (totaux.reel / totaux.budgete) * 100 : null
        const couleurTaux = tauxExec === null ? "var(--text-muted)" : tauxExec > 100 ? "#ef4444" : tauxExec > 85 ? "#f59e0b" : "#22c55e"
        const couleurEcart = totaux.ecart >= 0 ? "#22c55e" : "#ef4444"
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Budget du mois",   value: formatFCFA(totaux.budgete), couleur: "var(--gold-warm)" },
              { label: "Réel du mois",     value: totaux.reel > 0 ? formatFCFA(totaux.reel) : "—", couleur: totaux.reel > 0 ? (totaux.reel <= totaux.budgete ? "#22c55e" : "#ef4444") : "var(--text-muted)" },
              { label: "Écart",            value: (totaux.ecart >= 0 ? "+" : "") + formatFCFA(totaux.ecart), couleur: couleurEcart },
              { label: "% d'exécution",    value: tauxExec !== null ? `${Math.round(tauxExec)} %` : "—", couleur: couleurTaux },
            ].map(({ label, value, couleur }) => (
              <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: couleur }}>{value}</p>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{MOIS_FR[mois - 1]} {annee}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Tableau Budget vs Réel */}
      {!isLoading && !errBudgets && lignes.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--bg-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "11%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Catégorie","Projet","Type dépense","Budgété","Réel","Écart","Réalisation"].map((col) => (
                  <th
                    key={col}
                    style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const alerteCfg = ALERTE_BUDGET_CONFIG[l.alerte]
                const ecartPositif = l.ecart >= 0
                return (
                  <tr
                    key={l.cle}
                    style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)", transition: "background 120ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                        {l.categorieGlobale}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px", overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.projetNom ?? "—"}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px", overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.typeDepenseNom ?? "—"}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                        {formatFCFA(l.montantBudgete)}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)", whiteSpace: "nowrap", color: l.montantReel > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {l.montantReel > 0 ? formatFCFA(l.montantReel) : "—"}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", whiteSpace: "nowrap", color: ecartPositif ? "#22c55e" : "#ef4444" }}>
                        {ecartPositif ? "+" : ""}{formatFCFA(l.ecart)}
                      </p>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Barre de progression */}
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--bg-border)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(l.pourcent, 100)}%`, background: alerteCfg.couleur, borderRadius: 3, transition: "width 400ms ease" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", color: alerteCfg.couleur, whiteSpace: "nowrap", minWidth: 32, textAlign: "right" }}>
                          {Math.round(l.pourcent)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer totaux */}
          <div style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderTop: "1px solid var(--bg-border)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {lignes.length} ligne{lignes.length > 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", gap: 24, marginLeft: "auto" }}>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Budgété : </span>
                <span style={{ color: "var(--text-primary)" }}>{formatFCFA(totaux.budgete)}</span>
              </span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Réel : </span>
                <span style={{ color: "var(--text-primary)" }}>{formatFCFA(totaux.reel)}</span>
              </span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700 }}>
                <span style={{ color: "var(--text-muted)" }}>Écart : </span>
                <span style={{ color: totaux.ecart >= 0 ? "#22c55e" : "#ef4444" }}>
                  {totaux.ecart >= 0 ? "+" : ""}{formatFCFA(totaux.ecart)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire budget */}
      {formOpen && (
        <FormulaireBudget
          moisDefaut={mois}
          anneeDefaut={annee}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
