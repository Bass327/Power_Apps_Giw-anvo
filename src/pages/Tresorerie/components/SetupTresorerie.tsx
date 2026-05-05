import { useState, useEffect } from "react"
import { Settings, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { getSiteId, graphFetch } from "@/lib/graphClient"

const LISTES_REQUISES = [
  {
    nom:         "Tresorerie_Projects",
    label:       "Projets Trésorerie",
    description: "Référentiel des projets (lié aux transactions via Lookup)",
    colonnes:    "Title (nom), CodeProjet, CategorieGlobale, Localisation, Responsable, Actif",
  },
  {
    nom:         "Tresorerie_TypesDepenses",
    label:       "Types de dépenses",
    description: "Référentiel des catégories de dépenses",
    colonnes:    "Title (nom), CodeTypeDepense, CategorieParente, Actif",
  },
  {
    nom:         "Tresorerie_Transactions",
    label:       "Transactions analytiques",
    description: "Toutes les entrées/sorties de trésorerie",
    colonnes:    "Title, DateTransaction, Mois, Annee, TypeFlux, CategorieGlobale, ProjetLookup (Recherche → Tresorerie_Projects), TypeDepenseLookup (Recherche → Tresorerie_TypesDepenses), Partenaire, MontantLocal, DeviseCode, TauxChange, MontantConvertiEUR, StatutTransaction, Commentaire, PieceJustificativeURL, SaisiPar, DateSaisie",
  },
  {
    nom:         "Tresorerie_BudgetsMensuels",
    label:       "Budgets mensuels",
    description: "Lignes de budget par mois, catégorie et projet",
    colonnes:    "Title, Mois, Annee, CategorieGlobale, ProjetLookup (Recherche → Tresorerie_Projects), TypeDepenseLookup (Recherche → Tresorerie_TypesDepenses), MontantBudgete, Commentaire, VersionBudget, StatutBudget",
  },
]

interface ListeStatus {
  nom:     string
  statut:  "ok" | "missing"
  idReel?: string
}

export function SetupTresorerie() {
  const { getToken, isAuthenticated } = useAuth()

  const [checking,       setChecking]       = useState(false)
  const [statuts,        setStatuts]        = useState<ListeStatus[]>([])
  const [toutesPresentes, setToutesPresentes] = useState<boolean | null>(null)
  const [expanded,       setExpanded]       = useState(false)

  /* Vérification automatique au montage */
  useEffect(() => {
    if (!isAuthenticated) return
    void verifier()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  async function verifier() {
    setChecking(true)
    try {
      const token  = await getToken()
      const siteId = await getSiteId(token)
      const result = await graphFetch<{ value: { id: string; name: string; displayName: string }[] }>(
        token,
        `/sites/${siteId}/lists?$select=id,name,displayName`,
      )
      const listesExistantes = result.value
      const nouvStatuts: ListeStatus[] = LISTES_REQUISES.map((lr) => {
        const trouvee = listesExistantes.find(
          (l) => l.name === lr.nom || l.displayName === lr.nom,
        )
        return { nom: lr.nom, statut: trouvee ? "ok" : "missing", idReel: trouvee?.id }
      })
      setStatuts(nouvStatuts)
      setToutesPresentes(nouvStatuts.every((s) => s.statut === "ok"))
    } catch {
      /* Silencieux — erreur réseau ou token non disponible au premier rendu */
    } finally {
      setChecking(false)
    }
  }

  /* Masquage complet si toutes les listes sont confirmées présentes */
  if (toutesPresentes === true) return null

  /* En cours de vérification initiale — rien à afficher */
  if (checking && statuts.length === 0) return null

  const listesManquantes = statuts.filter((s) => s.statut === "missing")

  const lbl: React.CSSProperties = {
    fontSize: 11, color: "var(--text-secondary)",
    fontFamily: "var(--font-body)", textTransform: "uppercase",
    letterSpacing: "0.06em",
  }

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(245,158,11,0.40)",
      background: "rgba(245,158,11,0.05)",
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          all: "unset", cursor: "pointer",
          width: "100%", display: "flex", alignItems: "center",
          gap: 10, padding: "14px 18px",
          borderBottom: expanded ? "1px solid var(--bg-border)" : "none",
        }}
      >
        <Settings size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", color: "#f59e0b", flex: 1, textAlign: "left" }}>
          {toutesPresentes === null
            ? "Vérification des listes SharePoint…"
            : `⚠ ${listesManquantes.length} liste${listesManquantes.length > 1 ? "s" : ""} SharePoint manquante${listesManquantes.length > 1 ? "s" : ""} — configuration requise`}
        </span>
        {expanded
          ? <ChevronDown  size={14} style={{ color: "var(--text-muted)" }} />
          : <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
        }
      </button>

      {expanded && (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            Le module analytique (Transactions, Budgets, Dashboard) nécessite 4 listes SharePoint
            sur le site <strong style={{ color: "var(--text-primary)" }}>Giw'anvo-PowerApps</strong>.
          </p>

          {/* Bouton re-vérification manuelle */}
          <button
            onClick={verifier}
            disabled={checking}
            style={{
              all: "unset", cursor: checking ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 8, fontSize: 13,
              fontFamily: "var(--font-display)", fontWeight: 700,
              background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))",
              color: "var(--text-inverse)", opacity: checking ? 0.7 : 1,
            }}
          >
            {checking && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {checking ? "Vérification…" : "Re-vérifier"}
          </button>

          {/* Résultats */}
          {statuts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {statuts.map((s, idx) => {
                const info = LISTES_REQUISES[idx]
                return (
                  <div
                    key={s.nom}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", borderRadius: 8,
                      background: s.statut === "ok" ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${s.statut === "ok" ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.20)"}`,
                    }}
                  >
                    {s.statut === "ok"
                      ? <CheckCircle2 size={15} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
                      : <XCircle      size={15} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", color: s.statut === "ok" ? "#22c55e" : "#ef4444" }}>
                        {info.label} — <code style={{ fontSize: 11 }}>{s.nom}</code>
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {s.statut === "ok" ? `✓ Présente` : info.description}
                      </p>
                      {s.statut === "missing" && (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                          <strong>Colonnes :</strong> {info.colonnes}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Guide de création */}
          <details style={{ borderTop: "1px solid var(--bg-border)", paddingTop: 12 }}>
            <summary style={{ ...lbl, cursor: "pointer", marginBottom: 10 }}>
              Comment créer ces listes sur SharePoint ?
            </summary>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Aller sur : https://giwaanvoenergy961.sharepoint.com/sites/GiwanvoPowerApps",
                "Clic sur l'engrenage ⚙ → « Contenu du site »",
                "Cliquer « + Nouveau » → « Liste » → nommer exactement comme indiqué",
                "Ajouter les colonnes une par une (les colonnes Lookup pointent vers la liste cible)",
                "Pour ProjetLookup : Type = Recherche, Liste = Tresorerie_Projects, Colonne = Title",
                "Répéter pour les 4 listes, puis cliquer « Re-vérifier » ici",
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  {step}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </div>
  )
}
