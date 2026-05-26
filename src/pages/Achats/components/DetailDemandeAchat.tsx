import { useState } from "react"
import {
  X, CheckCircle, XCircle, AlertCircle,
  Building2, Calendar, User, FileText, Banknote,
  Loader2, ArrowRight, CreditCard, BadgeCheck,
  Paperclip, Download,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUpdateStatutDemande, useDemandeAttachments } from "@/hooks/useDemandesAchats"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import type { DemandeAchat, StatutDemande } from "@/types/DemandeAchat"
import { STATUT_CONFIG, CIRCUIT_VALIDATION, TYPE_CONFIG, ETAPES_CIRCUIT } from "@/types/DemandeAchat"
import { formatFCFA, formatDateFr } from "@/lib/utils"

interface Props {
  demande: DemandeAchat | null
  open:    boolean
  onClose: () => void
}

function etapeAtteinte(statut: StatutDemande, etape: StatutDemande): boolean {
  if (statut === "REJETE") return false
  return ETAPES_CIRCUIT.indexOf(statut) >= ETAPES_CIRCUIT.indexOf(etape)
}

export function DetailDemandeAchat({ demande, open, onClose }: Props) {
  const [commentaire, setCommentaire] = useState("")
  const [actionEnCours, setAction]    = useState<"valider" | "rejeter" | null>(null)

  const { user: currentUser }                    = useCurrentUser()
  const { mutate, isPending }                    = useUpdateStatutDemande()
  const { data: attachments = [], isLoading: loadingAttachments } = useDemandeAttachments(demande?.id)

  if (!demande) return null

  const statut  = demande.statut
  const config  = STATUT_CONFIG[statut]
  const circuit = CIRCUIT_VALIDATION[demande.typeAchat]
  const role    = currentUser?.role

  /* ── Déterminer quelle action l'utilisateur peut faire selon son étape dans le circuit ── */
  // Chef Dept. valide après soumission (SOUMIS → VALIDE_CHEF)
  const peutValiderChef     = role === "Chef Dept." && statut === "SOUMIS"
  // Directrice peut approuver dès SOUMIS ou après VALIDE_CHEF :
  // le Chef et la DG reçoivent les deux la demande en parallèle.
  // L'approbation DG suffit même si le Chef n'a pas encore validé.
  const peutApprouverDir    = role === "Directrice"  && (statut === "SOUMIS" || statut === "VALIDE_CHEF")
  const peutMarquerPaiement = role === "Comptable"   && statut === "APPROUVE"
  const peutSolderPaiement  = role === "Comptable"   && statut === "EN_PAIEMENT"

  const peutAgir = peutValiderChef || peutApprouverDir || peutMarquerPaiement || peutSolderPaiement

  /* ── Libellé de l'action selon le rôle ── */
  function labelAction(): string {
    if (peutValiderChef)     return "Validation Chef de département"
    if (peutApprouverDir)    return "Approbation Directrice Générale"
    if (peutMarquerPaiement) return "Traitement du paiement"
    if (peutSolderPaiement)  return "Confirmation de paiement soldé"
    return ""
  }

  /* ── Soumission d'une action ── */
  function handleAction(rejeter: boolean) {
    if (!demande || !role) return

    let nouveauStatut: StatutDemande

    if (rejeter) {
      nouveauStatut = "REJETE"
    } else if (peutValiderChef) {
      nouveauStatut = "VALIDE_CHEF"
    } else if (peutApprouverDir) {
      nouveauStatut = "APPROUVE"
    } else if (peutMarquerPaiement) {
      nouveauStatut = "EN_PAIEMENT"
    } else {
      nouveauStatut = "SOLDE"
    }

    mutate(
      {
        id:             demande.id,
        update:         { statut: nouveauStatut, commentaire },
        role,
        demandeurEmail: demande.demandeur,
        titre:          demande.titre,
      },
      {
        onSuccess: () => {
          setCommentaire("")
          setAction(null)
          onClose()
        },
      },
    )
  }

  function handleClose() {
    if (isPending) return
    setCommentaire("")
    setAction(null)
    onClose()
  }

  /* ── Pour Comptable : pas de commentaire obligatoire, juste bouton d'action ── */
  const estActionComptable = peutMarquerPaiement || peutSolderPaiement

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        showCloseButton={false}
        // Radix UI fermerait la modale sur pointerdown hors contenu (fréquent dans iframe Power Apps)
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={{
          background:   "var(--bg-surface)",
          border:       "1px solid var(--bg-border)",
          borderRadius: "16px",
        }}
      >
        {/* ── En-tête ── */}
        <DialogHeader
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle
                className="font-display font-bold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                {demande.titre}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                {/* Badge statut */}
                <span
                  className="text-xs font-display font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: config.bg,
                    color:      config.color,
                    border:     `1px solid ${config.border}`,
                  }}
                >
                  {config.label}
                </span>
                {/* Badge type */}
                <span
                  className="text-xs font-display font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    background: demande.typeAchat === "ORDINAIRE"
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(239,68,68,0.08)",
                    color: demande.typeAchat === "ORDINAIRE" ? "#22c55e" : "#ef4444",
                    border: `1px solid ${demande.typeAchat === "ORDINAIRE"
                      ? "rgba(34,197,94,0.30)"
                      : "rgba(239,68,68,0.30)"}`,
                  }}
                >
                  Achat {TYPE_CONFIG[demande.typeAchat].label}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color           = "var(--text-primary)"
                e.currentTarget.style.backgroundColor = "var(--bg-elevated)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color           = "var(--text-muted)"
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">

          {/* ── Montant (mise en avant) ── */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: "rgba(240,165,0,0.12)" }}>
                <Banknote className="w-5 h-5" style={{ color: "var(--gold-warm)" }} />
              </div>
              <div>
                <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Montant
                </p>
                <p className="font-display font-bold text-xl" style={{ color: "var(--gold-warm)" }}>
                  {formatFCFA(demande.montant)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {TYPE_CONFIG[demande.typeAchat].seuil}
              </p>
            </div>
          </div>

          {/* ── Informations principales ── */}
          <div className="grid grid-cols-2 gap-4">
            <InfoLine icon={<User className="w-4 h-4" />} label="Demandeur">
              {demande.demandeur}
            </InfoLine>
            <InfoLine icon={<Calendar className="w-4 h-4" />} label="Date de besoin">
              {formatDateFr(demande.dateBesoin)}
            </InfoLine>
            <InfoLine icon={<FileText className="w-4 h-4" />} label="Ligne budgétaire">
              {demande.ligneBudgetaire}
            </InfoLine>
            {demande.fournisseur && (
              <InfoLine icon={<Building2 className="w-4 h-4" />} label="Fournisseur suggéré">
                {demande.fournisseur}
              </InfoLine>
            )}
            <InfoLine icon={<Calendar className="w-4 h-4" />} label="Date de demande">
              {formatDateFr(demande.dateDemande)}
            </InfoLine>
          </div>

          {/* ── Description ── */}
          <Section title="Description">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {demande.description}
            </p>
          </Section>

          {/* ── Justification ── */}
          <Section title="Justification">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {demande.justification}
            </p>
          </Section>

          {/* ── Pièces jointes ── */}
          <Section title="Pièces jointes">
            {loadingAttachments ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement…</span>
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune pièce jointe</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => {
                  const downloadUrl = `https://${import.meta.env.VITE_SHAREPOINT_HOSTNAME as string}${att.ServerRelativeUrl}`
                  return (
                    <a
                      key={att.FileName}
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors"
                      style={{
                        background: "var(--bg-elevated)",
                        border:     "1px solid var(--bg-border)",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green-vivid)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bg-border)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 flex-shrink-0" style={{ color: "#60a5fa" }} />
                        <span className="text-sm truncate font-display" style={{ color: "var(--text-primary)" }}>
                          {att.FileName}
                        </span>
                      </div>
                      <Download className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    </a>
                  )
                })}
              </div>
            )}
          </Section>


          {/* ── Circuit de validation ── */}
          {statut !== "BROUILLON" && (
            <Section title="Circuit de validation">
              {/* Étapes visuelles */}
              <div className="flex items-center gap-1 flex-wrap mb-4">
                {circuit.map((etape, i) => {
                  const etapeStatut = ETAPES_CIRCUIT[i]
                  const atteinte    = etapeStatut ? etapeAtteinte(statut, etapeStatut) : false
                  const courante    = etapeStatut === statut

                  return (
                    <div key={etape} className="flex items-center gap-1">
                      <span
                        className="text-xs font-display font-medium px-2.5 py-1 rounded-lg transition-all"
                        style={{
                          background: atteinte
                            ? "rgba(45,158,95,0.15)"
                            : courante
                              ? "rgba(59,130,246,0.10)"
                              : "var(--bg-elevated)",
                          color: atteinte
                            ? "var(--green-vivid)"
                            : courante
                              ? "#60a5fa"
                              : "var(--text-muted)",
                          border: `1px solid ${atteinte
                            ? "rgba(45,158,95,0.30)"
                            : courante
                              ? "rgba(59,130,246,0.30)"
                              : "var(--bg-border)"}`,
                        }}
                      >
                        {atteinte && <span className="mr-1">✓</span>}
                        {etape}
                      </span>
                      {i < circuit.length - 1 && (
                        <ArrowRight
                          className="w-3 h-3 flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Note sur le circuit parallèle */}
              {statut === "SOUMIS" && (
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Le Chef de département et la Directrice Générale ont tous les deux reçu cette demande. L'approbation de l'un ou l'autre suffit.
                </p>
              )}

              {/* Commentaire du Chef de département (si validé ou rejeté par lui) */}
              {demande.commentaireChef && (
                <CommentaireValideur
                  role="Chef de département"
                  commentaire={demande.commentaireChef}
                  date={demande.dateValidationChef}
                  rejete={statut === "REJETE" && !demande.commentaireDirectrice}
                />
              )}

              {/* Commentaire de la Directrice Générale */}
              {demande.commentaireDirectrice && (
                <CommentaireValideur
                  role="Directrice Générale"
                  commentaire={demande.commentaireDirectrice}
                  date={demande.dateApprobation}
                  rejete={statut === "REJETE"}
                />
              )}
            </Section>
          )}

          {/* ── Zone d'action Comptable (sans commentaire) ── */}
          {estActionComptable && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: "var(--gold-warm)" }} />
                <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {labelAction()}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAction("valider")
                    handleAction(false)
                  }}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                    color:      "var(--text-inverse)",
                    boxShadow:  "0 0 16px var(--gold-glow)",
                  }}
                >
                  {isPending && actionEnCours === "valider"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <BadgeCheck className="w-4 h-4" />
                  }
                  {peutMarquerPaiement ? "Marquer en paiement" : "Confirmer soldé"}
                </button>
              </div>
            </div>
          )}

          {/* ── Zone d'action valideurs (Chef, RAF, Directrice) ── */}
          {peutAgir && !estActionComptable && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {labelAction()}
              </p>

              <textarea
                rows={3}
                placeholder="Commentaire (optionnel)..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                disabled={isPending}
                style={{
                  width:        "100%",
                  background:   "var(--bg-surface)",
                  border:       "1px solid var(--bg-border)",
                  borderRadius: "8px",
                  padding:      "8px 12px",
                  fontSize:     "14px",
                  color:        "var(--text-primary)",
                  outline:      "none",
                  resize:       "none",
                  fontFamily:   "'DM Sans', sans-serif",
                }}
              />

              <div className="flex gap-3">
                {/* Bouton Rejeter */}
                <button
                  onClick={() => {
                    setAction("rejeter")
                    handleAction(true)
                  }}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color:      "#ef4444",
                    border:     "1px solid rgba(239,68,68,0.30)",
                  }}
                >
                  {isPending && actionEnCours === "rejeter"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />
                  }
                  Rejeter
                </button>

                {/* Bouton Valider / Approuver */}
                <button
                  onClick={() => {
                    setAction("valider")
                    handleAction(false)
                  }}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                    color:      "var(--text-inverse)",
                    boxShadow:  "0 0 16px var(--gold-glow)",
                  }}
                >
                  {isPending && actionEnCours === "valider"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                  {peutValiderChef ? "Valider" : "Approuver"}
                </button>
              </div>
            </div>
          )}

          {/* ── Message si rejeté ── */}
          {statut === "REJETE" && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)" }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-display font-semibold" style={{ color: "#ef4444" }}>
                  Demande rejetée
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Cette demande a été rejetée. Vous pouvez créer une nouvelle demande avec les corrections nécessaires.
                </p>
              </div>
            </div>
          )}

          {/* ── Message si approuvé ── */}
          {statut === "APPROUVE" && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.30)" }}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
              <div>
                <p className="text-sm font-display font-semibold" style={{ color: "#22c55e" }}>
                  Demande approuvée
                </p>
                {demande.dateApprobation && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Approuvée le {formatDateFr(demande.dateApprobation)}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Pied de dialogue ── */}
        <div
          className="px-6 py-4 flex justify-end"
          style={{ borderTop: "1px solid var(--bg-border)" }}
        >
          <button
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-display font-medium transition-colors disabled:opacity-50"
            style={{
              color:  "var(--text-secondary)",
              border: "1px solid var(--bg-border)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-elevated)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            Fermer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Composants utilitaires ── */

function InfoLine({
  icon, label, children,
}: {
  icon:     React.ReactNode
  label:    string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--text-muted)" }}>{icon}</span>
        <span className="text-xs font-display font-semibold" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <p className="text-sm font-medium pl-5.5" style={{ color: "var(--text-primary)" }}>
        {children}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
    >
      <p className="text-xs font-display font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function CommentaireValideur({
  role, commentaire, date, rejete,
}: {
  role:        string
  commentaire: string
  date?:       string
  rejete:      boolean
}) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 mt-2"
      style={{
        background: rejete ? "rgba(239,68,68,0.06)" : "rgba(45,158,95,0.06)",
        border:     `1px solid ${rejete ? "rgba(239,68,68,0.20)" : "rgba(45,158,95,0.20)"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {rejete
          ? <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          : <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--green-vivid)" }} />
        }
        <span className="text-xs font-display font-semibold" style={{ color: rejete ? "#ef4444" : "var(--green-vivid)" }}>
          {role}
        </span>
        {date && (
          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
            {formatDateFr(date)}
          </span>
        )}
      </div>
      <p className="text-xs pl-5.5" style={{ color: "var(--text-secondary)" }}>
        {commentaire}
      </p>
    </div>
  )
}
