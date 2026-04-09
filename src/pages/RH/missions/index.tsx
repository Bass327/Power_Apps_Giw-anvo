import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Briefcase, Plus, Search, ChevronLeft,
  MapPin, Calendar, Truck,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"
import { AccessDenied } from "@/components/shared/AccessDenied"
import type { Mission, StatutMission } from "@/types/rh"
import {
  STATUT_MISSION_CONFIG,
  LABEL_TYPE_MISSION,
  LABEL_MOYEN_TRANSPORT_MISSION,
} from "@/types/rh"
import { FormulaireMission } from "./components/FormulaireMission"
import { DetailMission } from "./components/DetailMission"

import { MISSIONS_MOCK } from "@/data/mockRH"

/* ── Onglets de navigation ── */
type Onglet = "toutes" | "a-approuver" | "en-cours" | "terminees"

interface OngletConfig {
  id:     Onglet
  label:  string
  statuts?: StatutMission[]
}

const ONGLETS: OngletConfig[] = [
  { id: "toutes",      label: "Toutes" },
  { id: "a-approuver", label: "À approuver",  statuts: ["SOUMIS"] },
  { id: "en-cours",    label: "En cours",     statuts: ["APPROUVE", "EN_COURS"] },
  { id: "terminees",   label: "Terminées",    statuts: ["TERMINE"] },
]

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

/* ════════════════════════════════════════════════
   Page principale — Gestion des missions
   ════════════════════════════════════════════════ */

export default function RHMissionsPage() {
  const { role, user }      = useCurrentUser()
  const email               = user?.email
  const navigate             = useNavigate()
  const access               = role ? getModuleAccess(role, "rh") : "none"

  const [missions, setMissions]           = useState<Mission[]>(MISSIONS_MOCK)
  const [onglet, setOnglet]               = useState<Onglet>("toutes")
  const [recherche, setRecherche]         = useState("")
  const [formulaireOuvert, setFormulaire] = useState(false)
  const [missionSelectee, setMission]     = useState<Mission | null>(null)

  if (access === "none") {
    return <AccessDenied message="Accès réservé aux RH et à la direction." />
  }

  /* Filtrage des missions selon l'onglet et la recherche */
  const missionsFiltrees = missions.filter((m) => {
    const cfg = ONGLETS.find((o) => o.id === onglet)
    if (cfg?.statuts && !cfg.statuts.includes(m.statut)) return false

    // Employé voit uniquement ses missions
    if (role === "Employé" && m.demandeur !== email) return false

    if (recherche) {
      const q = recherche.toLowerCase()
      return (
        m.intitule.toLowerCase().includes(q) ||
        m.lieux.toLowerCase().includes(q) ||
        m.demandeur.toLowerCase().includes(q)
      )
    }
    return true
  })

  /* Compteurs pour les badges d'onglet */
  const nbAApprouver = missions.filter(
    (m) => m.statut === "SOUMIS" && (role === "Directrice" || role === "RAF"),
  ).length

  /* Création d'une mission */
  const handleCreer = (
    data: Omit<Mission, "id" | "dateDemande" | "statut">,
    soumettre: boolean,
  ) => {
    const nouvelle: Mission = {
      ...data,
      id:          `m${Date.now()}`,
      dateDemande: new Date().toISOString().slice(0, 10),
      statut:      soumettre ? "SOUMIS" : "BROUILLON",
    }
    setMissions((prev) => [nouvelle, ...prev])
    setFormulaire(false)
    toast.success(soumettre ? "Mission soumise pour approbation" : "Brouillon enregistré")
  }

  /* Approbation d'une mission */
  const handleApprouver = (id: string, commentaire: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, statut: "APPROUVE", commentaireDir: commentaire || "Approuvé", dateApprobation: new Date().toISOString().slice(0, 10) }
          : m,
      ),
    )
    setMission(null)
    toast.success("Mission approuvée")
  }

  /* Rejet d'une mission */
  const handleRejeter = (id: string, commentaire: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, statut: "REJETE", commentaireDir: commentaire || "Rejeté" }
          : m,
      ),
    )
    setMission(null)
    toast.error("Mission rejetée")
  }

  /* ── Rendu ── */
  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── En-tête avec breadcrumb ── */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/rh")}
          style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-secondary)",
            fontFamily: "var(--font-body)", marginBottom: 12,
          }}
        >
          <ChevronLeft size={14} />
          Ressources Humaines
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(240,165,0,0.12)",
                border: "1px solid rgba(240,165,0,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Briefcase size={20} style={{ color: "#f0a500" }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22, fontWeight: 700, margin: 0,
                  color: "var(--text-primary)", fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                Gestion des missions
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Ordres de mission et déplacements terrain
              </p>
            </div>
          </div>

          {/* Bouton nouvelle mission */}
          {access !== "read" && (
            <button
              onClick={() => setFormulaire(true)}
              style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10,
                fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700,
                color: "var(--text-inverse)",
                background: "linear-gradient(135deg, #f0a500, #ffc235)",
              }}
            >
              <Plus size={16} />
              Nouvelle mission
            </button>
          )}
        </div>
      </div>

      {/* ── Statistiques rapides ── */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12, marginBottom: 28,
        }}
      >
        {[
          { label: "Total", value: missions.length, color: "var(--text-primary)" },
          { label: "Soumises",  value: missions.filter((m) => m.statut === "SOUMIS").length,   color: "#60a5fa" },
          { label: "Approuvées", value: missions.filter((m) => m.statut === "APPROUVE").length, color: "#22c55e" },
          { label: "En cours",  value: missions.filter((m) => m.statut === "EN_COURS").length,  color: "#f0a500" },
          { label: "Terminées", value: missions.filter((m) => m.statut === "TERMINE").length,   color: "#34d399" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "14px 18px",
              background: "rgba(13,26,16,0.7)",
              border: "1px solid var(--bg-border)",
              borderRadius: 12,
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {stat.label}
            </p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: stat.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Barre de filtres ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {/* Onglets */}
        <div
          style={{
            display: "flex", gap: 4,
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            borderRadius: 10, padding: 4,
          }}
        >
          {ONGLETS.map((o) => {
            const count = o.id === "a-approuver" ? nbAApprouver : undefined
            return (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                style={{
                  all: "unset", cursor: "pointer",
                  padding: "6px 14px", borderRadius: 7,
                  fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                  background: onglet === o.id ? "var(--bg-border)" : "transparent",
                  color: onglet === o.id ? "var(--text-primary)" : "var(--text-secondary)",
                  transition: "all 150ms",
                }}
              >
                {o.label}
                {count !== undefined && count > 0 && (
                  <span
                    style={{
                      fontSize: 10, fontFamily: "var(--font-display)", fontWeight: 700,
                      color: "var(--text-inverse)",
                      background: "linear-gradient(135deg, #f0a500, #ffc235)",
                      padding: "1px 6px", borderRadius: 20,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Recherche */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            borderRadius: 10, flex: 1, minWidth: 200,
          }}
        >
          <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Rechercher une mission..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{
              all: "unset", flex: 1,
              fontSize: 13, fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* ── Liste des missions ── */}
      {missionsFiltrees.length === 0 ? (
        <div
          style={{
            padding: "60px 24px", textAlign: "center",
            background: "rgba(13,26,16,0.5)",
            border: "1px dashed var(--bg-border)",
            borderRadius: 14,
          }}
        >
          <Briefcase size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Aucune mission trouvée
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {missionsFiltrees.map((mission) => {
            const cfg = STATUT_MISSION_CONFIG[mission.statut]
            return (
              <button
                key={mission.id}
                onClick={() => setMission(mission)}
                style={{
                  all: "unset", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px",
                  background: "rgba(13,26,16,0.7)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 12,
                  transition: "all 150ms",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f0a500"
                  e.currentTarget.style.background   = "rgba(13,26,16,0.9)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--bg-border)"
                  e.currentTarget.style.background   = "rgba(13,26,16,0.7)"
                }}
              >
                {/* Icône type */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "rgba(240,165,0,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Briefcase size={18} style={{ color: "#f0a500" }} />
                </div>

                {/* Infos principales */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 15, fontWeight: 600,
                        color: "var(--text-primary)", fontFamily: "var(--font-display)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {mission.intitule}
                    </span>
                    {mission.collective && (
                      <span style={{ fontSize: 10, color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)", padding: "1px 7px", borderRadius: 20, flexShrink: 0 }}>
                        Collective
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <MapPin size={11} />
                      {mission.lieux}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Calendar size={11} />
                      {formatDate(mission.dateDepart)} → {formatDate(mission.dateRetour)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <Truck size={11} />
                      {LABEL_MOYEN_TRANSPORT_MISSION[mission.moyenTransport]}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {LABEL_TYPE_MISSION[mission.typeMission]}
                    </span>
                  </div>
                </div>

                {/* Durée + statut */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11, fontFamily: "var(--font-body)",
                      color: cfg.color, background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      padding: "3px 10px", borderRadius: 20,
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    {mission.duree} jour{mission.duree > 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {formulaireOuvert && (
        <FormulaireMission
          onClose={() => setFormulaire(false)}
          onSubmit={handleCreer}
          demandeur={email ?? "utilisateur@giwaanvo.com"}
        />
      )}

      {missionSelectee && (
        <DetailMission
          mission={missionSelectee}
          role={role ?? "Employé"}
          onClose={() => setMission(null)}
          onApprouver={handleApprouver}
          onRejeter={handleRejeter}
        />
      )}
    </div>
  )
}
