import { useState, useMemo } from "react"
import { X, Loader2 } from "lucide-react"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { useCreateBudget } from "@/hooks/useTresorerieBudgets"
import {
  CATEGORIES_GLOBALES,
  type CategorieGlobale,
  type StatutBudget,
} from "@/types/tresorerieTransactions"

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  borderRadius: 8, color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-body)",
  textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 6,
}

const errorStyle: React.CSSProperties = {
  fontSize: 11, color: "#ef4444",
  marginTop: 4, fontFamily: "var(--font-body)",
}

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
]

interface Props {
  moisDefaut:  number
  anneeDefaut: number
  onClose:     () => void
}

export function FormulaireBudget({ moisDefaut, anneeDefaut, onClose }: Props) {
  const { data: projects      = [] } = useTresorerieProjects()
  const { data: typesDepenses = [] } = useTresorerieTypesDepenses()
  const { mutate: creer, isPending } = useCreateBudget()

  const [mois,          setMois]          = useState(moisDefaut)
  const [annee,         setAnnee]         = useState(anneeDefaut)
  const [categorie,     setCategorie]     = useState<CategorieGlobale>("General")
  const [projetId,      setProjetId]      = useState("")
  const [typeDepenseId, setTypeDepenseId] = useState("")
  const [montant,       setMontant]       = useState("")
  const [commentaire,   setCommentaire]   = useState("")
  const [version,       setVersion]       = useState("")
  const [statut,        setStatut]        = useState<StatutBudget>("Brouillon")
  const [erreurs,       setErreurs]       = useState<Record<string, string>>({})

  /* Projets filtrés selon la catégorie sélectionnée */
  const projetsFiltres = useMemo(
    () => projects.filter((p) => p.categorieGlobale === categorie),
    [projects, categorie],
  )

  /* Types de dépenses filtrés selon la catégorie — les types sans catégorie parente s'appliquent à toutes */
  const typesFiltres = useMemo(
    () => typesDepenses.filter(
      (t) => !t.categorieParente || t.categorieParente === categorie,
    ),
    [typesDepenses, categorie],
  )

  const montantNum = parseFloat(montant.replace(/\s/g, "")) || 0

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (montantNum <= 0)                                     e.montant     = "Le montant doit être supérieur à 0"
    if (projetsFiltres.length > 0 && !projetId)             e.projet      = "Le projet est requis"
    if (typesFiltres.length > 0 && !typeDepenseId)          e.typeDepense = "Le type de dépense est requis"
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valider()) return

    const projetNom      = projects.find((p) => p.id === projetId)?.nom
    const typeDepenseNom = typesDepenses.find((t) => t.id === typeDepenseId)?.nom

    creer(
      {
        mois,
        annee,
        categorieGlobale: categorie,
        projetId:         projetId      || undefined,
        projetNom,
        typeDepenseId:    typeDepenseId || undefined,
        typeDepenseNom,
        montantBudgete:   montantNum,
        commentaire:      commentaire.trim() || undefined,
        versionBudget:    version.trim()     || undefined,
        statutBudget:     statut,
      },
      { onSuccess: onClose },
    )
  }

  /* Réinitialise les champs dépendants à chaque changement de catégorie */
  function handleCategorieChange(c: CategorieGlobale) {
    setCategorie(c)
    setProjetId("")
    setTypeDepenseId("")
  }

  const anneeActuelle = new Date().getFullYear()

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: 16, maxHeight: "90vh", overflowY: "auto" }}>
        {/* En-tête */}
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Nouvelle ligne de budget
          </h2>
          <button
            onClick={() => !isPending && onClose()}
            style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 1. Mois + 2. Année */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Mois *</label>
              <select value={mois} onChange={(e) => setMois(Number(e.target.value))} style={inputStyle}>
                {MOIS_FR.map((label, i) => (
                  <option key={i + 1} value={i + 1}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Année *</label>
              <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={inputStyle}>
                {[anneeActuelle - 1, anneeActuelle, anneeActuelle + 1].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Catégorie */}
          <div>
            <label style={labelStyle}>Catégorie *</label>
            <select
              value={categorie}
              onChange={(e) => handleCategorieChange(e.target.value as CategorieGlobale)}
              style={inputStyle}
            >
              {CATEGORIES_GLOBALES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 4. Projet — toujours visible, filtré par catégorie */}
          <div>
            <label style={labelStyle}>
              Projet {projetsFiltres.length > 0 ? "*" : ""}
            </label>
            <select
              value={projetId}
              onChange={(e) => setProjetId(e.target.value)}
              disabled={projetsFiltres.length === 0}
              style={{ ...inputStyle, opacity: projetsFiltres.length === 0 ? 0.5 : 1 }}
            >
              {projetsFiltres.length === 0
                ? <option value="">Aucun projet configuré pour cette catégorie</option>
                : <>
                    <option value="">— Sélectionner un projet —</option>
                    {projetsFiltres.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom} ({p.codeProjet})</option>
                    ))}
                  </>
              }
            </select>
            {erreurs.projet && <p style={errorStyle}>{erreurs.projet}</p>}
          </div>

          {/* 5. Type de dépense — toujours visible, filtré par catégorie */}
          <div>
            <label style={labelStyle}>
              Type de dépense {typesFiltres.length > 0 ? "*" : ""}
            </label>
            <select
              value={typeDepenseId}
              onChange={(e) => setTypeDepenseId(e.target.value)}
              disabled={typesFiltres.length === 0}
              style={{ ...inputStyle, opacity: typesFiltres.length === 0 ? 0.5 : 1 }}
            >
              {typesFiltres.length === 0
                ? <option value="">Aucun type configuré pour cette catégorie</option>
                : <>
                    <option value="">— Sélectionner un type —</option>
                    {typesFiltres.map((t) => (
                      <option key={t.id} value={t.id}>{t.nom}</option>
                    ))}
                  </>
              }
            </select>
            {erreurs.typeDepense && <p style={errorStyle}>{erreurs.typeDepense}</p>}
          </div>

          {/* 6. Montant budgété */}
          <div>
            <label style={labelStyle}>Montant budgété (FCFA) *</label>
            <input
              type="number" min="1" step="1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
            {erreurs.montant && <p style={errorStyle}>{erreurs.montant}</p>}
          </div>

          {/* 7. Version + 8. Statut */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Version budget</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ex : v1, révisé…"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Statut *</label>
              <select value={statut} onChange={(e) => setStatut(e.target.value as StatutBudget)} style={inputStyle}>
                <option value="Brouillon">Brouillon</option>
                <option value="Validé">Validé</option>
              </select>
            </div>
          </div>

          {/* 9. Commentaire */}
          <div>
            <label style={labelStyle}>Commentaire</label>
            <textarea
              rows={2}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Remarques ou justifications…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              style={{ all: "unset", cursor: "pointer", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ all: "unset", cursor: isPending ? "default" : "pointer", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-inverse)", background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))", display: "flex", alignItems: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}
            >
              {isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
