import { useState } from "react"
import { X, Briefcase, MapPin, Calendar, Truck, Users, DollarSign } from "lucide-react"
import type { Mission, TypeMission, MoyenTransportMission } from "@/types/rh"
import {
  LABEL_TYPE_MISSION,
  LABEL_MOYEN_TRANSPORT_MISSION,
} from "@/types/rh"

/* ── Types internes ── */
interface Props {
  onClose:   () => void
  onSubmit:  (mission: Omit<Mission, "id" | "dateDemande" | "statut">, soumettre: boolean) => void
  demandeur: string
}

type FormData = {
  intitule:          string
  typeMission:       TypeMission | ""
  objectif:          string
  lieux:             string
  dateDepart:        string
  dateRetour:        string
  moyenTransport:    MoyenTransportMission | ""
  collective:        boolean
  nombreParticipants: string
  besoinAvance:      boolean
  montantAvance:     string
}

const FORM_INIT: FormData = {
  intitule:           "",
  typeMission:        "",
  objectif:           "",
  lieux:              "",
  dateDepart:         "",
  dateRetour:         "",
  moyenTransport:     "",
  collective:         false,
  nombreParticipants: "",
  besoinAvance:       false,
  montantAvance:      "",
}

/* ── Styles réutilisables ── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--bg-border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12, fontFamily: "var(--font-body)",
  color: "var(--text-secondary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

/* ════════════════════════════════════════════════
   Composant formulaire
   ════════════════════════════════════════════════ */

export function FormulaireMission({ onClose, onSubmit, demandeur }: Props) {
  const [form, setForm]       = useState<FormData>(FORM_INIT)
  const [errors, setErrors]   = useState<Partial<Record<keyof FormData, string>>>({})

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  /* Calcul automatique de la durée en jours */
  const dureeJours = (() => {
    if (!form.dateDepart || !form.dateRetour) return 0
    const diff = new Date(form.dateRetour).getTime() - new Date(form.dateDepart).getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  })()

  /* Validation du formulaire */
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.intitule.trim())    newErrors.intitule    = "L'intitulé est requis"
    if (!form.typeMission)        newErrors.typeMission  = "Le type de mission est requis"
    if (!form.objectif.trim())    newErrors.objectif     = "L'objectif est requis"
    if (!form.lieux.trim())       newErrors.lieux        = "Le lieu est requis"
    if (!form.dateDepart)         newErrors.dateDepart   = "La date de départ est requise"
    if (!form.dateRetour)         newErrors.dateRetour   = "La date de retour est requise"
    if (form.dateDepart && form.dateRetour && form.dateRetour < form.dateDepart)
      newErrors.dateRetour = "La date de retour doit être après le départ"
    if (!form.moyenTransport)     newErrors.moyenTransport = "Le moyen de transport est requis"
    if (form.collective && !form.nombreParticipants)
      newErrors.nombreParticipants = "Nombre de participants requis"
    if (form.besoinAvance && !form.montantAvance)
      newErrors.montantAvance = "Montant de l'avance requis"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (soumettre: boolean) => {
    if (!validate()) return

    onSubmit(
      {
        intitule:          form.intitule.trim(),
        typeMission:       form.typeMission as TypeMission,
        objectif:          form.objectif.trim(),
        lieux:             form.lieux.trim(),
        dateDepart:        form.dateDepart,
        dateRetour:        form.dateRetour,
        duree:             dureeJours,
        moyenTransport:    form.moyenTransport as MoyenTransportMission,
        demandeur,
        collective:        form.collective,
        nombreParticipants: form.collective ? parseInt(form.nombreParticipants) : undefined,
        besoinAvance:      form.besoinAvance,
        montantAvance:     form.besoinAvance ? parseFloat(form.montantAvance) : undefined,
      },
      soumettre,
    )
  }

  /* ── Rendu ── */
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(8,15,11,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: "100%", maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid var(--bg-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 9,
                background: "rgba(240,165,0,0.12)",
                border: "1px solid rgba(240,165,0,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Briefcase size={18} style={{ color: "#f0a500" }} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0, fontSize: 17, fontWeight: 700,
                  color: "var(--text-primary)", fontFamily: "var(--font-display)",
                }}
              >
                Nouvelle mission
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Ordre de mission — demandé par {demandeur}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset", cursor: "pointer",
              width: 32, height: 32, borderRadius: 8,
              background: "var(--bg-elevated)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Corps du formulaire */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Section 1 — Identification */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Briefcase size={14} style={{ color: "var(--green-vivid)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Identification de la mission
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Intitulé */}
              <div>
                <label style={labelStyle}>Intitulé de la mission *</label>
                <input
                  type="text"
                  placeholder="Ex : Inspection technique site de Thiès"
                  value={form.intitule}
                  onChange={(e) => set("intitule", e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.intitule ? "#ef4444" : "var(--bg-border)" }}
                />
                {errors.intitule && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.intitule}
                  </p>
                )}
              </div>

              {/* Type de mission */}
              <div>
                <label style={labelStyle}>Type de mission *</label>
                <select
                  value={form.typeMission}
                  onChange={(e) => set("typeMission", e.target.value as TypeMission)}
                  style={{ ...inputStyle, borderColor: errors.typeMission ? "#ef4444" : "var(--bg-border)" }}
                >
                  <option value="">Sélectionner un type...</option>
                  {Object.entries(LABEL_TYPE_MISSION).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {errors.typeMission && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.typeMission}
                  </p>
                )}
              </div>

              {/* Objectif */}
              <div>
                <label style={labelStyle}>Objectif *</label>
                <textarea
                  rows={3}
                  placeholder="Décrivez l'objectif de la mission..."
                  value={form.objectif}
                  onChange={(e) => set("objectif", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical", borderColor: errors.objectif ? "#ef4444" : "var(--bg-border)" }}
                />
                {errors.objectif && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.objectif}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2 — Planning */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Calendar size={14} style={{ color: "var(--green-vivid)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Planning & Lieu
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Lieu */}
              <div>
                <label style={labelStyle}>
                  <MapPin size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Lieu(x) de mission *
                </label>
                <input
                  type="text"
                  placeholder="Ex : Thiès, Saint-Louis"
                  value={form.lieux}
                  onChange={(e) => set("lieux", e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.lieux ? "#ef4444" : "var(--bg-border)" }}
                />
                {errors.lieux && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.lieux}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date de départ *</label>
                  <input
                    type="date"
                    value={form.dateDepart}
                    onChange={(e) => set("dateDepart", e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.dateDepart ? "#ef4444" : "var(--bg-border)" }}
                  />
                  {errors.dateDepart && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.dateDepart}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Date de retour *</label>
                  <input
                    type="date"
                    value={form.dateRetour}
                    onChange={(e) => set("dateRetour", e.target.value)}
                    min={form.dateDepart || undefined}
                    style={{ ...inputStyle, borderColor: errors.dateRetour ? "#ef4444" : "var(--bg-border)" }}
                  />
                  {errors.dateRetour && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.dateRetour}
                    </p>
                  )}
                </div>
                {/* Durée calculée */}
                <div>
                  <label style={labelStyle}>Durée</label>
                  <div
                    style={{
                      ...inputStyle,
                      background: "var(--bg-base)",
                      color: dureeJours > 0 ? "#f0a500" : "var(--text-muted)",
                      fontWeight: dureeJours > 0 ? 700 : 400,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {dureeJours > 0 ? `${dureeJours} j.` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 — Logistique */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Truck size={14} style={{ color: "var(--green-vivid)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Logistique & Finances
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Moyen de transport */}
              <div>
                <label style={labelStyle}>Moyen de transport *</label>
                <select
                  value={form.moyenTransport}
                  onChange={(e) => set("moyenTransport", e.target.value as MoyenTransportMission)}
                  style={{ ...inputStyle, borderColor: errors.moyenTransport ? "#ef4444" : "var(--bg-border)" }}
                >
                  <option value="">Sélectionner...</option>
                  {Object.entries(LABEL_MOYEN_TRANSPORT_MISSION).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {errors.moyenTransport && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.moyenTransport}
                  </p>
                )}
              </div>

              {/* Mission collective */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  border: "1px solid var(--bg-border)",
                }}
              >
                <Users size={16} style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-body)", flex: 1 }}>
                  Mission collective
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.collective}
                    onChange={(e) => set("collective", e.target.checked)}
                    style={{ accentColor: "#f0a500", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    Oui
                  </span>
                </label>
              </div>

              {form.collective && (
                <div>
                  <label style={labelStyle}>Nombre de participants *</label>
                  <input
                    type="number"
                    min={2}
                    placeholder="Ex : 4"
                    value={form.nombreParticipants}
                    onChange={(e) => set("nombreParticipants", e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.nombreParticipants ? "#ef4444" : "var(--bg-border)" }}
                  />
                  {errors.nombreParticipants && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.nombreParticipants}
                    </p>
                  )}
                </div>
              )}

              {/* Besoin d'avance */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  border: "1px solid var(--bg-border)",
                }}
              >
                <DollarSign size={16} style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-body)", flex: 1 }}>
                  Besoin d'avance sur frais
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.besoinAvance}
                    onChange={(e) => set("besoinAvance", e.target.checked)}
                    style={{ accentColor: "#f0a500", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    Oui
                  </span>
                </label>
              </div>

              {form.besoinAvance && (
                <div>
                  <label style={labelStyle}>Montant de l'avance (FCFA) *</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Ex : 75000"
                    value={form.montantAvance}
                    onChange={(e) => set("montantAvance", e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.montantAvance ? "#ef4444" : "var(--bg-border)" }}
                  />
                  {errors.montantAvance && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.montantAvance}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer — actions */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid var(--bg-border)",
            display: "flex", gap: 10, justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              all: "unset", cursor: "pointer",
              padding: "10px 20px", borderRadius: 8,
              fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => handleSubmit(false)}
            style={{
              all: "unset", cursor: "pointer",
              padding: "10px 20px", borderRadius: 8,
              fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
              color: "var(--text-primary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
            }}
          >
            Enregistrer brouillon
          </button>
          <button
            onClick={() => handleSubmit(true)}
            style={{
              all: "unset", cursor: "pointer",
              padding: "10px 24px", borderRadius: 8,
              fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
              color: "var(--text-inverse)",
              background: "linear-gradient(135deg, #f0a500, #ffc235)",
            }}
          >
            Soumettre pour approbation
          </button>
        </div>
      </div>
    </div>
  )
}
