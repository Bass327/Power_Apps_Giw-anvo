/* ═══════════════════════════════════════════════════════════════════════════
   HistoriqueView — Journal d'activité global du pipeline
   Données : usePipelineUpdates() + useProjets()
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react"
import {
  History,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Filter,
  User,
  Calendar,
  Activity,
  X,
} from "lucide-react"
import { useProjets, usePipelineUpdates } from "@/hooks/usePipeline"
import type { PipelineUpdate } from "@/types/pipeline"

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 30

// ─── Utilitaires de date ──────────────────────────────────────────────────────

const TODAY     = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

function dayKey(iso: string): string {
  if (!iso) return "Inconnu"
  return iso.slice(0, 10)
}

function dayLabel(dateKey: string): string {
  if (dateKey === TODAY)     return "Aujourd'hui"
  if (dateKey === YESTERDAY) return "Hier"
  try {
    return new Date(dateKey).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
  } catch {
    return dateKey
  }
}

function timeLabel(iso: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

// ─── Select stylisé ───────────────────────────────────────────────────────────

function StyledSelect({
  value,
  onChange,
  options,
  maxWidth = "260px",
}: {
  value:    string
  onChange: (v: string) => void
  options:  { label: string; value: string }[]
  maxWidth?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg text-sm flex-shrink-0"
      style={{
        background: "var(--bg-elevated)",
        border:     "1px solid var(--bg-border)",
        color:      value ? "var(--text-primary)" : "var(--text-secondary)",
        padding:    "6px 10px",
        fontFamily: "'Syne', sans-serif",
        fontSize:   "0.8125rem",
        outline:    "none",
        cursor:     "pointer",
        maxWidth,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Entrée d'historique ──────────────────────────────────────────────────────

function UpdateEntry({
  update,
  projetCode,
  projetTitre,
  isLast,
}: {
  update:      PipelineUpdate
  projetCode:  string
  projetTitre: string
  isLast:      boolean
}) {
  const time = timeLabel(update.created)

  return (
    <div className="relative flex gap-4">
      {/* Dot + ligne verticale */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: "16px" }}>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{
            background: "#f0a500",
            boxShadow:  "0 0 6px rgba(240,165,0,0.35)",
            zIndex:     1,
          }}
        />
        {!isLast && (
          <div
            className="flex-1 w-0.5 mt-1"
            style={{ background: "rgba(240,165,0,0.12)", minHeight: "20px" }}
          />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-4">
        <div
          className="rounded-xl p-3.5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
        >
          {/* Ligne haute : auteur + projet + heure */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Auteur */}
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                background: "rgba(240,165,0,0.1)",
                color:      "#f0a500",
                border:     "1px solid rgba(240,165,0,0.25)",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              <User size={9} />
              {update.auteur || "Système"}
            </span>

            {/* Projet */}
            {projetCode && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background:    "rgba(45,158,95,0.1)",
                  color:         "#2d9e5f",
                  border:        "1px solid rgba(45,158,95,0.2)",
                  fontFamily:    "'Syne', sans-serif",
                  letterSpacing: "0.04em",
                }}
                title={projetTitre}
              >
                {projetCode}
              </span>
            )}

            {/* Heure */}
            {time && (
              <span
                className="ml-auto text-xs flex items-center gap-1 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                <Calendar size={9} />
                {time}
              </span>
            )}
          </div>

          {/* Description */}
          {update.description && (
            <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
              {update.description}
            </p>
          )}

          {/* Champ modifié : ancienne → nouvelle valeur */}
          {update.champModifie && (
            <div
              className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t"
              style={{ borderColor: "rgba(30,53,40,0.4)", color: "var(--text-secondary)" }}
            >
              <span
                className="font-semibold"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}
              >
                {update.champModifie}
              </span>
              {update.ancienneValeur && (
                <>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                  >
                    {update.ancienneValeur}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>→</span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
                  >
                    {update.nouvelleValeur || "—"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoriqueView() {
  // ── Données ──────────────────────────────────────────────────────────────
  const { data: projets  = [], isLoading: loadingProjets                        } = useProjets()
  const { data: updates  = [], isLoading: loadingUpdates, isError, refetch      } = usePipelineUpdates()

  // ── État local ────────────────────────────────────────────────────────────
  const [filterProjet, setFilterProjet] = useState("")
  const [filterAuteur, setFilterAuteur] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // ── Index projet id → { code, titre } ────────────────────────────────────
  const projetIndex = useMemo(
    () =>
      new Map(projets.map((p) => [p.id, { code: p.codeProjet, titre: p.titre }])),
    [projets],
  )

  // ── Auteurs uniques pour le filtre ────────────────────────────────────────
  const uniqueAuteurs = useMemo(() => {
    const set = new Set(updates.map((u) => u.auteur).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
  }, [updates])

  // ── Entrées filtrées + triées (plus récent en premier) ───────────────────
  const filtered = useMemo(() => {
    return [...updates]
      .filter((u) => {
        if (filterProjet && u.projetId !== filterProjet) return false
        if (filterAuteur && u.auteur  !== filterAuteur)  return false
        return true
      })
      .sort((a, b) => b.created.localeCompare(a.created))
  }, [updates, filterProjet, filterAuteur])

  // ── Entrées visibles (pagination "Voir plus") ─────────────────────────────
  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  // ── Groupement par jour ───────────────────────────────────────────────────
  const groups = useMemo((): { dateKey: string; entries: PipelineUpdate[] }[] => {
    const map = new Map<string, PipelineUpdate[]>()
    for (const u of visible) {
      const key = dayKey(u.created)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(u)
    }
    return Array.from(map.entries()).map(([dateKey, entries]) => ({ dateKey, entries }))
  }, [visible])

  // ── Statistiques ─────────────────────────────────────────────────────────
  const lastActivity = updates.length > 0
    ? [...updates].sort((a, b) => b.created.localeCompare(a.created))[0].created
    : null

  const hasFilters = !!filterProjet || !!filterAuteur

  // ── Réinitialisation ──────────────────────────────────────────────────────
  function resetFilters() {
    setFilterProjet("")
    setFilterAuteur("")
  }

  // ── États de chargement ───────────────────────────────────────────────────

  if (loadingUpdates || loadingProjets) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Erreur de chargement de l'historique
        </p>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: "rgba(45,158,95,0.12)", border: "1px solid rgba(45,158,95,0.3)", color: "#2d9e5f" }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-2xl"
        style={{ background: "var(--bg-surface)", border: "1px dashed var(--bg-border)" }}
      >
        <History size={32} style={{ color: "#2d9e5f", opacity: 0.4 }} />
        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
        >
          Aucune activité enregistrée
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Les modifications de projets apparaîtront automatiquement ici
        </p>
      </div>
    )
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barre de statistiques ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 flex-wrap p-4 rounded-2xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)" }}
          >
            <Activity size={15} style={{ color: "#f0a500" }} />
          </div>
          <div>
            <div
              className="text-lg font-extrabold leading-none"
              style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
            >
              {updates.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              entrée{updates.length !== 1 ? "s" : ""} au total
            </div>
          </div>
        </div>

        {lastActivity && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(45,158,95,0.08)", border: "1px solid rgba(45,158,95,0.2)" }}
            >
              <Calendar size={15} style={{ color: "#2d9e5f" }} />
            </div>
            <div>
              <div
                className="text-sm font-semibold leading-none"
                style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
              >
                {dayLabel(dayKey(lastActivity))}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                dernière activité
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <User size={15} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <div
              className="text-lg font-extrabold leading-none"
              style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
            >
              {uniqueAuteurs.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              contributeur{uniqueAuteurs.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* ── Barre de contrôles ────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--bg-border)" }}
      >
        <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

        <StyledSelect
          value={filterProjet}
          onChange={setFilterProjet}
          options={[
            { label: "Tous les projets", value: "" },
            ...projets.map((p) => ({ label: `${p.codeProjet} — ${p.titre}`, value: p.id })),
          ]}
        />

        {uniqueAuteurs.length > 0 && (
          <StyledSelect
            value={filterAuteur}
            onChange={setFilterAuteur}
            options={[
              { label: "Tous les auteurs", value: "" },
              ...uniqueAuteurs.map((a) => ({ label: a, value: a })),
            ]}
            maxWidth="180px"
          />
        )}

        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
          {hasFilters && (
            <span style={{ color: "var(--text-muted)" }}> sur {updates.length}</span>
          )}
        </span>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150"
            style={{
              background: "rgba(239,68,68,0.08)",
              border:     "1px solid rgba(239,68,68,0.2)",
              color:      "#f87171",
            }}
          >
            <X size={11} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Timeline groupée par jour ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: "var(--bg-surface)", border: "1px dashed var(--bg-border)" }}
        >
          <History size={28} style={{ color: "#2d9e5f", opacity: 0.4 }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucune entrée ne correspond à vos filtres
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ dateKey, entries }) => (
            <div key={dateKey} className="space-y-0">

              {/* En-tête du groupe de jour */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-bold capitalize"
                  style={{
                    color:      dateKey === TODAY ? "#f0a500" : "var(--text-secondary)",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {dayLabel(dateKey)}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--bg-border)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {entries.length} entrée{entries.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Ligne dorée verticale du groupe + entrées */}
              <div className="relative pl-6">
                {/* Ligne verticale du groupe */}
                <div
                  className="absolute left-1.5 top-0 bottom-0 w-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(to bottom, rgba(240,165,0,0.4), rgba(240,165,0,0.05))",
                  }}
                />

                {entries.map((u, i) => {
                  const proj = projetIndex.get(u.projetId)
                  return (
                    <UpdateEntry
                      key={u.id}
                      update={u}
                      projetCode={proj?.code  ?? ""}
                      projetTitre={proj?.titre ?? ""}
                      isLast={i === entries.length - 1}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Bouton Voir plus ─────────────────────────────────────────── */}
          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: "rgba(45,158,95,0.1)",
                  border:     "1px solid rgba(45,158,95,0.25)",
                  color:      "#2d9e5f",
                  fontFamily: "'Syne', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background   = "rgba(45,158,95,0.18)"
                  e.currentTarget.style.borderColor  = "#2d9e5f"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background  = "rgba(45,158,95,0.1)"
                  e.currentTarget.style.borderColor = "rgba(45,158,95,0.25)"
                }}
              >
                Voir plus
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  ({filtered.length - visibleCount} restante{filtered.length - visibleCount !== 1 ? "s" : ""})
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
