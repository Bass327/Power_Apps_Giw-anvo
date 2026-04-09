import { useState, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  X, ChevronRight, ChevronLeft, Check,
  Loader2, Upload, FileText as FileIcon, Trash2,
  ArrowRight, AlertTriangle, Briefcase,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateDemandeAchat } from "@/hooks/useDemandesAchats"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import {
  detecterTypeAchat,
  CIRCUIT_VALIDATION,
  TYPE_CONFIG,
  LABEL_TYPE_DEMANDE,
  LABEL_MODE_PAIEMENT,
  LABEL_TYPE_PAIEMENT,
  LABEL_JUSTIFICATION_OP,
  LABEL_CATEGORIE_DEP,
  LABEL_MODE_PAIEMENT_CAISSE,
  LABEL_TYPE_MISSION,
  LABEL_MOYEN_TRANSPORT,
  LABEL_NATURE_URGENCE,
  LABEL_MODE_PAIEMENT_URGENT,
} from "@/types/DemandeAchat"
import type {
  TypeDemande,
  ModePaiement,
  TypePaiement,
  JustificationOperationnelle,
  CategorieDepense,
  ModePaiementCaisse,
  TypeMission,
  MoyenTransport,
  NatureUrgence,
  NiveauCriticite,
  ModePaiementUrgent,
} from "@/types/DemandeAchat"
import { formatFCFA } from "@/lib/utils"

interface Props {
  open:    boolean
  onClose: () => void
}

interface FormState {
  typeDemande: TypeDemande
  /* ── Achat-Prestation ── */
  projet:          string
  description:     string
  dateDebut:       string
  dateFin:         string
  montant:         string
  modePaiement:    string
  typePaiement:    string
  urgent:          string
  justificationOp: string
  categorieDep:    string
  /* ── Pièce de caisse ── */
  montantCaisse:      string
  motifCaisse:        string
  modePaiementCaisse: string
  encaissementPar:    string
  /* ── Départ de mission ── */
  intituleMission:       string
  typeMission:           string
  objectifMission:       string
  lieuxMission:          string
  dateDepart:            string
  dateRetour:            string
  moyenTransport:        string
  besoinAvance:          string   // "OUI" | "NON" | ""
  montantAvance:         string
  typeMissionCollective: string   // "INDIVIDUELLE" | "COLLECTIVE" | ""
  nombreParticipants:    string
  /* ── Urgence terrain ── */
  siteUrgence:           string
  natureUrgence:         string
  descriptionUrgence:    string
  niveauCriticite:       string
  actionImmediate:       string
  montantUrgence:        string
  modePaiementUrgent:    string
  responsableSite:       string
  dateIncident:          string
}

type ErreurForm = Partial<Record<keyof FormState, string>>

const INITIAL_FORM: FormState = {
  typeDemande:     "ACHAT_PRESTATION",
  projet:          "",
  description:     "",
  dateDebut:       "",
  dateFin:         "",
  montant:         "",
  modePaiement:    "",
  typePaiement:    "",
  urgent:          "",
  justificationOp: "",
  categorieDep:    "",
  montantCaisse:      "",
  motifCaisse:        "",
  modePaiementCaisse: "",
  encaissementPar:    "",
  intituleMission:       "",
  typeMission:           "",
  objectifMission:       "",
  lieuxMission:          "",
  dateDepart:            "",
  dateRetour:            "",
  moyenTransport:        "",
  besoinAvance:          "",
  montantAvance:         "",
  typeMissionCollective: "",
  nombreParticipants:    "",
  siteUrgence:           "",
  natureUrgence:         "",
  descriptionUrgence:    "",
  niveauCriticite:       "",
  actionImmediate:       "",
  montantUrgence:        "",
  modePaiementUrgent:    "",
  responsableSite:       "",
  dateIncident:          "",
}

const MAX_TAILLE_FICHIER  = 1024 * 1024 * 1024   // 1 Go
const MAX_FICHIERS        = 10
const MAX_TAILLE_POST_DEP = 10 * 1024 * 1024      // 10 Mo

/* ── Définition des étapes selon le parcours ── */
const STEPS_ACHAT: Array<{ num: number; label: string }> = [
  { num: 1, label: "Demande"    },
  { num: 2, label: "Projet"     },
  { num: 3, label: "Période"    },
  { num: 4, label: "Estimation" },
]
const STEPS_CAISSE: Array<{ num: number; label: string }> = [
  { num: 1, label: "Demande" },
  { num: 2, label: "Détails" },
]
const STEPS_MISSION: Array<{ num: number; label: string }> = [
  { num: 1, label: "Demande" },
  { num: 2, label: "Mission" },
]
const STEPS_URGENCE: Array<{ num: number; label: string }> = [
  { num: 1, label: "Demande" },
  { num: 2, label: "Urgence"  },
]
const STEPS_BIENTOT: Array<{ num: number; label: string }> = [
  { num: 1, label: "Demande" },
  { num: 2, label: "À venir" },
]

export function FormulaireDemandeAchat({ open, onClose }: Props) {
  const [form, setForm]       = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors]   = useState<ErreurForm>({})
  const [etape, setEtape]     = useState(1)

  /* Fichiers — Achat-Prestation */
  const [fichiers, setFichiers] = useState<File[]>([])
  const fileInputRef             = useRef<HTMLInputElement>(null)

  /* Fichier — Poste de dépense (Départ de mission, max 1 PDF 10Mo) */
  const [postDepenseFile, setPostDepenseFile] = useState<File | null>(null)
  const postDepenseRef                         = useRef<HTMLInputElement>(null)

  /* Fichiers — Urgence terrain (max 5, PDF/JPG/PNG, 10Mo chacun) */
  const MAX_FICHIERS_URGENCE     = 5
  const MAX_TAILLE_FICHIER_URG   = 10 * 1024 * 1024   // 10 Mo
  const [fichiersUrgence, setFichiersUrgence] = useState<File[]>([])
  const urgenceFileRef                         = useRef<HTMLInputElement>(null)

  const { data: currentUser } = useCurrentUser()
  const navigate               = useNavigate()
  const { mutate, isPending } = useCreateDemandeAchat()

  /* ── Montants calculés ── */
  const montantAchatNum   = parseFloat(form.montant.replace(/\s/g, ""))        || 0
  const montantCaisseNum  = parseFloat(form.montantCaisse.replace(/\s/g, ""))  || 0
  const montantAvanceNum  = parseFloat(form.montantAvance.replace(/\s/g, ""))  || 0
  const montantUrgenceNum = parseFloat(form.montantUrgence.replace(/\s/g, "")) || 0

  const typeDetecte = montantAchatNum > 0 ? detecterTypeAchat(montantAchatNum) : null
  const circuit     = typeDetecte ? CIRCUIT_VALIDATION[typeDetecte] : null

  /* ── Durée de mission calculée automatiquement ── */
  const dureeMission = useMemo(() => {
    if (!form.dateDepart || !form.dateRetour) return null
    const diff = Math.round(
      (new Date(form.dateRetour).getTime() - new Date(form.dateDepart).getTime())
      / (1000 * 60 * 60 * 24),
    )
    return diff >= 0 ? diff + 1 : null
  }, [form.dateDepart, form.dateRetour])

  /* ── Étapes selon le parcours ── */
  const steps = useMemo(() => {
    if (form.typeDemande === "ACHAT_PRESTATION") return STEPS_ACHAT
    if (form.typeDemande === "PIECE_CAISSE")     return STEPS_CAISSE
    if (form.typeDemande === "DEPART_MISSION")   return STEPS_MISSION
    if (form.typeDemande === "URGENCE_TERRAIN")  return STEPS_URGENCE
    return STEPS_BIENTOT
  }, [form.typeDemande])

  /* ── Titre de l'étape ── */
  const titreEtape = useMemo(() => {
    if (etape === 1) return "Type de demande"
    if (form.typeDemande === "PIECE_CAISSE")    return "Détails pièce de caisse"
    if (form.typeDemande === "DEPART_MISSION")  return "Détails départ de mission"
    if (form.typeDemande === "URGENCE_TERRAIN") return "Détails urgence terrain"
    if (form.typeDemande === "ACHAT_PRESTATION") {
      return ["Projet", "Période concernée", "Estimation financière"][etape - 2] ?? ""
    }
    return "Parcours à venir"
  }, [etape, form.typeDemande])

  /* ── Mise à jour d'un champ ── */
  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  /* ── Validation par étape ── */
  function validerEtapeActuelle(): ErreurForm {
    const e: ErreurForm = {}

    if (etape === 1) return e

    /* Pièce de caisse */
    if (form.typeDemande === "PIECE_CAISSE") {
      if (!form.montantCaisse || montantCaisseNum <= 0) e.montantCaisse      = "Montant invalide"
      if (!form.motifCaisse.trim())                     e.motifCaisse        = "Champ requis"
      if (!form.modePaiementCaisse)                     e.modePaiementCaisse = "Champ requis"
      if (!form.encaissementPar.trim())                 e.encaissementPar    = "Champ requis"
      return e
    }

    /* Urgence terrain */
    if (form.typeDemande === "URGENCE_TERRAIN") {
      if (!form.siteUrgence.trim())        e.siteUrgence        = "Champ requis"
      if (!form.natureUrgence)             e.natureUrgence      = "Champ requis"
      if (!form.descriptionUrgence.trim()) e.descriptionUrgence = "Champ requis"
      if (!form.niveauCriticite)           e.niveauCriticite    = "Champ requis"
      if (!form.actionImmediate.trim())    e.actionImmediate    = "Champ requis"
      if (!form.montantUrgence || montantUrgenceNum <= 0) e.montantUrgence = "Montant invalide"
      if (!form.modePaiementUrgent)        e.modePaiementUrgent = "Champ requis"
      if (!form.responsableSite.trim())    e.responsableSite    = "Champ requis"
      if (!form.dateIncident)              e.dateIncident       = "Champ requis"
      return e
    }

    /* Départ de mission */
    if (form.typeDemande === "DEPART_MISSION") {
      if (!form.intituleMission.trim())  e.intituleMission       = "Champ requis"
      if (!form.typeMission)             e.typeMission           = "Champ requis"
      if (!form.objectifMission.trim())  e.objectifMission       = "Champ requis"
      if (!form.lieuxMission.trim())     e.lieuxMission          = "Champ requis"
      if (!form.dateDepart)              e.dateDepart            = "Champ requis"
      if (!form.dateRetour) {
        e.dateRetour = "Champ requis"
      } else if (form.dateDepart && new Date(form.dateRetour) < new Date(form.dateDepart)) {
        e.dateRetour = "La date de retour ne peut pas être avant la date de départ"
      }
      if (!form.moyenTransport)          e.moyenTransport        = "Champ requis"
      if (!form.besoinAvance)            e.besoinAvance          = "Champ requis"
      if (form.besoinAvance === "OUI" && (!form.montantAvance || montantAvanceNum <= 0)) {
        e.montantAvance = "Montant invalide"
      }
      if (!form.typeMissionCollective)   e.typeMissionCollective = "Champ requis"
      if (form.typeMissionCollective === "COLLECTIVE") {
        const n = parseInt(form.nombreParticipants) || 0
        if (n < 2) e.nombreParticipants = "Minimum 2 participants"
      }
      return e
    }

    /* Achat-Prestation */
    if (form.typeDemande === "ACHAT_PRESTATION") {
      if (etape === 2) {
        if (!form.projet.trim())      e.projet      = "Champ requis"
        if (!form.description.trim()) e.description = "Champ requis"
      }
      if (etape === 3) {
        if (!form.dateDebut) e.dateDebut = "Champ requis"
      }
      if (etape === 4) {
        if (!form.montant || montantAchatNum <= 0) e.montant         = "Montant invalide"
        if (!form.modePaiement)                    e.modePaiement    = "Champ requis"
        if (!form.typePaiement)                    e.typePaiement    = "Champ requis"
        if (!form.urgent)                          e.urgent          = "Champ requis"
        if (!form.justificationOp)                 e.justificationOp = "Champ requis"
        if (!form.categorieDep)                    e.categorieDep    = "Champ requis"
      }
    }

    return e
  }

  /* ── Navigation ── */
  function handleSuivant() {
    const e = validerEtapeActuelle()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtape((n) => n + 1)
  }

  /* ── Soumission — Achat-Prestation ── */
  function submitAchatPrestation(soumettre: boolean) {
    const e = validerEtapeActuelle()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    mutate(
      {
        payload: {
          titre:           form.projet.trim(),
          description:     form.description.trim(),
          montant:         montantAchatNum,
          dateBesoin:      form.dateDebut,
          fournisseur:     "",
          justification:   LABEL_JUSTIFICATION_OP[form.justificationOp as JustificationOperationnelle],
          ligneBudgetaire: LABEL_CATEGORIE_DEP[form.categorieDep as CategorieDepense],
          demandeur:       currentUser?.email ?? "",
          typeDemande:     "ACHAT_PRESTATION",
          dateDebut:       form.dateDebut,
          dateFin:         form.dateFin     || undefined,
          modePaiement:    form.modePaiement    as ModePaiement,
          typePaiement:    form.typePaiement    as TypePaiement,
          urgent:          form.urgent === "OUI",
          justificationOp: form.justificationOp as JustificationOperationnelle,
          categorieDep:    form.categorieDep    as CategorieDepense,
        },
        soumettre,
        fichiers: fichiers.length > 0 ? fichiers : undefined,
      },
      { onSuccess: () => resetEtFermer() },
    )
  }

  /* ── Soumission — Pièce de caisse ── */
  function submitPieceCaisse() {
    const e = validerEtapeActuelle()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    mutate(
      {
        payload: {
          titre:           form.motifCaisse.trim(),
          description:     form.motifCaisse.trim(),
          montant:         montantCaisseNum,
          dateBesoin:      new Date().toISOString().split("T")[0],
          fournisseur:     form.encaissementPar.trim(),
          justification:   form.motifCaisse.trim(),
          ligneBudgetaire: LABEL_MODE_PAIEMENT_CAISSE[form.modePaiementCaisse as ModePaiementCaisse],
          demandeur:       currentUser?.email ?? "",
          typeDemande:     "PIECE_CAISSE",
          motifCaisse:     form.motifCaisse.trim(),
          encaissementPar: form.encaissementPar.trim(),
          modePaiementCaisse: form.modePaiementCaisse as ModePaiementCaisse,
        },
        soumettre: true,
      },
      { onSuccess: () => resetEtFermer() },
    )
  }

  /* ── Soumission — Départ de mission ── */
  function submitDepartMission() {
    const e = validerEtapeActuelle()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    mutate(
      {
        payload: {
          titre:           form.intituleMission.trim(),
          description:     form.objectifMission.trim(),
          montant:         form.besoinAvance === "OUI" ? montantAvanceNum : 0,
          dateBesoin:      form.dateDepart,
          fournisseur:     "",
          justification:   form.objectifMission.trim(),
          ligneBudgetaire: form.lieuxMission.trim(),
          demandeur:       currentUser?.email ?? "",
          typeDemande:     "DEPART_MISSION",
          intituleMission: form.intituleMission.trim(),
          typeMission:     form.typeMission     as TypeMission,
          objectifMission: form.objectifMission.trim(),
          lieuxMission:    form.lieuxMission.trim(),
          dateDepart:      form.dateDepart,
          dateRetour:      form.dateRetour,
          dureeMission:    dureeMission ?? undefined,
          moyenTransport:  form.moyenTransport   as MoyenTransport,
          besoinAvance:    form.besoinAvance === "OUI",
          montantAvance:   form.besoinAvance === "OUI" ? montantAvanceNum : undefined,
          typeMissionCollective: form.typeMissionCollective as "INDIVIDUELLE" | "COLLECTIVE",
          nombreParticipants: form.typeMissionCollective === "COLLECTIVE"
            ? parseInt(form.nombreParticipants) || undefined
            : undefined,
        },
        soumettre: true,
        fichiers: postDepenseFile ? [postDepenseFile] : undefined,
      },
      { onSuccess: () => resetEtFermer() },
    )
  }

  /* ── Soumission — Urgence terrain ── */
  function submitUrgenceTerrain() {
    const e = validerEtapeActuelle()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    mutate(
      {
        payload: {
          titre:           `[URGENCE] ${form.siteUrgence.trim()}`,
          description:     form.descriptionUrgence.trim(),
          montant:         montantUrgenceNum,
          dateBesoin:      new Date().toISOString().split("T")[0],
          fournisseur:     "",
          justification:   form.actionImmediate.trim(),
          ligneBudgetaire: form.natureUrgence,
          demandeur:       currentUser?.email ?? "",
          typeDemande:     "URGENCE_TERRAIN",
          siteUrgence:     form.siteUrgence.trim(),
          natureUrgence:   form.natureUrgence     as NatureUrgence,
          descriptionUrgence: form.descriptionUrgence.trim(),
          niveauCriticite: form.niveauCriticite   as NiveauCriticite,
          actionImmediate: form.actionImmediate.trim(),
          modePaiementUrgent: form.modePaiementUrgent as ModePaiementUrgent,
          responsableSite: form.responsableSite.trim(),
          dateIncident:    form.dateIncident,
        },
        soumettre: true,
        fichiers: fichiersUrgence.length > 0 ? fichiersUrgence : undefined,
      },
      { onSuccess: () => resetEtFermer() },
    )
  }

  function resetEtFermer() {
    setForm(INITIAL_FORM)
    setErrors({})
    setEtape(1)
    setFichiers([])
    setPostDepenseFile(null)
    setFichiersUrgence([])
    onClose()
  }

  function handleClose() {
    if (isPending) return
    resetEtFermer()
  }

  /* ── Gestion fichiers Achat-Prestation ── */
  function handleFichiers(e: React.ChangeEvent<HTMLInputElement>) {
    const valides = Array.from(e.target.files ?? []).filter((f) => f.size <= MAX_TAILLE_FICHIER)
    setFichiers((prev) => [...prev, ...valides].slice(0, MAX_FICHIERS))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  /* ── Gestion fichier Poste de dépense ── */
  function handlePostDepense(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f && f.size <= MAX_TAILLE_POST_DEP) setPostDepenseFile(f)
    if (postDepenseRef.current) postDepenseRef.current.value = ""
  }

  /* ── Gestion fichiers Urgence terrain ── */
  function handleFichiersUrgence(e: React.ChangeEvent<HTMLInputElement>) {
    const valides = Array.from(e.target.files ?? []).filter((f) => f.size <= MAX_TAILLE_FICHIER_URG)
    setFichiersUrgence((prev) => [...prev, ...valides].slice(0, MAX_FICHIERS_URGENCE))
    if (urgenceFileRef.current) urgenceFileRef.current.value = ""
  }

  /* ─────────────────────────────────────────────────────────
     Rendu des contenus d'étape
  ───────────────────────────────────────────────────────── */

  function renderEtape1() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
          Type de demande
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(LABEL_TYPE_DEMANDE) as [TypeDemande, string][])
            /* Les missions sont désormais gérées dans le module RH */
            .filter(([key]) => key !== "DEPART_MISSION")
            .map(([key, label]) => {
              const actif = form.typeDemande === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setForm((prev) => ({ ...prev, typeDemande: key })); setErrors({}) }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: actif ? "rgba(240,165,0,0.08)" : "var(--bg-elevated)",
                    border:     `2px solid ${actif ? "var(--gold-warm)" : "var(--bg-border)"}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      border:     `2px solid ${actif ? "var(--gold-warm)" : "var(--bg-border)"}`,
                      background: actif ? "var(--gold-warm)" : "transparent",
                    }}
                  >
                    {actif && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-inverse)" }} />}
                  </div>
                  <span
                    className="text-sm font-display font-medium"
                    style={{ color: actif ? "var(--gold-warm)" : "var(--text-secondary)" }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}

          {/* Card de redirection — Départ de mission → module RH */}
          <button
            type="button"
            onClick={() => { onClose(); navigate("/rh/missions") }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all col-span-2"
            style={{
              background: "rgba(240,165,0,0.04)",
              border:     "1px dashed rgba(240,165,0,0.35)",
            }}
          >
            <Briefcase size={16} style={{ color: "#f0a500", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span className="text-sm font-display font-medium" style={{ color: "#f0a500" }}>
                Départ de mission
              </span>
              <span className="text-xs font-body block" style={{ color: "var(--text-muted)", marginTop: 1 }}>
                Géré dans Ressources Humaines → Gestion des missions
              </span>
            </div>
            <ArrowRight size={14} style={{ color: "#f0a500", flexShrink: 0 }} />
          </button>
        </div>
      </div>
    )
  }

  /* ── Étapes 2–4 Achat-Prestation ── */

  function renderEtape2Achat() {
    return (
      <div className="space-y-4">
        <FormField label="Projet / Activité concerné(e) *" error={errors.projet}>
          <input
            type="text"
            placeholder="Ex : Installation solaire — Site Mbour"
            value={form.projet}
            onChange={set("projet")}
            className="form-input"
          />
        </FormField>
        <FormField label="Description courte du besoin *" error={errors.description}>
          <textarea
            rows={3}
            placeholder="1 phrase — quoi / pourquoi"
            value={form.description}
            onChange={set("description")}
            className="form-input resize-none"
          />
        </FormField>
      </div>
    )
  }

  function renderEtape3Achat() {
    return (
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date de début *" error={errors.dateDebut}>
          <input type="date" value={form.dateDebut} onChange={set("dateDebut")} className="form-input" />
        </FormField>
        <FormField label="Date de fin (si applicable)">
          <input type="date" value={form.dateFin} onChange={set("dateFin")} className="form-input" />
        </FormField>
      </div>
    )
  }

  function renderEtape4Achat() {
    return (
      <div className="space-y-4">
        {/* Récapitulatif */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
          <p className="text-xs font-display font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Récapitulatif
          </p>
          <SummaryLine label="Type">{LABEL_TYPE_DEMANDE[form.typeDemande]}</SummaryLine>
          <SummaryLine label="Projet">{form.projet || "—"}</SummaryLine>
          <SummaryLine label="Description">{form.description || "—"}</SummaryLine>
          <SummaryLine label="Période">
            {form.dateDebut ? `${form.dateDebut}${form.dateFin ? ` → ${form.dateFin}` : ""}` : "—"}
          </SummaryLine>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Montant estimé (FCFA) *" error={errors.montant}>
            <input
              type="number" min={0} placeholder="Ex : 350000"
              value={form.montant} onChange={set("montant")} className="form-input"
            />
            {montantAchatNum > 0 && (
              <p className="text-xs mt-1 font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                {formatFCFA(montantAchatNum)}
              </p>
            )}
          </FormField>

          <div className="flex flex-col justify-end">
            {typeDetecte ? (
              <div className="rounded-lg px-3 py-2.5" style={{
                background: typeDetecte === "ORDINAIRE" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${typeDetecte === "ORDINAIRE" ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.30)"}`,
              }}>
                <p className="font-display font-bold text-sm" style={{ color: typeDetecte === "ORDINAIRE" ? "#22c55e" : "#ef4444" }}>
                  Achat {TYPE_CONFIG[typeDetecte].label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{TYPE_CONFIG[typeDetecte].seuil}</p>
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Saisissez un montant</p>
              </div>
            )}
          </div>
        </div>

        {circuit && (
          <div className="rounded-xl p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
            <p className="text-xs font-display font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
              Circuit de validation
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {circuit.map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-xs font-display font-medium px-2 py-0.5 rounded-lg" style={{
                    background: i === 0 ? "rgba(45,158,95,0.15)" : "var(--bg-surface)",
                    color:      i === 0 ? "var(--green-vivid)"   : "var(--text-secondary)",
                    border:     `1px solid ${i === 0 ? "rgba(45,158,95,0.30)" : "var(--bg-border)"}`,
                  }}>{label}</span>
                  {i < circuit.length - 1 && <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mode de paiement *" error={errors.modePaiement}>
            <select value={form.modePaiement} onChange={set("modePaiement")} className="form-input">
              <option value="">Sélectionner…</option>
              {(Object.entries(LABEL_MODE_PAIEMENT) as [ModePaiement, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Type de paiement *" error={errors.typePaiement}>
            <select value={form.typePaiement} onChange={set("typePaiement")} className="form-input">
              <option value="">Sélectionner…</option>
              {(Object.entries(LABEL_TYPE_PAIEMENT) as [TypePaiement, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Demande urgente ? *" error={errors.urgent}>
          <select value={form.urgent} onChange={set("urgent")} className="form-input">
            <option value="">Sélectionner…</option>
            <option value="OUI">Oui</option>
            <option value="NON">Non</option>
          </select>
        </FormField>

        <FormField label="Justification opérationnelle *" sousTitre="Cette dépense est nécessaire pour :" error={errors.justificationOp}>
          <select value={form.justificationOp} onChange={set("justificationOp")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_JUSTIFICATION_OP) as [JustificationOperationnelle, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>

        <FormField label="Catégorie de dépense *" error={errors.categorieDep}>
          <select value={form.categorieDep} onChange={set("categorieDep")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_CATEGORIE_DEP) as [CategorieDepense, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>

        {/* Upload PDF */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
            Documents justificatifs
            <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(PDF — max {MAX_FICHIERS} fichiers, 1 Go/fichier)</span>
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={fichiers.length >= MAX_FICHIERS}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-5 transition-all disabled:opacity-50"
            style={{ background: "var(--bg-elevated)", border: "2px dashed var(--bg-border)", color: "var(--text-muted)" }}
            onMouseEnter={(e) => { if (fichiers.length < MAX_FICHIERS) { e.currentTarget.style.borderColor = "var(--green-vivid)"; e.currentTarget.style.color = "var(--text-secondary)" }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"; e.currentTarget.style.color = "var(--text-muted)" }}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-display font-medium">
              {fichiers.length >= MAX_FICHIERS ? "Limite atteinte" : "Ajouter des fichiers PDF"}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={handleFichiers} />
          {fichiers.length > 0 && (
            <div className="space-y-1.5 mt-1">
              {fichiers.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#60a5fa" }} />
                    <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{f.name}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>({(f.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  </div>
                  <button type="button" onClick={() => setFichiers((prev) => prev.filter((_, j) => j !== i))}
                    className="p-1 rounded-lg transition-colors flex-shrink-0" style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Étape 2 — Pièce de caisse ── */

  function renderEtape2Caisse() {
    return (
      <div className="space-y-4">
        <FormField label="Montant reçu (FCFA) *" error={errors.montantCaisse}>
          <input type="number" min={0} placeholder="Ex : 25000" value={form.montantCaisse} onChange={set("montantCaisse")} className="form-input" />
          {montantCaisseNum > 0 && (
            <p className="text-xs mt-1 font-display font-semibold" style={{ color: "var(--gold-warm)" }}>{formatFCFA(montantCaisseNum)}</p>
          )}
        </FormField>
        <FormField label="Motif *" error={errors.motifCaisse}>
          <input type="text" placeholder="Ex : Achat fournitures de bureau" value={form.motifCaisse} onChange={set("motifCaisse")} className="form-input" />
        </FormField>
        <FormField label="Mode de paiement *" error={errors.modePaiementCaisse}>
          <select value={form.modePaiementCaisse} onChange={set("modePaiementCaisse")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_MODE_PAIEMENT_CAISSE) as [ModePaiementCaisse, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="Encaissement effectué par *" error={errors.encaissementPar}>
          <input type="text" placeholder="Ex : Fatou Diallo" value={form.encaissementPar} onChange={set("encaissementPar")} className="form-input" />
        </FormField>
      </div>
    )
  }

  /* ── Étape 2 — Départ de mission ── */

  function renderEtape2Mission() {
    return (
      <div className="space-y-4">

        <FormField label="Intitulé de la mission *" error={errors.intituleMission}>
          <input
            type="text"
            placeholder="Ex : Mission de maintenance site Kaolack"
            value={form.intituleMission}
            onChange={set("intituleMission")}
            className="form-input"
          />
        </FormField>

        <FormField label="Type de mission *" error={errors.typeMission}>
          <select value={form.typeMission} onChange={set("typeMission")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_TYPE_MISSION) as [TypeMission, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Objectif détaillé *"
          sousTitre="Description claire des activités prévues et résultats attendus"
          error={errors.objectifMission}
        >
          <textarea
            rows={3}
            placeholder="Décrivez les activités prévues et les résultats attendus..."
            value={form.objectifMission}
            onChange={set("objectifMission")}
            className="form-input resize-none"
          />
        </FormField>

        <FormField
          label="Lieu(x) de la mission *"
          sousTitre="Région / Localité / Site spécifique (si applicable)"
          error={errors.lieuxMission}
        >
          <input
            type="text"
            placeholder="Ex : Kaolack — Site solaire AGT"
            value={form.lieuxMission}
            onChange={set("lieuxMission")}
            className="form-input"
          />
        </FormField>

        {/* Dates + Durée */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date de départ *" error={errors.dateDepart}>
            <input type="date" value={form.dateDepart} onChange={set("dateDepart")} className="form-input" />
          </FormField>
          <FormField label="Date de retour prévue *" error={errors.dateRetour}>
            <input type="date" value={form.dateRetour} onChange={set("dateRetour")} className="form-input" />
          </FormField>
        </div>

        {/* Durée calculée automatiquement */}
        {dureeMission !== null && (
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-2.5"
            style={{ background: "rgba(45,158,95,0.08)", border: "1px solid rgba(45,158,95,0.25)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Durée totale :{" "}
              <span className="font-display font-bold" style={{ color: "var(--green-vivid)" }}>
                {dureeMission} jour{dureeMission > 1 ? "s" : ""}
              </span>
            </p>
          </div>
        )}

        <FormField label="Moyen de transport prévu *" error={errors.moyenTransport}>
          <select value={form.moyenTransport} onChange={set("moyenTransport")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_MOYEN_TRANSPORT) as [MoyenTransport, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>

        {/* Besoin en avance — radio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
            Besoin en avance de mission *
          </label>
          <div className="flex gap-3">
            {(["OUI", "NON"] as const).map((val) => {
              const actif = form.besoinAvance === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      besoinAvance:  val,
                      montantAvance: val === "NON" ? "" : prev.montantAvance,
                    }))
                    setErrors((prev) => ({ ...prev, besoinAvance: undefined }))
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                  style={{
                    background: actif ? "rgba(240,165,0,0.08)" : "var(--bg-elevated)",
                    border:     `2px solid ${actif ? "var(--gold-warm)" : "var(--bg-border)"}`,
                    color:      actif ? "var(--gold-warm)" : "var(--text-secondary)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      border:     `2px solid ${actif ? "var(--gold-warm)" : "var(--bg-border)"}`,
                      background: actif ? "var(--gold-warm)" : "transparent",
                    }}
                  >
                    {actif && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-inverse)" }} />}
                  </div>
                  <span className="text-sm font-display font-medium">{val === "OUI" ? "Oui" : "Non"}</span>
                </button>
              )
            })}
          </div>
          {errors.besoinAvance && <p className="text-xs" style={{ color: "#ef4444" }}>{errors.besoinAvance}</p>}
        </div>

        {/* Montant avance avec fade */}
        {form.besoinAvance === "OUI" && (
          <div style={{ animation: "fadeInEtape 200ms ease-out" }}>
            <FormField label="Montant de l'avance demandée (FCFA) *" error={errors.montantAvance}>
              <input
                type="number" min={0} placeholder="Ex : 150000"
                value={form.montantAvance} onChange={set("montantAvance")} className="form-input"
              />
              {montantAvanceNum > 0 && (
                <p className="text-xs mt-1 font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                  {formatFCFA(montantAvanceNum)}
                </p>
              )}
            </FormField>
          </div>
        )}

        {/* Type de mission — individuelle ou collective */}
        <FormField label="Mission individuelle ou collective ? *" error={errors.typeMissionCollective}>
          <select value={form.typeMissionCollective} onChange={set("typeMissionCollective")} className="form-input">
            <option value="">Sélectionner…</option>
            <option value="INDIVIDUELLE">Individuelle</option>
            <option value="COLLECTIVE">Collective</option>
          </select>
        </FormField>

        {/* Nombre de participants avec fade */}
        {form.typeMissionCollective === "COLLECTIVE" && (
          <div style={{ animation: "fadeInEtape 200ms ease-out" }}>
            <FormField label="Nombre de participants *" error={errors.nombreParticipants}>
              <input
                type="number" min={2} placeholder="Minimum 2"
                value={form.nombreParticipants} onChange={set("nombreParticipants")} className="form-input"
              />
            </FormField>
          </div>
        )}

        {/* Poste de dépense — 1 PDF max 10 Mo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
            Poste de dépense
            <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(PDF uniquement — max 1 fichier, 10 Mo)</span>
          </label>
          {postDepenseFile ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#60a5fa" }} />
                <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{postDepenseFile.name}</span>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  ({(postDepenseFile.size / 1024 / 1024).toFixed(1)} Mo)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPostDepenseFile(null)}
                className="p-1 rounded-lg transition-colors flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => postDepenseRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-5 transition-all"
              style={{ background: "var(--bg-elevated)", border: "2px dashed var(--bg-border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green-vivid)"; e.currentTarget.style.color = "var(--text-secondary)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)";   e.currentTarget.style.color = "var(--text-muted)" }}
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-display font-medium">Ajouter un fichier PDF</span>
            </button>
          )}
          <input ref={postDepenseRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePostDepense} />
        </div>

      </div>
    )
  }

  /* ── Étape 2 — Urgence terrain ── */

  function renderEtape2Urgence() {
    /* Badge montant dynamique selon le seuil */
    const badgeMontant = (() => {
      if (montantUrgenceNum <= 0) return null
      if (montantUrgenceNum < 100_000) {
        return { label: "Caisse terrain", color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.30)" }
      }
      if (montantUrgenceNum <= 500_000) {
        return { label: "Validation RAF requise", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" }
      }
      return { label: "Validation Directrice requise", color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)" }
    })()

    return (
      <div className="space-y-4">

        {/* Bandeau urgence */}
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.40)" }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
          <p className="text-sm font-display font-semibold" style={{ color: "#ef4444" }}>
            Formulaire d'urgence — Cette demande sera traitée en priorité
          </p>
        </div>

        {/* Champ 2 — Site / Localité */}
        <FormField label="Site / Localité concerné *" error={errors.siteUrgence}>
          <input
            type="text"
            placeholder="Ex: Site de Mbodiène, Localité de Thiès..."
            value={form.siteUrgence}
            onChange={set("siteUrgence")}
            className="form-input"
          />
        </FormField>

        {/* Champ 3 — Nature de l'urgence */}
        <FormField label="Nature de l'urgence *" error={errors.natureUrgence}>
          <select value={form.natureUrgence} onChange={set("natureUrgence")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_NATURE_URGENCE) as [NatureUrgence, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>

        {/* Champ 4 — Description */}
        <FormField
          label="Description de la situation *"
          sousTitre="Décrivez précisément la situation et l'impact opérationnel"
          error={errors.descriptionUrgence}
        >
          <textarea
            rows={3}
            placeholder="Que s'est-il passé ? Quel est l'impact sur les opérations ?"
            value={form.descriptionUrgence}
            onChange={set("descriptionUrgence")}
            className="form-input resize-none"
          />
        </FormField>

        {/* Champ 5 — Niveau de criticité */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
            Niveau de criticité *
          </label>
          <div className="flex flex-col gap-2">
            {([
              { val: "CRITIQUE", label: "Critique",  sous: "Arrêt total des opérations",       color: "#ef4444" },
              { val: "ELEVE",    label: "Élevé",     sous: "Impact majeur sur le service",      color: "#f59e0b" },
              { val: "MODERE",   label: "Modéré",    sous: "Dégradation partielle du service",  color: "#eab308" },
            ] as const).map(({ val, label, sous, color }) => {
              const actif = form.niveauCriticite === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, niveauCriticite: val }))
                    setErrors((prev) => ({ ...prev, niveauCriticite: undefined }))
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: actif ? `rgba(${val === "CRITIQUE" ? "239,68,68" : val === "ELEVE" ? "245,158,11" : "234,179,8"},0.08)` : "var(--bg-elevated)",
                    border: `2px solid ${actif ? color : "var(--bg-border)"}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      border: `2px solid ${actif ? color : "var(--bg-border)"}`,
                      background: actif ? color : "transparent",
                    }}
                  >
                    {actif && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-inverse)" }} />}
                  </div>
                  <div>
                    <span className="text-sm font-display font-semibold" style={{ color: actif ? color : "var(--text-secondary)" }}>
                      {label}
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sous}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {errors.niveauCriticite && <p className="text-xs" style={{ color: "#ef4444" }}>{errors.niveauCriticite}</p>}
        </div>

        {/* Message si criticité CRITIQUE */}
        {form.niveauCriticite === "CRITIQUE" && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", animation: "fadeInEtape 200ms ease-out" }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
            <p className="text-sm" style={{ color: "#ef4444" }}>
              Cette demande sera immédiatement notifiée au RAF et à la Directrice
            </p>
          </div>
        )}

        {/* Champ 6 — Action immédiate */}
        <FormField
          label="Action immédiate déjà entreprise *"
          sousTitre="Décrivez ce qui a déjà été fait sur place"
          error={errors.actionImmediate}
        >
          <textarea
            rows={2}
            placeholder="Ex: Coupure du circuit, évacuation zone..."
            value={form.actionImmediate}
            onChange={set("actionImmediate")}
            className="form-input resize-none"
          />
        </FormField>

        {/* Champ 7 — Montant estimé */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Montant estimé (FCFA) *" error={errors.montantUrgence}>
            <input
              type="number"
              min={0}
              placeholder="Ex : 85000"
              value={form.montantUrgence}
              onChange={set("montantUrgence")}
              className="form-input"
            />
            {montantUrgenceNum > 0 && (
              <p className="text-xs mt-1 font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                {formatFCFA(montantUrgenceNum)}
              </p>
            )}
          </FormField>
          <div className="flex flex-col justify-end">
            {badgeMontant ? (
              <div className="rounded-lg px-3 py-2.5" style={{ background: badgeMontant.bg, border: `1px solid ${badgeMontant.border}` }}>
                <p className="font-display font-bold text-sm" style={{ color: badgeMontant.color }}>
                  {badgeMontant.label}
                </p>
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Saisissez un montant</p>
              </div>
            )}
          </div>
        </div>

        {/* Champ 8 — Mode de paiement urgent */}
        <FormField label="Mode de paiement urgent *" error={errors.modePaiementUrgent}>
          <select value={form.modePaiementUrgent} onChange={set("modePaiementUrgent")} className="form-input">
            <option value="">Sélectionner…</option>
            {(Object.entries(LABEL_MODE_PAIEMENT_URGENT) as [ModePaiementUrgent, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>

        {/* Champ 9 — Responsable sur site */}
        <FormField label="Responsable sur site *" error={errors.responsableSite}>
          <input
            type="text"
            placeholder="Nom et fonction de la personne présente"
            value={form.responsableSite}
            onChange={set("responsableSite")}
            className="form-input"
          />
        </FormField>

        {/* Champ 10 — Date et heure de l'incident */}
        <FormField label="Date et heure de l'incident *" error={errors.dateIncident}>
          <input
            type="datetime-local"
            value={form.dateIncident}
            onChange={set("dateIncident")}
            className="form-input"
          />
        </FormField>

        {/* Champ 11 — Photos / Documents */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
            Photos de la situation
            <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>
              (fortement recommandé — PDF, JPG, PNG — max {MAX_FICHIERS_URGENCE} fichiers, 10 Mo/fichier)
            </span>
          </label>
          <button
            type="button"
            onClick={() => urgenceFileRef.current?.click()}
            disabled={fichiersUrgence.length >= MAX_FICHIERS_URGENCE}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-5 transition-all disabled:opacity-50"
            style={{ background: "var(--bg-elevated)", border: "2px dashed rgba(239,68,68,0.40)", color: "var(--text-muted)" }}
            onMouseEnter={(e) => { if (fichiersUrgence.length < MAX_FICHIERS_URGENCE) { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "var(--text-secondary)" }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.40)"; e.currentTarget.style.color = "var(--text-muted)" }}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-display font-medium">
              {fichiersUrgence.length >= MAX_FICHIERS_URGENCE ? "Limite atteinte" : "Ajouter des photos / documents"}
            </span>
          </button>
          <input
            ref={urgenceFileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            style={{ display: "none" }}
            onChange={handleFichiersUrgence}
          />
          {fichiersUrgence.length > 0 && (
            <div className="space-y-1.5 mt-1">
              {fichiersUrgence.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#60a5fa" }} />
                    <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{f.name}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>({(f.size / 1024 / 1024).toFixed(1)} Mo)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFichiersUrgence((prev) => prev.filter((_, j) => j !== i))}
                    className="p-1 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    )
  }

  /* ── Dispatch contenu selon étape + parcours ── */

  function renderContenu() {
    if (etape === 1) return renderEtape1()

    if (form.typeDemande === "PIECE_CAISSE")    return renderEtape2Caisse()
    if (form.typeDemande === "DEPART_MISSION")  return renderEtape2Mission()
    if (form.typeDemande === "URGENCE_TERRAIN") return renderEtape2Urgence()

    // ACHAT_PRESTATION
    if (etape === 2) return renderEtape2Achat()
    if (etape === 3) return renderEtape3Achat()
    return renderEtape4Achat()
  }

  /* ── Boutons d'action (partie droite de la nav) ── */

  function renderBoutonsAction() {
    // Urgence terrain étape 2 : bouton rouge "Envoyer en urgence"
    if (form.typeDemande === "URGENCE_TERRAIN" && etape === 2) {
      return <BoutonEnvoyerUrgence onClick={submitUrgenceTerrain} isPending={isPending} />
    }

    // Pièce de caisse étape 2 : Envoyer uniquement
    if (form.typeDemande === "PIECE_CAISSE" && etape === 2) {
      return (
        <BoutonEnvoyer onClick={submitPieceCaisse} isPending={isPending} />
      )
    }

    // Départ de mission étape 2 : Envoyer uniquement
    if (form.typeDemande === "DEPART_MISSION" && etape === 2) {
      return (
        <BoutonEnvoyer onClick={submitDepartMission} isPending={isPending} />
      )
    }

    // Achat-Prestation étapes 1–3 : Suivant
    if (etape < 4) {
      return (
        <button
          onClick={handleSuivant}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
            color:      "var(--text-inverse)",
            boxShadow:  "0 0 16px var(--gold-glow)",
          }}
        >
          Suivant <ChevronRight className="w-4 h-4" />
        </button>
      )
    }

    // Achat-Prestation étape 4 : Brouillon + Envoyer
    return (
      <>
        <button
          onClick={() => submitAchatPrestation(false)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium transition-all disabled:opacity-50"
          style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green-vivid)" }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)"  }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer brouillon"}
        </button>
        <BoutonEnvoyer onClick={() => submitAchatPrestation(true)} isPending={isPending} disabled={montantAchatNum <= 0} />
      </>
    )
  }

  /* ─────────────────────────────────────────────────────────
     Render principal
  ───────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <style>{`
        .form-input {
          width: 100%;
          background: var(--bg-elevated);
          border: 1px solid var(--bg-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 150ms;
          font-family: 'DM Sans', sans-serif;
        }
        .form-input::placeholder { color: var(--text-muted); }
        .form-input:focus { border-color: var(--green-vivid); }
        .form-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        .form-input option { background: var(--bg-elevated); color: var(--text-primary); }
        @keyframes fadeInEtape {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .etape-content { animation: fadeInEtape 200ms ease-out; }
        @keyframes pulseUrgence {
          0%, 100% { box-shadow: 0 0 12px rgba(239,68,68,0.50); }
          50%       { box-shadow: 0 0 24px rgba(239,68,68,0.85); }
        }
        .btn-urgence { animation: pulseUrgence 2s ease-in-out infinite; }
      `}</style>

      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "16px" }}
      >
        {/* En-tête */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Nouvelle demande d'achat
            </DialogTitle>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.backgroundColor = "var(--bg-elevated)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)";   e.currentTarget.style.backgroundColor = "transparent" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <StepperBar etapeActuelle={etape} steps={steps} />
        </DialogHeader>

        {/* Titre de l'étape */}
        <div className="px-6 py-3" style={{ borderTop: "1px solid var(--bg-border)", borderBottom: "1px solid var(--bg-border)" }}>
          <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Étape {etape} sur {steps.length}
          </p>
          <p className="font-display font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {titreEtape}
          </p>
        </div>

        {/* Contenu avec fade */}
        <div className="px-6 py-5">
          <div key={`${etape}-${form.typeDemande}`} className="etape-content">
            {renderContenu()}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
          <button
            onClick={() => { setErrors({}); setEtape((n) => Math.max(n - 1, 1)) }}
            disabled={etape === 1 || isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium transition-colors disabled:opacity-30"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
            onMouseEnter={(e) => { if (etape > 1) e.currentTarget.style.backgroundColor = "var(--bg-elevated)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-display font-medium transition-colors disabled:opacity-50"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
            >
              Annuler
            </button>
            {renderBoutonsAction()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Bouton Envoyer réutilisable ── */
function BoutonEnvoyer({
  onClick, isPending, disabled = false,
}: {
  onClick:    () => void
  isPending:  boolean
  disabled?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending || disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
        color:      "var(--text-inverse)",
        boxShadow:  "0 0 16px var(--gold-glow)",
      }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
    </button>
  )
}

/* ── Bouton Envoyer en urgence ── */
function BoutonEnvoyerUrgence({
  onClick, isPending,
}: {
  onClick:   () => void
  isPending: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="btn-urgence flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
      style={{ background: "#ef4444", color: "#ffffff" }}
    >
      {isPending
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <AlertTriangle className="w-4 h-4" />
      }
      Envoyer en urgence
    </button>
  )
}

/* ── Stepper adaptatif ── */
function StepperBar({
  etapeActuelle,
  steps,
}: {
  etapeActuelle: number
  steps: Array<{ num: number; label: string }>
}) {
  return (
    <div className="flex items-start justify-center pb-4">
      {steps.map(({ num, label }, i) => {
        const fait  = num < etapeActuelle
        const actif = num === etapeActuelle
        return (
          <div key={num} className="flex items-start">
            <div className="flex flex-col items-center" style={{ minWidth: "64px" }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all"
                style={{
                  background: fait  ? "#2d9e5f" : actif ? "#f0a500" : "var(--bg-elevated)",
                  color:      fait || actif ? "#fff" : "var(--text-muted)",
                  border:     `2px solid ${fait ? "#2d9e5f" : actif ? "#f0a500" : "var(--bg-border)"}`,
                }}
              >
                {fait ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className="text-xs font-display font-medium mt-1.5 text-center"
                style={{ color: actif ? "var(--gold-warm)" : fait ? "var(--green-vivid)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 mt-4 flex-shrink-0 transition-all"
                style={{ width: "40px", background: num < etapeActuelle ? "#2d9e5f" : "var(--bg-border)" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Champ de formulaire avec label + sous-titre + erreur ── */
function FormField({
  label, sousTitre, error, children,
}: {
  label:      string
  sousTitre?: string
  error?:     string
  children:   React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <label className="text-xs font-display font-semibold" style={{ color: "var(--text-secondary)" }}>
          {label}
        </label>
        {sousTitre && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sousTitre}</p>
        )}
      </div>
      {children}
      {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  )
}

/* ── Ligne de récapitulatif ── */
function SummaryLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-display font-semibold flex-shrink-0 w-24" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{children}</span>
    </div>
  )
}
