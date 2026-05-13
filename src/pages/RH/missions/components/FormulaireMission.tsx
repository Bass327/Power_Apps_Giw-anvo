import { useState } from "react"
import { X, Briefcase, MapPin, Calendar, Truck, Users, DollarSign, Plus, Trash2 } from "lucide-react"
import type { Mission, TypeMission, MoyenTransportMission } from "@/types/rh"
import {
  LABEL_TYPE_MISSION,
  LABEL_MOYEN_TRANSPORT_MISSION,
} from "@/types/rh"
import { useEmployes } from "@/hooks/useEmployes"

/* ── Types internes ── */
interface Props {
  onClose:   () => void
  onSubmit:  (mission: Omit<Mission, "id" | "dateDemande" | "statut">, soumettre: boolean) => void
  demandeur: string
}

type FormData = {
  intitule:         string
  typeMission:      TypeMission | ""
  objectifs:        string[]
  region:           string
  lieux:            string
  dateDepart:       string
  dateRetour:       string
  moyenTransport:   MoyenTransportMission | ""
  collective:       boolean
  participants:     string[]   // format "Nom, Poste"
  autreParticipant: string     // champ texte libre pour les externes
  besoinAvance:     boolean
  montantAvance:    string
}

const FORM_INIT: FormData = {
  intitule:         "",
  typeMission:      "",
  objectifs:        [""],
  region:           "",
  lieux:            "",
  dateDepart:       "",
  dateRetour:       "",
  moyenTransport:   "",
  collective:       false,
  participants:     [],
  autreParticipant: "",
  besoinAvance:     false,
  montantAvance:    "",
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
  const [form, setForm]     = useState<FormData>(FORM_INIT)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const { employes, isLoading: isLoadingEmployes } = useEmployes()

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

  /* ── Gestion des participants ── */

  /* Bascule la sélection d'un membre (mode collectif = multi) */
  const toggleParticipant = (label: string) => {
    const next = form.participants.includes(label)
      ? form.participants.filter((p) => p !== label)
      : [...form.participants, label]
    set("participants", next)
    if (errors.participants) setErrors((prev) => ({ ...prev, participants: undefined }))
  }

  /* Sélection unique (mode individuel) */
  const selectSingleParticipant = (label: string) => {
    set("participants", label ? [label] : [])
    if (errors.participants) setErrors((prev) => ({ ...prev, participants: undefined }))
  }

  /* Ajoute le participant externe saisi dans le champ texte libre */
  const ajouterAutreParticipant = () => {
    const val = form.autreParticipant.trim()
    if (!val || form.participants.includes(val)) return
    set("participants", [...form.participants, val])
    set("autreParticipant", "")
  }

  /* Retire un participant de la liste */
  const retirerParticipant = (label: string) => {
    set("participants", form.participants.filter((p) => p !== label))
  }

  /* Quand on coche/décoche "Mission collective", on remet la sélection à zéro */
  const handleCollectiveChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, collective: checked, participants: [], autreParticipant: "" }))
    setErrors((prev) => ({ ...prev, participants: undefined }))
  }

  /* ── Gestion des objectifs ── */
  const addObjectif = () => set("objectifs", [...form.objectifs, ""])

  const removeObjectif = (index: number) => {
    if (form.objectifs.length <= 1) return
    set("objectifs", form.objectifs.filter((_, i) => i !== index))
  }

  const updateObjectif = (index: number, value: string) => {
    const next = [...form.objectifs]
    next[index] = value
    set("objectifs", next)
  }

  /* ── Validation ── */
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.intitule.trim())                          newErrors.intitule    = "L'intitulé est requis"
    if (!form.typeMission)                              newErrors.typeMission  = "Le type de mission est requis"
    if (!form.objectifs.some((o) => o.trim()))          newErrors.objectifs    = "Au moins un objectif est requis"
    if (!form.region.trim())    newErrors.region       = "La région est requise"
    if (!form.lieux.trim())     newErrors.lieux        = "Le lieu est requis"
    if (!form.dateDepart)       newErrors.dateDepart   = "La date de départ est requise"
    if (!form.dateRetour)       newErrors.dateRetour   = "La date de retour est requise"
    if (form.dateDepart && form.dateRetour && form.dateRetour < form.dateDepart)
      newErrors.dateRetour = "La date de retour doit être après le départ"
    if (!form.moyenTransport)   newErrors.moyenTransport = "Le moyen de transport est requis"
    if (form.participants.length === 0)
      newErrors.participants = form.collective
        ? "Sélectionnez au moins un participant"
        : "Sélectionnez un participant"
    if (form.besoinAvance && !form.montantAvance)
      newErrors.montantAvance = "Montant de l'avance requis"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (soumettre: boolean) => {
    if (!validate()) return

    onSubmit(
      {
        intitule:       form.intitule.trim(),
        typeMission:    form.typeMission as TypeMission,
        objectif:       form.objectifs.filter((o) => o.trim()).join("\n"),
        region:         form.region.trim() || undefined,
        lieux:          form.lieux.trim(),
        dateDepart:     form.dateDepart,
        dateRetour:     form.dateRetour,
        duree:          dureeJours,
        moyenTransport: form.moyenTransport as MoyenTransportMission,
        demandeur,
        collective:     form.collective,
        participants:   form.participants.length > 0 ? form.participants : undefined,
        besoinAvance:   form.besoinAvance,
        montantAvance:  form.besoinAvance ? parseFloat(form.montantAvance) : undefined,
      },
      soumettre,
    )
  }

  /* ── Options de la liste déroulante ── */
  const optionsEmployes = employes.map((e) => ({
    value: `${e.nom}, ${e.poste}`,
    label: `${e.nom}, ${e.poste}`,
  }))

  /* ── Rendu ── */
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

              {/* Objectifs */}
              <div>
                <label style={labelStyle}>Objectifs *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.objectifs.map((obj, index) => (
                    <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div
                        style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          background: "var(--bg-border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700,
                          color: "var(--text-muted)",
                        }}
                      >
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        placeholder={`Objectif ${index + 1}...`}
                        value={obj}
                        onChange={(e) => updateObjectif(index, e.target.value)}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          borderColor: errors.objectifs && !obj.trim() ? "#ef4444" : "var(--bg-border)",
                        }}
                      />
                      {form.objectifs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeObjectif(index)}
                          style={{
                            all: "unset", cursor: "pointer",
                            width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.20)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Trash2 size={13} style={{ color: "#ef4444" }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addObjectif}
                  style={{
                    all: "unset", cursor: "pointer",
                    marginTop: 10,
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px dashed var(--bg-border)",
                    fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
                    color: "var(--green-bright)",
                  }}
                >
                  <Plus size={14} />
                  Ajouter un objectif
                </button>

                {errors.objectifs && (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.objectifs}
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
              {/* Région */}
              <div>
                <label style={labelStyle}>
                  <MapPin size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Région *
                </label>
                <input
                  type="text"
                  placeholder="Ex : Dakar, Thiès, Saint-Louis..."
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.region ? "#ef4444" : "var(--bg-border)" }}
                />
                {errors.region && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                    {errors.region}
                  </p>
                )}
              </div>

              {/* Lieu */}
              <div>
                <label style={labelStyle}>
                  <MapPin size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Lieu(x) de mission *
                </label>
                <input
                  type="text"
                  placeholder="Ex : Site industriel de Thiès, Zone franche"
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
                    onChange={(e) => handleCollectiveChange(e.target.checked)}
                    style={{ accentColor: "#f0a500", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    Oui
                  </span>
                </label>
              </div>

              {/* ── Sélection des participants ── */}
              {form.collective ? (
                /* ── MODE COLLECTIF : choix multiple ── */
                <div>
                  <label style={labelStyle}>
                    <Users size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Participants * (choix multiple)
                  </label>

                  {/* Liste des membres de l'organisation */}
                  <div
                    style={{
                      border: `1px solid ${errors.participants ? "#ef4444" : "var(--bg-border)"}`,
                      borderRadius: 8,
                      overflow: "hidden",
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {isLoadingEmployes ? (
                      <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        Chargement des membres...
                      </div>
                    ) : optionsEmployes.length === 0 ? (
                      <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        Aucun membre disponible
                      </div>
                    ) : (
                      optionsEmployes.map((opt) => {
                        const checked = form.participants.includes(opt.value)
                        return (
                          <label
                            key={opt.value}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "10px 14px",
                              cursor: "pointer",
                              background: checked ? "rgba(45,158,95,0.10)" : "var(--bg-elevated)",
                              borderBottom: "1px solid var(--bg-border)",
                              transition: "background 150ms",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleParticipant(opt.value)}
                              style={{ accentColor: "#f0a500", width: 15, height: 15, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 13, color: checked ? "var(--text-primary)" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                              {opt.label}
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>

                  {/* Autre participant (externe) */}
                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>
                      Autre participant (externe à l'organisation)
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Ex : Jean Dupont, Consultant externe"
                        value={form.autreParticipant}
                        onChange={(e) => set("autreParticipant", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterAutreParticipant() } }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={ajouterAutreParticipant}
                        disabled={!form.autreParticipant.trim()}
                        style={{
                          all: "unset", cursor: form.autreParticipant.trim() ? "pointer" : "not-allowed",
                          padding: "0 14px", borderRadius: 8, flexShrink: 0,
                          fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 600,
                          color: "var(--text-inverse)",
                          background: form.autreParticipant.trim()
                            ? "linear-gradient(135deg, #f0a500, #ffc235)"
                            : "var(--bg-border)",
                          display: "flex", alignItems: "center", gap: 6,
                          height: 40,
                          opacity: form.autreParticipant.trim() ? 1 : 0.5,
                        }}
                      >
                        <Plus size={14} />
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {errors.participants && (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.participants}
                    </p>
                  )}

                  {/* Récapitulatif des participants sélectionnés */}
                  {form.participants.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ ...labelStyle, marginBottom: 8 }}>
                        Sélectionnés ({form.participants.length})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {form.participants.map((p) => (
                          <div
                            key={p}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "8px 12px",
                              background: "rgba(45,158,95,0.08)",
                              border: "1px solid rgba(45,158,95,0.25)",
                              borderRadius: 7,
                            }}
                          >
                            <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                              {p}
                            </span>
                            <button
                              type="button"
                              onClick={() => retirerParticipant(p)}
                              style={{
                                all: "unset", cursor: "pointer",
                                display: "flex", alignItems: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── MODE INDIVIDUEL : choix unique ── */
                <div>
                  <label style={labelStyle}>
                    <Users size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Participant *
                  </label>
                  <select
                    value={form.participants[0] ?? ""}
                    onChange={(e) => selectSingleParticipant(e.target.value)}
                    disabled={isLoadingEmployes}
                    style={{
                      ...inputStyle,
                      borderColor: errors.participants ? "#ef4444" : "var(--bg-border)",
                      opacity: isLoadingEmployes ? 0.6 : 1,
                    }}
                  >
                    <option value="">
                      {isLoadingEmployes ? "Chargement..." : "Sélectionner un membre..."}
                    </option>
                    {optionsEmployes.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.participants && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444", fontFamily: "var(--font-body)" }}>
                      {errors.participants}
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
