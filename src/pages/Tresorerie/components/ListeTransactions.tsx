import { useState, useMemo } from "react"
import { Search, X, Loader2, AlertCircle } from "lucide-react"
import { useTresorerieTransactions } from "@/hooks/useTresorerieTransactions"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import {
  TYPE_FLUX_CONFIG,
  STATUT_TRANSACTION_CONFIG,
  type TypeFlux,
  type CategorieGlobale,
  type StatutTransaction,
} from "@/types/tresorerieTransactions"

export function ListeTransactions() {
  const { data: transactions = [], isLoading, isError } = useTresorerieTransactions()
  const { data: projects     = [] }                     = useTresorerieProjects()
  const { data: types        = [] }                     = useTresorerieTypesDepenses()

  const maintenant = new Date()
  const [mois,      setMois]      = useState(maintenant.getMonth() + 1)
  const [annee,     setAnnee]     = useState(maintenant.getFullYear())
  const [typeFlux,  setTypeFlux]  = useState<TypeFlux | "">("")
  const [categorie, setCategorie] = useState<CategorieGlobale | "">("")
  const [projetId,  setProjetId]  = useState("")
  const [statut,    setStatut]    = useState<StatutTransaction | "">("")
  const [recherche, setRecherche] = useState("")

  /* Résolution des noms Lookup côté client */
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.nom])), [projects])
  const typeMap    = useMemo(() => new Map(types.map((t)    => [t.id, t.nom])), [types])

  const enrichies = useMemo(
    () => transactions.map((t) => ({
      ...t,
      projetNom:      t.projetNom      || (t.projetId      ? (projectMap.get(t.projetId)      ?? "—") : undefined),
      typeDepenseNom: t.typeDepenseNom || (t.typeDepenseId  ? (typeMap.get(t.typeDepenseId)    ?? "—") : undefined),
    })),
    [transactions, projectMap, typeMap],
  )

  /* Application des filtres */
  const filtrees = useMemo(() => {
    const q = recherche.toLowerCase().trim()
    return enrichies.filter((t) => {
      if (mois      && t.mois             !== mois)      return false
      if (annee     && t.annee            !== annee)     return false
      if (typeFlux  && t.typeFlux         !== typeFlux)  return false
      if (categorie && t.categorieGlobale !== categorie) return false
      if (projetId  && t.projetId         !== projetId)  return false
      if (statut    && t.statutTransaction !== statut)   return false
      if (q && !t.partenaire.toLowerCase().includes(q) &&
               !t.referenceTransaction.toLowerCase().includes(q)) return false
      return true
    })
  }, [enrichies, mois, annee, typeFlux, categorie, projetId, statut, recherche])

  /* Stats footer calculées sur les lignes filtrées */
  const stats = useMemo(() => {
    const cashIn  = filtrees.filter((t) => t.typeFlux === "Cash In") .reduce((s, t) => s + t.montantLocal, 0)
    const cashOut = filtrees.filter((t) => t.typeFlux === "Cash Out").reduce((s, t) => s + t.montantLocal, 0)
    return { cashIn, cashOut, net: cashIn - cashOut }
  }, [filtrees])

  /* Années disponibles dans les données */
  const annees = useMemo(() => {
    const set = new Set(transactions.map((t) => t.annee))
    const arr = Array.from(set).sort((a, b) => b - a)
    return arr.length > 0 ? arr : [maintenant.getFullYear()]
  }, [transactions, maintenant])

  function resetFiltres() {
    setMois(maintenant.getMonth() + 1)
    setAnnee(maintenant.getFullYear())
    setTypeFlux(""); setCategorie(""); setProjetId(""); setStatut(""); setRecherche("")
  }

  const selectSt: React.CSSProperties = {
    padding: "8px 12px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    borderRadius: 8, fontSize: 13,
    color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
    outline: "none", cursor: "pointer",
  }

  const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Barre de filtres ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select value={mois} onChange={(e) => setMois(Number(e.target.value))} style={selectSt}>
          {MOIS_FR.map((label, i) => <option key={i+1} value={i+1}>{label}</option>)}
        </select>

        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={selectSt}>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={typeFlux} onChange={(e) => setTypeFlux(e.target.value as TypeFlux | "")} style={selectSt}>
          <option value="">Tous les flux</option>
          <option value="Cash In">Cash In</option>
          <option value="Cash Out">Cash Out</option>
        </select>

        <select value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieGlobale | "")} style={selectSt}>
          <option value="">Toutes catégories</option>
          <option value="General">General</option>
          <option value="Project Specific">Project Specific</option>
          <option value="Production">Production</option>
        </select>

        {projects.length > 0 && (
          <select value={projetId} onChange={(e) => setProjetId(e.target.value)} style={selectSt}>
            <option value="">Tous les projets</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        )}

        <select value={statut} onChange={(e) => setStatut(e.target.value as StatutTransaction | "")} style={selectSt}>
          <option value="">Tous les statuts</option>
          <option value="Prévision">Prévision</option>
          <option value="Réel">Réel</option>
          <option value="Validé">Validé</option>
        </select>

        {/* Recherche */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 8 }}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Partenaire, référence…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)", width: 160 }}
          />
          {recherche && (
            <button onClick={() => setRecherche("")} style={{ all: "unset", cursor: "pointer", display: "flex" }}>
              <X size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>

        <button
          onClick={resetFiltres}
          style={{ all: "unset", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", padding: "8px 10px", textDecoration: "underline" }}
        >
          Réinitialiser
        </button>

      </div>

      {/* ── États ── */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", justifyContent: "center" }}>
          <Loader2 size={18} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Chargement…</span>
        </div>
      )}

      {isError && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12 }}>
          <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontFamily: "var(--font-body)" }}>
            Impossible de charger les transactions. Vérifiez votre connexion.
          </p>
        </div>
      )}

      {!isLoading && !isError && filtrees.length === 0 && (
        <div style={{ padding: "56px 0", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "var(--font-body)" }}>
            Aucune transaction pour ces critères
          </p>
        </div>
      )}

      {/* ── Tableau ── */}
      {!isLoading && !isError && filtrees.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--bg-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Date","Flux","Catégorie / Projet","Type dépense","Partenaire","Devise","Montant","Statut"].map((col) => (
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
              {filtrees.map((t, i) => {
                const fluxCfg   = TYPE_FLUX_CONFIG[t.typeFlux]
                const statutCfg = STATUT_TRANSACTION_CONFIG[t.statutTransaction]
                return (
                  <tr
                    key={t.id}
                    style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)", transition: "background 120ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)", whiteSpace: "nowrap" }}>
                        {formatDateFr(t.dateTransaction)}
                      </p>
                    </td>

                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 20, background: fluxCfg.bg, color: fluxCfg.couleur, border: `1px solid ${fluxCfg.border}`, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                        {t.typeFlux}
                      </span>
                    </td>

                    <td style={{ padding: "11px 14px", overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.categorieGlobale}
                      </p>
                      {t.projetNom && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.projetNom}
                        </p>
                      )}
                    </td>

                    <td style={{ padding: "11px 14px", overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.typeDepenseNom ?? "—"}
                      </p>
                    </td>

                    <td style={{ padding: "11px 14px", overflow: "hidden" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.partenaire}
                      </p>
                    </td>

                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {t.deviseCode}
                      </p>
                    </td>

                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", color: fluxCfg.couleur, whiteSpace: "nowrap" }}>
                        {fluxCfg.signe}{formatFCFA(t.montantLocal)}
                      </p>
                      {t.deviseCode !== "XOF" && (
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                          ≈ {t.montantConvertiEUR.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                        </p>
                      )}
                    </td>

                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 20, background: statutCfg.bg, color: statutCfg.couleur, border: `1px solid ${statutCfg.border}`, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                        {statutCfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer stats */}
          <div style={{ padding: "11px 16px", background: "var(--bg-elevated)", borderTop: "1px solid var(--bg-border)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {filtrees.length} transaction{filtrees.length > 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", gap: 20, marginLeft: "auto" }}>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Cash In : </span>
                <span style={{ color: "#22c55e" }}>+{formatFCFA(stats.cashIn)}</span>
              </span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>Cash Out : </span>
                <span style={{ color: "#ef4444" }}>-{formatFCFA(stats.cashOut)}</span>
              </span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700 }}>
                <span style={{ color: "var(--text-muted)" }}>Net : </span>
                <span style={{ color: stats.net >= 0 ? "#22c55e" : "#ef4444" }}>
                  {stats.net >= 0 ? "+" : ""}{formatFCFA(stats.net)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
