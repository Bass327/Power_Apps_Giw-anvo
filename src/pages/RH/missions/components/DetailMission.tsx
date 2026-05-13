import { X, Briefcase, MapPin, Calendar, Truck, Users, DollarSign, CheckCircle, XCircle } from "lucide-react"
import type { Mission } from "@/types/rh"
import {
  STATUT_MISSION_CONFIG,
  LABEL_TYPE_MISSION,
  LABEL_MOYEN_TRANSPORT_MISSION,
} from "@/types/rh"
import type { UserRole } from "@/types/user"
import { useState } from "react"

/* ── Props ── */
interface Props {
  mission:           Mission
  role:              UserRole
  onClose:           () => void
  onApprouver:       (id: string, commentaire: string) => void
  onRejeter:         (id: string, commentaire: string) => void
}

/* ── Utilitaires ── */
function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

function formatMontant(montant?: number): string {
  if (!montant) return "—"
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA"
}

/* ── Ligne de détail ── */
function DetailRow({ icon: Icon, label, value }: {
  icon:  React.FC<{ size?: number; style?: React.CSSProperties }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid rgba(30,53,40,0.5)",
      }}
    >
      <div style={{ width: 18, marginTop: 2, flexShrink: 0 }}>
        <Icon size={15} style={{ color: "var(--text-muted)" }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Composant principal
   ════════════════════════════════════════════════ */

export function DetailMission({ mission, role, onClose, onApprouver, onRejeter }: Props) {
  const [commentaire, setCommentaire] = useState("")
  const [action, setAction]           = useState<"approuver" | "rejeter" | null>(null)

  const cfg = STATUT_MISSION_CONFIG[mission.statut]

  /* La DG et le RAF peuvent approuver toute mission soumise */
  const peutApprouver = (role === "Directrice" || role === "RAF") && mission.statut === "SOUMIS"

  const handleConfirm = () => {
    if (!action) return
    if (action === "approuver") onApprouver(mission.id, commentaire)
    else                        onRejeter(mission.id, commentaire)
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--modal-overlay)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: "100%", maxWidth: 600,
          maxHeight: "90vh", overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: "22px 28px 18px",
            borderBottom: "1px solid var(--bg-border)",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11, fontFamily: "var(--font-body)",
                  color: cfg.color, background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  padding: "2px 10px", borderRadius: 20,
                }}
              >
                {cfg.label}
              </span>
              {mission.collective && (
                <span
                  style={{
                    fontSize: 11, fontFamily: "var(--font-body)",
                    color: "#a78bfa", background: "rgba(167,139,250,0.10)",
                    border: "1px solid rgba(167,139,250,0.30)",
                    padding: "2px 10px", borderRadius: 20,
                  }}
                >
                  Collective
                </span>
              )}
            </div>
            <h2
              style={{
                margin: 0, fontSize: 18, fontWeight: 700,
                color: "var(--text-primary)", fontFamily: "var(--font-display)",
              }}
            >
              {mission.intitule}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Demandé par {mission.demandeur} · {formatDate(mission.dateDemande)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset", cursor: "pointer",
              width: 32, height: 32, borderRadius: 8,
              background: "var(--bg-elevated)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 0 }}>

          <DetailRow
            icon={Briefcase}
            label="Type de mission"
            value={LABEL_TYPE_MISSION[mission.typeMission]}
          />
          {mission.region && (
            <DetailRow
              icon={MapPin}
              label="Région"
              value={mission.region}
            />
          )}
          <DetailRow
            icon={MapPin}
            label="Lieu(x)"
            value={mission.lieux}
          />
          <DetailRow
            icon={Calendar}
            label="Période"
            value={`${formatDate(mission.dateDepart)} → ${formatDate(mission.dateRetour)} (${mission.duree} jour${mission.duree > 1 ? "s" : ""})`}
          />
          <DetailRow
            icon={Truck}
            label="Moyen de transport"
            value={LABEL_MOYEN_TRANSPORT_MISSION[mission.moyenTransport]}
          />
          {mission.collective && mission.participants && mission.participants.length > 0 && (
            <DetailRow
              icon={Users}
              label={`Participants (${mission.participants.length})`}
              value={
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {mission.participants.map((p) => (
                    <span
                      key={p}
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        background: "rgba(45,158,95,0.10)",
                        border: "1px solid rgba(45,158,95,0.25)",
                        borderRadius: 20,
                        fontSize: 12,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              }
            />
          )}
          {!mission.collective && mission.participants && mission.participants.length > 0 && (
            <DetailRow
              icon={Users}
              label="Participant"
              value={mission.participants[0]}
            />
          )}
          {mission.besoinAvance && (
            <DetailRow
              icon={DollarSign}
              label="Avance demandée"
              value={formatMontant(mission.montantAvance)}
            />
          )}

          {/* Objectifs */}
          <div style={{ padding: "16px 0" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Objectifs de la mission
            </p>
            <div
              style={{
                padding: "12px 14px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                border: "1px solid var(--bg-border)",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              {mission.objectif.split("\n").filter(Boolean).map((obj, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      marginTop: 6, width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: "var(--green-vivid)", display: "inline-block",
                    }}
                  />
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                    {obj}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Commentaire de la Directrice si approuvé */}
          {mission.commentaireDir && (
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 8,
                marginTop: 4,
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#22c55e", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Décision — Directrice · {formatDate(mission.dateApprobation ?? "")}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                {mission.commentaireDir}
              </p>
            </div>
          )}

          {/* Zone d'action — Directrice */}
          {peutApprouver && (
            <div
              style={{
                marginTop: 20,
                padding: "18px",
                background: "var(--bg-elevated)",
                borderRadius: 10,
                border: "1px solid var(--bg-border)",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {role === "Directrice" ? "Décision de la Directrice Générale" : "Décision du RAF"}
              </p>
              <textarea
                rows={3}
                placeholder="Commentaire (optionnel)..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", boxSizing: "border-box",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 13, fontFamily: "var(--font-body)",
                  resize: "vertical", outline: "none",
                }}
              />

              {action ? (
                /* Confirmation */
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)", flex: 1 }}>
                    Confirmer la décision : <strong style={{ color: action === "approuver" ? "#22c55e" : "#ef4444" }}>
                      {action === "approuver" ? "Approbation" : "Rejet"}
                    </strong> ?
                  </p>
                  <button
                    onClick={() => setAction(null)}
                    style={{
                      all: "unset", cursor: "pointer",
                      padding: "8px 14px", borderRadius: 8,
                      fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600,
                      color: "var(--text-secondary)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--bg-border)",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      all: "unset", cursor: "pointer",
                      padding: "8px 18px", borderRadius: 8,
                      fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700,
                      color: "var(--text-inverse)",
                      background: action === "approuver"
                        ? "linear-gradient(135deg, #22c55e, #16a34a)"
                        : "#ef4444",
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              ) : (
                /* Choix de l'action */
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setAction("rejeter")}
                    style={{
                      all: "unset", cursor: "pointer", flex: 1,
                      padding: "10px", borderRadius: 8, textAlign: "center",
                      fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
                      color: "#ef4444",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.30)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <XCircle size={15} />
                    Rejeter
                  </button>
                  <button
                    onClick={() => setAction("approuver")}
                    style={{
                      all: "unset", cursor: "pointer", flex: 2,
                      padding: "10px", borderRadius: 8, textAlign: "center",
                      fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700,
                      color: "var(--text-inverse)",
                      background: "linear-gradient(135deg, #f0a500, #ffc235)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <CheckCircle size={15} />
                    Approuver la mission
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
