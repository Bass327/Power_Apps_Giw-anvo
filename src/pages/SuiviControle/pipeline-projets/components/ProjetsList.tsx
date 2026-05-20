import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Edit2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Filter,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useProjets } from "@/hooks/usePipeline"
import {
  PHASE_COLORS,
  PRIORITE_COLORS,
  STATUT_PROJET_COLORS,
  PHASES_PIPELINE,
  STATUTS_PROJET,
  PRIORITES,
  formatFCFA,
} from "@/types/pipeline"
import type { ProjetPipeline, PhaseProjet, StatutProjet, Priorite } from "@/types/pipeline"

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

type SortKey =
  | "codeProjet"
  | "titre"
  | "region"
  | "chefProjet"
  | "puissanceKwp"
  | "dateProchaineEtape"
  | "montantFinancement"

type SortDir = "asc" | "desc"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—"
  const parts = iso.split("-")
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso
}

function compareProjet(
  a:   ProjetPipeline,
  b:   ProjetPipeline,
  col: SortKey,
  dir: SortDir,
): number {
  let va: string | number = ""
  let vb: string | number = ""

  switch (col) {
    case "codeProjet":
      va = a.codeProjet; vb = b.codeProjet; break
    case "titre":
      va = a.titre; vb = b.titre; break
    case "region":
      va = a.region; vb = b.region; break
    case "chefProjet":
      va = a.chefProjet; vb = b.chefProjet; break
    case "puissanceKwp":
      va = a.puissanceKwp; vb = b.puissanceKwp; break
    case "dateProchaineEtape":
      // Les dates vides passent en dernier
      va = a.dateProchaineEtape || "9999-12-31"
      vb = b.dateProchaineEtape || "9999-12-31"
      break
    case "montantFinancement":
      va = a.montantFinancement; vb = b.montantFinancement; break
  }

  if (typeof va === "number" && typeof vb === "number") {
    return dir === "asc" ? va - vb : vb - va
  }
  const cmp = String(va).localeCompare(String(vb), "fr")
  return dir === "asc" ? cmp : -cmp
}

// ─── Badge phase ──────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: PhaseProjet }) {
  const c = PHASE_COLORS[phase] ?? {
    bg: "rgba(107,114,128,0.12)",
    text: "#9ca3af",
    border: "rgba(107,114,128,0.3)",
  }
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {phase}
    </span>
  )
}

// ─── Badge priorité ───────────────────────────────────────────────────────────

function PrioriteBadge({ priorite }: { priorite: Priorite }) {
  const c = PRIORITE_COLORS[priorite]
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {priorite}
    </span>
  )
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: StatutProjet }) {
  const c = STATUT_PROJET_COLORS[statut] ?? {
    bg: "rgba(107,114,128,0.12)",
    text: "#9ca3af",
    border: "rgba(107,114,128,0.3)",
  }
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {statut}
    </span>
  )
}

// ─── Icône de tri ─────────────────────────────────────────────────────────────

function SortIcon({
  col,
  active,
  dir,
}: {
  col: string
  active: boolean
  dir: SortDir
}) {
  void col
  if (!active) return <ChevronsUpDown size={13} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
  return dir === "asc"
    ? <ChevronUp   size={13} style={{ color: "#f0a500" }} />
    : <ChevronDown size={13} style={{ color: "#f0a500" }} />
}

// ─── En-tête de colonne triable ───────────────────────────────────────────────

interface ThProps {
  label:    string
  col?:     SortKey
  sortCol:  SortKey
  sortDir:  SortDir
  onSort:   (col: SortKey) => void
  align?:   "left" | "right" | "center"
  minWidth?: number
}

function Th({ label, col, sortCol, sortDir, onSort, align = "left", minWidth }: ThProps) {
  const isActive = col !== undefined && col === sortCol
  const handleClick = () => col && onSort(col)

  return (
    <th
      onClick={col ? handleClick : undefined}
      className={col ? "cursor-pointer select-none" : ""}
      style={{
        padding:         "10px 14px",
        textAlign:       align,
        whiteSpace:      "nowrap",
        fontFamily:      "'Syne', sans-serif",
        fontSize:        "0.75rem",
        fontWeight:      600,
        color:           isActive ? "#f0a500" : "var(--text-secondary)",
        background:      "rgba(13,26,16,0.8)",
        borderBottom:    "1px solid #1e3528",
        minWidth:        minWidth,
        userSelect:      "none",
        transition:      "color 150ms",
      }}
    >
      <span className="flex items-center gap-1.5" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {label}
        {col && <SortIcon col={col} active={isActive} dir={sortDir} />}
      </span>
    </th>
  )
}

// ─── Select stylisé ───────────────────────────────────────────────────────────

interface StyledSelectProps {
  value:    string
  onChange: (v: string) => void
  options:  { label: string; value: string }[]
}

function StyledSelect({ value, onChange, options }: StyledSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg text-sm transition-all duration-150"
      style={{
        background:  "var(--bg-elevated)",
        border:      "1px solid var(--bg-border)",
        color:       value ? "var(--text-primary)" : "var(--text-secondary)",
        padding:     "6px 10px",
        fontFamily:  "'Syne', sans-serif",
        fontSize:    "0.8125rem",
        outline:     "none",
        cursor:      "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProjetsList() {
  const navigate                                             = useNavigate()
  const { data: projets = [], isLoading, isError, refetch } = useProjets()

  // ── Filtres ──
  const [search,      setSearch]      = useState("")
  const [filterPhase, setFilterPhase] = useState<PhaseProjet | "">("")
  const [filterPrio,  setFilterPrio]  = useState<Priorite | "">("")
  const [filterStatut, setFilterStatut] = useState<StatutProjet | "">("")
  const [filterRegion, setFilterRegion] = useState("")

  // ── Tri ──
  const [sortCol, setSortCol] = useState<SortKey>("dateProchaineEtape")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // ── Pagination ──
  const [page, setPage] = useState(1)

  // ── Régions uniques extraites des données ──
  const uniqueRegions = useMemo(
    () =>
      Array.from(new Set(projets.map((p) => p.region).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "fr"),
      ),
    [projets],
  )

  // ── Données filtrées + triées ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projets
      .filter((p) => {
        if (q) {
          const hay =
            `${p.titre} ${p.codeProjet} ${p.chefProjet} ${p.region}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (filterPhase  && p.phase  !== filterPhase)  return false
        if (filterPrio   && p.priorite !== filterPrio)  return false
        if (filterStatut && p.statut !== filterStatut) return false
        if (filterRegion && p.region !== filterRegion) return false
        return true
      })
      .sort((a, b) => compareProjet(a, b, sortCol, sortDir))
  }, [projets, search, filterPhase, filterPrio, filterStatut, filterRegion, sortCol, sortDir])

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function handleSort(col: SortKey) {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
    setPage(1)
  }

  function resetFilters() {
    setSearch("")
    setFilterPhase("")
    setFilterPrio("")
    setFilterStatut("")
    setFilterRegion("")
    setPage(1)
  }

  const hasFilters =
    !!search || !!filterPhase || !!filterPrio || !!filterStatut || !!filterRegion

  /* ── États de chargement ────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Chargement des projets…
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
            Erreur de chargement
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Vérifiez votre connexion et les permissions SharePoint
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
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
    <div className="space-y-4">

      {/* ── Barre de contrôles ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background:     "rgba(13,26,16,0.7)",
          backdropFilter: "blur(12px)",
          border:         "1px solid #1e3528",
        }}
      >
        {/* Recherche */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher par nom, code, chef de projet, région…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all duration-150"
            style={{
              background: "var(--bg-elevated)",
              border:     "1px solid var(--bg-border)",
              color:      "var(--text-primary)",
              outline:    "none",
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = "#2d9e5f" }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = "var(--bg-border)" }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

          <StyledSelect
            value={filterPhase}
            onChange={(v) => { setFilterPhase(v as PhaseProjet | ""); setPage(1) }}
            options={[
              { label: "Toutes les phases", value: "" },
              ...PHASES_PIPELINE.map((p) => ({ label: p, value: p })),
            ]}
          />

          <StyledSelect
            value={filterPrio}
            onChange={(v) => { setFilterPrio(v as Priorite | ""); setPage(1) }}
            options={[
              { label: "Toutes priorités", value: "" },
              ...PRIORITES.map((p) => ({ label: p, value: p })),
            ]}
          />

          <StyledSelect
            value={filterStatut}
            onChange={(v) => { setFilterStatut(v as StatutProjet | ""); setPage(1) }}
            options={[
              { label: "Tous statuts", value: "" },
              ...STATUTS_PROJET.map((s) => ({ label: s, value: s })),
            ]}
          />

          {uniqueRegions.length > 0 && (
            <StyledSelect
              value={filterRegion}
              onChange={(v) => { setFilterRegion(v); setPage(1) }}
              options={[
                { label: "Toutes régions", value: "" },
                ...uniqueRegions.map((r) => ({ label: r, value: r })),
              ]}
            />
          )}

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
              style={{
                background: "rgba(239,68,68,0.1)",
                border:     "1px solid rgba(239,68,68,0.25)",
                color:      "#f87171",
              }}
            >
              <X size={12} />
              Réinitialiser
            </button>
          )}

          <span
            className="ml-auto text-xs flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            {filtered.length} projet{filtered.length !== 1 ? "s" : ""}
            {hasFilters && (
              <span style={{ color: "var(--text-muted)" }}>
                {" "}sur {projets.length}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid #1e3528" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th label="Code"           col="codeProjet"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={90} />
                <Th label="Projet"         col="titre"              sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={180} />
                <Th label="Région"         col="region"             sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={100} />
                <Th label="Phase"          sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={140} />
                <Th label="Priorité"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={90} />
                <Th label="Chef projet"    col="chefProjet"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={120} />
                <Th label="kWp"            col="puissanceKwp"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" minWidth={80} />
                <Th label="Prochaine étape" col="dateProchaineEtape" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={130} />
                <Th label="Financement"    col="montantFinancement" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" minWidth={130} />
                <Th label="Statut"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} minWidth={100} />
                <th
                  style={{
                    padding:      "10px 14px",
                    background:   "rgba(13,26,16,0.8)",
                    borderBottom: "1px solid #1e3528",
                    minWidth:     60,
                  }}
                />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-16"
                    style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
                  >
                    Aucun projet ne correspond à vos critères de recherche
                  </td>
                </tr>
              ) : (
                paginated.map((p, idx) => {
                  const today     = new Date().toISOString().slice(0, 10)
                  const isRetard  =
                    p.dateProchaineEtape &&
                    p.dateProchaineEtape < today &&
                    p.statut !== "Terminé"
                  const isEven    = idx % 2 === 0

                  return (
                    <tr
                      key={p.id}
                      style={{
                        background:  isEven
                          ? "rgba(13,26,16,0.4)"
                          : "rgba(13,26,16,0.2)",
                        transition:  "background 150ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(45,158,95,0.06)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isEven
                          ? "rgba(13,26,16,0.4)"
                          : "rgba(13,26,16,0.2)"
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <span
                          className="text-xs font-mono font-semibold"
                          style={{ color: "#f0a500" }}
                        >
                          {p.codeProjet || "—"}
                        </span>
                      </td>

                      {/* Titre */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)", maxWidth: 220 }}>
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
                          title={p.titre}
                        >
                          {p.titre || "Sans nom"}
                        </p>
                        {p.partenaire && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: "var(--text-muted)" }}
                            title={p.partenaire}
                          >
                            {p.partenaire}
                          </p>
                        )}
                      </td>

                      {/* Région */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {p.region || "—"}
                        </span>
                      </td>

                      {/* Phase */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <PhaseBadge phase={p.phase} />
                      </td>

                      {/* Priorité */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <PrioriteBadge priorite={p.priorite} />
                      </td>

                      {/* Chef projet */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)", maxWidth: 140 }}>
                        <span
                          className="text-sm truncate block"
                          style={{ color: "var(--text-secondary)" }}
                          title={p.chefProjet}
                        >
                          {p.chefProjet || "—"}
                        </span>
                      </td>

                      {/* kWp */}
                      <td
                        style={{
                          padding:     "10px 14px",
                          borderBottom: "1px solid rgba(30,53,40,0.4)",
                          textAlign:   "right",
                        }}
                      >
                        <span
                          className="text-sm font-mono"
                          style={{ color: p.puissanceKwp ? "#2d9e5f" : "var(--text-muted)" }}
                        >
                          {p.puissanceKwp ? p.puissanceKwp.toLocaleString("fr-FR") : "—"}
                        </span>
                      </td>

                      {/* Prochaine étape */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: isRetard ? "#fbbf24" : "var(--text-secondary)",
                          }}
                        >
                          {formatDate(p.dateProchaineEtape)}
                        </span>
                        {isRetard && (
                          <span
                            className="block text-xs mt-0.5"
                            style={{ color: "#f59e0b" }}
                          >
                            En retard
                          </span>
                        )}
                      </td>

                      {/* Financement */}
                      <td
                        style={{
                          padding:     "10px 14px",
                          borderBottom: "1px solid rgba(30,53,40,0.4)",
                          textAlign:   "right",
                        }}
                      >
                        {p.financementNecessaire ? (
                          <div className="text-right">
                            <span
                              className="text-xs block font-medium"
                              style={{ color: "#a78bfa" }}
                            >
                              {p.montantFinancement
                                ? formatFCFA(p.montantFinancement)
                                : "À définir"}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Requis
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Statut */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <StatutBadge statut={p.statut} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,53,40,0.4)" }}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/suivi/pipeline-projets/projets/${p.id}`)}
                            title="Voir le détail"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                            style={{
                              background: "rgba(45,158,95,0.08)",
                              border:     "1px solid rgba(45,158,95,0.2)",
                              color:      "#2d9e5f",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background   = "rgba(45,158,95,0.18)"
                              e.currentTarget.style.borderColor  = "#2d9e5f"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background  = "rgba(45,158,95,0.08)"
                              e.currentTarget.style.borderColor = "rgba(45,158,95,0.2)"
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/suivi/pipeline-projets/projets/${p.id}/edit`)}
                            title="Modifier"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                            style={{
                              background: "rgba(240,165,0,0.08)",
                              border:     "1px solid rgba(240,165,0,0.2)",
                              color:      "#f0a500",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background  = "rgba(240,165,0,0.18)"
                              e.currentTarget.style.borderColor = "#f0a500"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background  = "rgba(240,165,0,0.08)"
                              e.currentTarget.style.borderColor = "rgba(240,165,0,0.2)"
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Page {currentPage} sur {totalPages} ·{" "}
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{
                background: "var(--bg-elevated)",
                border:     "1px solid var(--bg-border)",
                color:
                  currentPage === 1
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Fenêtre de 5 pages centrée sur la page courante
              let start = Math.max(1, currentPage - 2)
              const end = Math.min(totalPages, start + 4)
              start = Math.max(1, end - 4)
              return start + i
            }).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background:
                    p === currentPage
                      ? "rgba(240,165,0,0.15)"
                      : "var(--bg-elevated)",
                  border:
                    p === currentPage
                      ? "1px solid rgba(240,165,0,0.4)"
                      : "1px solid var(--bg-border)",
                  color:
                    p === currentPage ? "#f0a500" : "var(--text-secondary)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{
                background: "var(--bg-elevated)",
                border:     "1px solid var(--bg-border)",
                color:
                  currentPage === totalPages
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
