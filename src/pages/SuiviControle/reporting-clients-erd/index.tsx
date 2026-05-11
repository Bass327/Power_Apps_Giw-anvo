import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart3,
  RefreshCw,
  Wallet,
  CalendarCheck,
  Users,
  UserCheck,
  UserX,
  SlidersHorizontal,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { useClientsERD } from "@/hooks/usePaiementsClientsERD"
import { MOIS_KEYS, MOIS_CONFIG } from "@/types/clientsERD"
import type { MoisKey, ClientERD } from "@/types/clientsERD"

/* ══════════════════════════════════════════════════════════════════════════════
   Utilitaires
   ══════════════════════════════════════════════════════════════════════════════ */
function formatFCFAShort(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return (Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")) + " M FCFA"
  }
  if (n >= 1_000) {
    const v = n / 1_000
    return (Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")) + " K FCFA"
  }
  return Math.round(n) + " FCFA"
}

function formatFCFAFull(n: number): string {
  return n.toLocaleString("fr-FR") + " FCFA"
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

type Statut = "Payé" | "Partiel" | "Impayé"

function getStatut(client: ClientERD, moisActifs: MoisKey[]): Statut {
  const nbPayes = moisActifs.filter((k) => client.paiements[k] > 0).length
  if (nbPayes === 0)              return "Impayé"
  if (nbPayes === moisActifs.length) return "Payé"
  return "Partiel"
}

/* ══════════════════════════════════════════════════════════════════════════════
   Chip filtre
   ══════════════════════════════════════════════════════════════════════════════ */
interface ChipProps { label: string; active: boolean; onClick: () => void }

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 flex-shrink-0"
      style={
        active
          ? { background: "rgba(240,165,0,0.18)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.5)", fontFamily: "'Syne', sans-serif" }
          : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)", fontFamily: "'Syne', sans-serif" }
      }
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "#2d9e5f"; e.currentTarget.style.color = "#3dbf72" } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.color = "var(--text-secondary)" } }}
    >
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   KPI Card — police corrigée, sans subtitle
   ══════════════════════════════════════════════════════════════════════════════ */
type AccentColor = "gold" | "green" | "blue" | "red"

interface KpiCardProps {
  icon:    React.ElementType
  label:   string
  value:   string
  accent?: AccentColor
}

const KPI_COLORS: Record<AccentColor, { iconBg: string; iconBorder: string; iconColor: string; valueBg: string }> = {
  gold:  { iconBg: "rgba(240,165,0,0.12)",  iconBorder: "rgba(240,165,0,0.25)",  iconColor: "#f0a500", valueBg: "rgba(240,165,0,0.06)"  },
  green: { iconBg: "rgba(45,158,95,0.12)",  iconBorder: "rgba(45,158,95,0.25)",  iconColor: "#3dbf72", valueBg: "rgba(45,158,95,0.06)"  },
  blue:  { iconBg: "rgba(59,130,246,0.12)", iconBorder: "rgba(59,130,246,0.25)", iconColor: "#60a5fa", valueBg: "rgba(59,130,246,0.06)" },
  red:   { iconBg: "rgba(239,68,68,0.10)",  iconBorder: "rgba(239,68,68,0.25)",  iconColor: "#ef4444", valueBg: "rgba(239,68,68,0.06)"  },
}

/** Sépare "14,1 M FCFA" → { main: "14,1 M", currency: "FCFA" } */
function splitKpiValue(value: string): { main: string; currency?: string } {
  const idx = value.lastIndexOf(" FCFA")
  if (idx === -1) return { main: value }
  return { main: value.slice(0, idx).trim(), currency: "FCFA" }
}

function KpiCard({ icon: Icon, label, value, accent = "green" }: KpiCardProps) {
  const c = KPI_COLORS[accent]
  const { main, currency } = splitKpiValue(value)

  return (
    <div
      className="glass-card rounded-2xl flex flex-col gap-4 p-6"
      style={{ minHeight: 130 }}
    >
      {/* Icône + libellé */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}
        >
          <Icon size={17} style={{ color: c.iconColor }} />
        </div>
        <p
          className="text-sm leading-snug"
          style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
        >
          {label}
        </p>
      </div>

      {/* Valeur principale */}
      <p className="kpi-value" style={{ color: "var(--text-primary)" }}>
        {main}
        {currency && (
          <span className="kpi-currency"> {currency}</span>
        )}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Badge statut — Payé / Partiel / Impayé
   ══════════════════════════════════════════════════════════════════════════════ */
const STATUT_STYLES: Record<Statut, { bg: string; color: string; border: string }> = {
  "Payé":    { bg: "rgba(34,197,94,0.1)",  color: "#22c55e", border: "rgba(34,197,94,0.3)"  },
  "Partiel": { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  "Impayé":  { bg: "rgba(239,68,68,0.1)",  color: "#ef4444", border: "rgba(239,68,68,0.3)"  },
}

function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUT_STYLES[statut]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: "'Syne', sans-serif" }}
    >
      {statut}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Tableau détail des paiements
   ══════════════════════════════════════════════════════════════════════════════ */
type SortKey = "nomComplet" | "village" | "totalPeriode" | "nbMoisPayes" | "statut" | "modified"
type SortDir = "asc" | "desc"

interface PaiementsTableProps {
  clients:    ClientERD[]
  moisActifs: MoisKey[]
}

function PaiementsTable({ clients, moisActifs }: PaiementsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("nomComplet")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [search,  setSearch]  = useState("")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const rows = useMemo(() => {
    const filtered = clients.filter((c) =>
      !search ||
      c.nomComplet.toLowerCase().includes(search.toLowerCase()) ||
      c.village.toLowerCase().includes(search.toLowerCase()) ||
      c.idClient.toLowerCase().includes(search.toLowerCase())
    )

    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "nomComplet":   return dir * a.nomComplet.localeCompare(b.nomComplet, "fr")
        case "village":      return dir * a.village.localeCompare(b.village, "fr")
        case "totalPeriode": {
          const ta = moisActifs.reduce((s, k) => s + a.paiements[k], 0)
          const tb = moisActifs.reduce((s, k) => s + b.paiements[k], 0)
          return dir * (ta - tb)
        }
        case "nbMoisPayes": {
          const na = moisActifs.filter((k) => a.paiements[k] > 0).length
          const nb = moisActifs.filter((k) => b.paiements[k] > 0).length
          return dir * (na - nb)
        }
        case "statut": {
          const order: Record<Statut, number> = { Payé: 0, Partiel: 1, Impayé: 2 }
          return dir * (order[getStatut(a, moisActifs)] - order[getStatut(b, moisActifs)])
        }
        case "modified": return dir * a.modified.localeCompare(b.modified)
        default: return 0
      }
    })
  }, [clients, moisActifs, search, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === "asc"
      ? <ChevronUp   size={12} style={{ color: "#f0a500" }} />
      : <ChevronDown size={12} style={{ color: "#f0a500" }} />
  }

  function ThBtn({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="px-4 py-3 text-left cursor-pointer select-none whitespace-nowrap"
        style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {children}
          <SortIcon col={col} />
        </span>
      </th>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}
    >
      {/* En-tête tableau */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 flex-wrap" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        <div>
          <h2 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            Détail des paiements clients
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            {rows.length} client{rows.length !== 1 ? "s" : ""} · exercice Nov 2025 – Oct 2026
          </p>
        </div>

        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher un client, un village…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl px-4 py-2 text-sm outline-none w-64 max-w-full"
          style={{
            background:  "var(--bg-elevated)",
            border:      "1px solid var(--bg-border)",
            color:       "var(--text-primary)",
            fontFamily:  "'DM Sans', sans-serif",
          }}
          onFocus={(e)  => (e.currentTarget.style.borderColor = "#2d9e5f")}
          onBlur={(e)   => (e.currentTarget.style.borderColor = "var(--bg-border)")}
        />
      </div>

      {/* Tableau avec scroll horizontal */}
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={36} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
              Aucune donnée disponible pour les filtres sélectionnés.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)", background: "var(--bg-elevated)" }}>
                <ThBtn col="nomComplet">Client</ThBtn>
                <ThBtn col="village">Village</ThBtn>
                <th className="px-4 py-3 text-left whitespace-nowrap" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Service
                </th>
                <ThBtn col="totalPeriode">Total payé</ThBtn>
                <ThBtn col="nbMoisPayes">Mois payés</ThBtn>
                <ThBtn col="statut">Statut</ThBtn>
                <ThBtn col="modified">Modifié le</ThBtn>
              </tr>
            </thead>
            <tbody>
              {rows.map((client, idx) => {
                const totalPeriode = moisActifs.reduce((s, k) => s + client.paiements[k], 0)
                const nbMoisPayes  = moisActifs.filter((k) => client.paiements[k] > 0).length
                const statut       = getStatut(client, moisActifs)
                const isEven       = idx % 2 === 0

                return (
                  <tr
                    key={client.id}
                    style={{
                      background:   isEven ? "transparent" : "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                  >
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
                          {client.nomComplet || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                          {client.idClient}
                        </p>
                      </div>
                    </td>

                    {/* Village */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
                      {client.village || "—"}
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
                      {client.typeService || "—"}
                    </td>

                    {/* Total payé */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: totalPeriode > 0 ? "#3dbf72" : "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}
                      >
                        {totalPeriode > 0 ? formatFCFAFull(totalPeriode) : "—"}
                      </span>
                    </td>

                    {/* Mois payés */}
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums"
                        style={{
                          background:  nbMoisPayes === moisActifs.length
                            ? "rgba(34,197,94,0.1)"
                            : nbMoisPayes > 0
                              ? "rgba(245,158,11,0.08)"
                              : "rgba(239,68,68,0.08)",
                          color: nbMoisPayes === moisActifs.length ? "#22c55e" : nbMoisPayes > 0 ? "#f59e0b" : "#ef4444",
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {nbMoisPayes} / {moisActifs.length}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatutBadge statut={statut} />
                    </td>

                    {/* Modifié le */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                      {formatDate(client.modified)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pied de tableau */}
      {rows.length > 0 && (
        <div
          className="px-6 py-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderTop: "1px solid var(--bg-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            {rows.length} entrée{rows.length !== 1 ? "s" : ""} affichée{rows.length !== 1 ? "s" : ""}
            {search ? ` · filtrées par "${search}"` : ""}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            Cliquez sur un en-tête de colonne pour trier
          </p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Page principale — Reporting Clients ERD
   ══════════════════════════════════════════════════════════════════════════════ */
export default function ReportingClientsERDPage() {
  const navigate = useNavigate()
  const { clients, isLoading, isError, error, refetch } = useClientsERD()

  /* ── Filtres ────────────────────────────────────────────────────────────── */
  const [selectedMois,     setSelectedMois]     = useState<MoisKey[]>([])
  const [selectedVillages, setSelectedVillages] = useState<string[]>([])

  const villages = useMemo(
    () => [...new Set(clients.map((c) => c.village).filter((v) => v && v !== "—"))].sort((a, b) => a.localeCompare(b, "fr")),
    [clients],
  )

  const toggleMois    = (key: MoisKey) =>
    setSelectedMois((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key])

  const toggleVillage = (v: string) =>
    setSelectedVillages((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])

  const selectAllVillages = () =>
    setSelectedVillages((p) => p.length === villages.length ? [] : [...villages])

  const resetFiltres = () => {
    setSelectedMois([])
    setSelectedVillages([])
  }

  const nbFiltresActifs = selectedMois.length + selectedVillages.length

  /* ── Clients filtrés par Village ────────────────────────────────────────── */
  const clientsFiltres = useMemo(
    () => clients.filter((c) => selectedVillages.length === 0 || selectedVillages.includes(c.village)),
    [clients, selectedVillages],
  )

  const moisActifs = selectedMois.length > 0 ? selectedMois : MOIS_KEYS

  /* ── KPI 1 — Montant total encaissé ─────────────────────────────────────── */
  const montantTotalEncaisse = useMemo(
    () => clientsFiltres.reduce((sum, c) => sum + moisActifs.reduce((s, k) => s + c.paiements[k], 0), 0),
    [clientsFiltres, moisActifs],
  )

  /* ── KPI 2 — Montant encaissé ce mois (via Modified) ────────────────────── */
  const now             = new Date()
  const currentMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const moisCourantLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

  const montantEncaisseMoisCourant = useMemo(
    () =>
      clientsFiltres
        .filter((c) => c.modified.slice(0, 7) === currentMonthISO)
        .reduce((sum, c) => sum + MOIS_KEYS.reduce((s, k) => s + c.paiements[k], 0), 0),
    [clientsFiltres, currentMonthISO],
  )

  /* ── KPI 3 — Nombre total de clients ────────────────────────────────────── */
  const nombreTotalClients = clientsFiltres.length

  /* ── KPI 4 — Clients ayant payé (≥ 1 paiement sur les mois actifs) ──────── */
  const nbClientsAyantPaye = useMemo(
    () => clientsFiltres.filter((c) => moisActifs.some((k) => c.paiements[k] > 0)).length,
    [clientsFiltres, moisActifs],
  )

  /* ── KPI 5 — Clients n'ayant pas payé (0 sur tous les mois actifs) ─────── */
  const nbClientsNonPayeurs = useMemo(
    () => clientsFiltres.filter((c) => moisActifs.every((k) => c.paiements[k] === 0)).length,
    [clientsFiltres, moisActifs],
  )

  /* ════════════════════════════════════════════════════════════════════════
     États loading / error
  ════════════════════════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#f0a500", borderTopColor: "transparent" }}
        />
        <p style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
          Chargement des données clients ERD…
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="m-6 rounded-2xl p-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <p className="font-semibold mb-2" style={{ color: "#ef4444", fontFamily: "'Syne', sans-serif" }}>
          Impossible de charger les données
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{error?.message ?? "Erreur inconnue"}</p>
        <ul className="text-xs space-y-1 mb-4" style={{ color: "var(--text-muted)" }}>
          <li>• Site SharePoint : <code>giwaanvoenergy961.sharepoint.com/sites/DTO</code></li>
          <li>• Nom de la liste : <code>Paiements_Clients_Kolda_ERD</code></li>
          <li>• Scope requis : <code>Sites.ReadWrite.All</code></li>
        </ul>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     Rendu principal
  ════════════════════════════════════════════════════════════════════════ */
  const allVillagesSelected = selectedVillages.length === villages.length

  return (
    <div className="space-y-6 p-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">

          <button
            onClick={() => navigate("/suivi")}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2d9e5f"; e.currentTarget.style.color = "#2d9e5f" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.color = "var(--text-secondary)" }}
            title="Retour à Suivi & Contrôle"
          >
            <ArrowLeft size={16} />
          </button>

          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.25)" }}
          >
            <BarChart3 size={22} style={{ color: "#f0a500" }} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                Suivi &amp; Contrôle
              </span>
              <span style={{ color: "var(--bg-border)" }}>/</span>
              <h1 className="text-xl font-bold truncate" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                Reporting Clients ERD
              </h1>
            </div>
            <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
              Kolda — exercice Nov 2025 / Oct 2026
            </p>
          </div>
        </div>

        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150 flex-shrink-0"
          style={{ background: "rgba(45,158,95,0.08)", border: "1px solid rgba(45,158,95,0.25)", color: "#2d9e5f", fontFamily: "'Syne', sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(45,158,95,0.14)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(45,158,95,0.08)" }}
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
      >
        {/* Titre + reset */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} style={{ color: "#f0a500" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
              Filtres
            </span>
            {nbFiltresActifs > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(240,165,0,0.12)", color: "#f0a500", border: "1px solid rgba(240,165,0,0.3)", fontFamily: "'Syne', sans-serif" }}
              >
                {nbFiltresActifs} actif{nbFiltresActifs > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {nbFiltresActifs > 0 && (
            <button
              onClick={resetFiltres}
              className="flex items-center gap-1 text-xs transition-colors duration-150"
              style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              <X size={11} /> Réinitialiser tout
            </button>
          )}
        </div>

        {/* Bloc Mois */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
              Mois
            </p>
            {selectedMois.length > 0 && (
              <button
                onClick={() => setSelectedMois([])}
                className="text-xs transition-colors"
                style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Effacer
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MOIS_KEYS.map((key) => (
              <Chip
                key={key}
                label={MOIS_CONFIG[key].shortLabel}
                active={selectedMois.includes(key)}
                onClick={() => toggleMois(key)}
              />
            ))}
          </div>
        </div>

        {/* Séparateur */}
        {villages.length > 0 && (
          <div style={{ height: 1, background: "var(--bg-border)" }} />
        )}

        {/* Bloc Village */}
        {villages.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
                Village
              </p>
              <button
                onClick={selectAllVillages}
                className="text-xs transition-colors"
                style={{ color: allVillagesSelected ? "#f0a500" : "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f0a500")}
                onMouseLeave={(e) => (e.currentTarget.style.color = allVillagesSelected ? "#f0a500" : "var(--text-muted)")}
              >
                {allVillagesSelected ? "Désélectionner tout" : "Tout sélectionner"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {villages.map((v) => (
                <Chip
                  key={v}
                  label={v}
                  active={selectedVillages.includes(v)}
                  onClick={() => toggleVillage(v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs ligne 1 — financiers ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon={Wallet}
          accent="gold"
          label="Montant total encaissé"
          value={formatFCFAFull(montantTotalEncaisse)}
        />
        <KpiCard
          icon={CalendarCheck}
          accent="green"
          label={`Encaissé en ${moisCourantLabel}`}
          value={formatFCFAFull(montantEncaisseMoisCourant)}
        />
        <KpiCard
          icon={Users}
          accent="blue"
          label="Nombre de clients"
          value={nombreTotalClients.toLocaleString("fr-FR")}
        />
      </div>

      {/* ── KPIs ligne 2 — payeurs ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          icon={UserCheck}
          accent="green"
          label="Clients ayant payé"
          value={nbClientsAyantPaye.toLocaleString("fr-FR")}
        />
        <KpiCard
          icon={UserX}
          accent="red"
          label="Clients n'ayant pas payé"
          value={nbClientsNonPayeurs.toLocaleString("fr-FR")}
        />
      </div>

      {/* ── Tableau détaillé ─────────────────────────────────────────────── */}
      <PaiementsTable clients={clientsFiltres} moisActifs={moisActifs} />

      {/* ── Note de bas de page ──────────────────────────────────────────── */}
      <p className="text-xs text-center" style={{ color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
        Source : <code style={{ color: "var(--text-muted)" }}>Paiements_Clients_Kolda_ERD</code> — site DTO ·
        Encaissé ce mois : lignes dont <code style={{ color: "var(--text-muted)" }}>Modified</code> ∈ {moisCourantLabel} ·
        Payeurs : ≥ 1 paiement sur la période · Actualisation toutes les 5 min
      </p>

    </div>
  )
}
