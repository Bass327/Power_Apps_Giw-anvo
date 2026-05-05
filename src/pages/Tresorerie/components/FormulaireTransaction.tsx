import { useState, useMemo } from "react"
import { X, Loader2 } from "lucide-react"
import { useTresorerieProjects } from "@/hooks/useTresorerieProjects"
import { useTresorerieTypesDepenses } from "@/hooks/useTresorerieTypesDepenses"
import { useCreateTransaction } from "@/hooks/useTresorerieTransactions"
import {
  CATEGORIES_GLOBALES,
  DEVISES,
  TYPE_FLUX_CONFIG,
  toEUR,
  getStatutAuto,
  type CategorieGlobale,
  type TypeFlux,
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

interface Props {
  saisiPar: string
  onClose:  () => void
}

export function FormulaireTransaction({ saisiPar, onClose }: Props) {
  const { data: projects      = [] } = useTresorerieProjects()
  const { data: typesDepenses = [] } = useTresorerieTypesDepenses()
  const { mutate: creer, isPending } = useCreateTransaction()

  const today = new Date().toISOString().split("T")[0]
  const [date,          setDate]          = useState(today)
  const [typeFlux,      setTypeFlux]      = useState<TypeFlux>("Cash Out")
  const [categorie,     setCategorie]     = useState<CategorieGlobale>("General")
  const [projetId,      setProjetId]      = useState("")
  const [typeDepenseId, setTypeDepenseId] = useState("")
  const [partenaire,    setPartenaire]    = useState("")
  const [montant,       setMontant]       = useState("")
  const [devise,        setDevise]        = useState("XOF")
  const [commentaire,   setCommentaire]   = useState("")
  const [pieceURL,      setPieceURL]      = useState("")
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
  const montantEUR = montantNum > 0 && devise !== "EUR" ? toEUR(montantNum, devise) : null

  function valider(): boolean {
    const e: Record<string, string> = {}
    if (!date)                                        e.date       = "La date est requise"
    if (!partenaire.trim())                           e.partenaire = "Le partenaire est requis"
    if (montantNum <= 0)                              e.montant    = "Le montant doit être supérieur à 0"
    /* Projet toujours requis si des projets existent pour cette catégorie */
    if (projetsFiltres.length > 0 && !projetId)      e.projet     = "Le projet est requis"
    /* Type de dépense requis si des types existent pour cette catégorie */
    if (typesFiltres.length > 0 && !typeDepenseId)   e.typeDepense = "Le type de dépense est requis"
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valider()) return
    creer(
      {
        data: {
          dateTransaction:       date,
          typeFlux,
          categorieGlobale:      categorie,
          projetId:              projetId      || undefined,
          typeDepenseId:         typeDepenseId || undefined,
          partenaire:            partenaire.trim(),
          montantLocal:          montantNum,
          deviseCode:            devise,
          commentaire:           commentaire.trim() || undefined,
          pieceJustificativeURL: pieceURL.trim()    || undefined,
          statutTransaction:     getStatutAuto(date),
        },
        saisiPar,
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div style={{
        width: "100%", maxWidth: 560,
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: 16, maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* En-tête */}
        <div style={{
          padding: "22px 28px 18px",
          borderBottom: "1px solid var(--bg-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Nouvelle transaction
          </h2>
          <button
            onClick={() => !isPending && onClose()}
            style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={15} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 1. Date + Type de flux */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
              {erreurs.date && <p style={errorStyle}>{erreurs.date}</p>}
            </div>
            <div>
              <label style={labelStyle}>Type de flux *</label>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                {(["Cash In", "Cash Out"] as TypeFlux[]).map((t) => {
                  const cfg   = TYPE_FLUX_CONFIG[t]
                  const actif = typeFlux === t
                  return (
                    <button
                      key={t} type="button"
                      onClick={() => setTypeFlux(t)}
                      style={{
                        flex: 1, padding: "10px 0",
                        borderRadius: 8, fontSize: 13,
                        fontFamily: "var(--font-display)", fontWeight: 600,
                        cursor: "pointer",
                        border:      `1px solid ${actif ? cfg.border : "var(--bg-border)"}`,
                        background:   actif ? cfg.bg      : "var(--bg-elevated)",
                        color:        actif ? cfg.couleur : "var(--text-muted)",
                        transition: "all 150ms",
                      }}
                    >
                      {cfg.signe} {t}
                    </button>
                  )
                })}
              </div>
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

          {/* 6. Partenaire */}
          <div>
            <label style={labelStyle}>Partenaire *</label>
            <input
              type="text"
              value={partenaire}
              onChange={(e) => setPartenaire(e.target.value)}
              placeholder="Client, fournisseur ou partenaire"
              style={inputStyle}
            />
            {erreurs.partenaire && <p style={errorStyle}>{erreurs.partenaire}</p>}
          </div>

          {/* 7 & 8. Montant + Devise */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Montant *</label>
              <input
                type="number" min="0.01" step="any"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
              {erreurs.montant && <p style={errorStyle}>{erreurs.montant}</p>}
              {montantEUR !== null && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-body)" }}>
                  ≈ {montantEUR.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Devise *</label>
              <select value={devise} onChange={(e) => setDevise(e.target.value)} style={inputStyle}>
                {DEVISES.map((d) => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
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
              placeholder="Informations complémentaires…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* 10. Pièce justificative */}
          <div>
            <label style={labelStyle}>Pièce justificative (URL)</label>
            <input
              type="url"
              value={pieceURL}
              onChange={(e) => setPieceURL(e.target.value)}
              placeholder="https://…"
              style={inputStyle}
            />
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              style={{
                all: "unset", cursor: "pointer",
                padding: "10px 18px", borderRadius: 8,
                fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)", border: "1px solid var(--bg-border)",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                all: "unset",
                cursor: isPending ? "default" : "pointer",
                padding: "10px 22px", borderRadius: 8,
                fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700,
                color: "var(--text-inverse)",
                background: "linear-gradient(135deg,var(--gold-warm),var(--gold-bright))",
                display: "flex", alignItems: "center", gap: 8,
                opacity: isPending ? 0.7 : 1,
              }}
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
