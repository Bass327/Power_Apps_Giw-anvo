import { useState, useMemo, useEffect } from "react"
import {
  Plus, Search, ShoppingCart, FileText,
  ClipboardCheck, LayoutList, Loader2, AlertCircle,
  Wallet, CheckCircle2, ArrowLeft,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useDemandesAchats } from "@/hooks/useDemandesAchats"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import type { DemandeAchat, StatutDemande } from "@/types/DemandeAchat"
import { STATUT_CONFIG } from "@/types/DemandeAchat"
import type { UserRole } from "@/types/user"
import { formatFCFA, formatDateFr } from "@/lib/utils"
import { FormulaireDemandeAchat } from "./components/FormulaireDemandeAchat"
import { DetailDemandeAchat } from "./components/DetailDemandeAchat"

/* ── Types d'onglets possibles selon le rôle ── */
type Onglet =
  | "mes-demandes"
  | "a-valider"
  | "toutes"
  | "mon-departement"
  | "a-approuver"
  | "en-paiement"
  | "soldees"

interface OngletConfig {
  id:    Onglet
  label: string
  icon:  React.ReactNode
}

/* ── Configuration des onglets selon le rôle ── */
function getOnglets(role: UserRole | undefined): OngletConfig[] {
  switch (role) {
    case "Employé":
      return [
        { id: "mes-demandes", label: "Mes demandes",    icon: <FileText className="w-4 h-4" /> },
      ]

    case "Chef Dept.":
      return [
        { id: "mes-demandes",     label: "Mes demandes",       icon: <FileText className="w-4 h-4" /> },
        { id: "a-valider",        label: "À valider par moi",  icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: "mon-departement",  label: "Mon département",    icon: <LayoutList className="w-4 h-4" /> },
      ]

    case "RAF":
      return [
        { id: "mes-demandes", label: "Mes demandes",        icon: <FileText className="w-4 h-4" /> },
        { id: "a-valider",    label: "À valider",           icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: "toutes",       label: "Toutes les demandes", icon: <LayoutList className="w-4 h-4" /> },
      ]

    case "Comptable":
      return [
        { id: "en-paiement", label: "En paiement",         icon: <Wallet className="w-4 h-4" /> },
        { id: "soldees",     label: "Soldées",              icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: "toutes",      label: "Toutes",               icon: <LayoutList className="w-4 h-4" /> },
      ]

    case "Directrice":
      return [
        { id: "a-approuver", label: "À approuver",         icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: "toutes",      label: "Toutes les demandes", icon: <LayoutList className="w-4 h-4" /> },
      ]

    default:
      return [
        { id: "mes-demandes", label: "Mes demandes", icon: <FileText className="w-4 h-4" /> },
      ]
  }
}

/* ── Filtrage des demandes selon l'onglet et le rôle ── */
function filtrerParOnglet(
  demandes: DemandeAchat[],
  onglet:   Onglet,
  user:     { email: string; role: UserRole } | undefined,
): DemandeAchat[] {
  if (!user) return []

  switch (onglet) {
    case "mes-demandes":
      return demandes.filter((d) => d.demandeur === user.email)

    case "a-approuver":
      // Directrice approuve directement les demandes soumises
      return demandes.filter((d) => d.statut === "SOUMIS")

    case "mon-departement":
      // Chef Dept. voit toutes les demandes (filtrage département à implémenter côté SP)
      return demandes

    case "en-paiement":
      return demandes.filter((d) => d.statut === "APPROUVE" || d.statut === "EN_PAIEMENT")

    case "soldees":
      return demandes.filter((d) => d.statut === "SOLDE")

    case "toutes":
      return demandes

    default:
      return demandes
  }
}

/* ── Rôles qui peuvent créer une demande ── */
const ROLES_PEUVENT_CREER: UserRole[] = ["Employé", "RAF", "Chef Dept."]

export default function AchatsPage() {
  const [onglet, setOnglet]              = useState<Onglet>("mes-demandes")
  const [recherche, setRecherche]        = useState("")
  const [filtreStatut, setFiltreStatut]  = useState<StatutDemande | "TOUS">("TOUS")
  const [formulaireOuvert, setFormulaire] = useState(false)
  const [demandeSelectee, setDemande]    = useState<DemandeAchat | null>(null)

  const navigate               = useNavigate()
  const { user: currentUser }  = useCurrentUser()
  const { data: demandes = [], isLoading, isError } = useDemandesAchats()

  /* Onglets selon le rôle */
  const onglets = useMemo(
    () => getOnglets(currentUser?.role),
    [currentUser?.role],
  )

  /* Réinitialiser l'onglet actif quand le rôle change */
  useEffect(() => {
    if (currentUser?.role) {
      const premierOnglet = getOnglets(currentUser.role)[0]?.id ?? "mes-demandes"
      setOnglet(premierOnglet)
    }
  }, [currentUser?.role])

  /* ── Filtrage selon l'onglet, le rôle, le statut et la recherche ── */
  const demandesFiltrees = useMemo(() => {
    let liste = filtrerParOnglet(demandes, onglet, currentUser)

    if (filtreStatut !== "TOUS") {
      liste = liste.filter((d) => d.statut === filtreStatut)
    }

    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase()
      liste = liste.filter(
        (d) =>
          d.titre.toLowerCase().includes(q) ||
          d.demandeur.toLowerCase().includes(q) ||
          d.ligneBudgetaire.toLowerCase().includes(q),
      )
    }

    return liste
  }, [demandes, onglet, currentUser, filtreStatut, recherche])

  /* ── Badge sur l'onglet "À valider" / "À approuver" ── */
  const nbATraiter = useMemo(() => {
    if (!currentUser) return 0
    if (currentUser.role === "Directrice") {
      return demandes.filter((d) => d.statut === "SOUMIS").length
    }
    if (currentUser.role === "Comptable") {
      return demandes.filter((d) => d.statut === "APPROUVE").length
    }
    return 0
  }, [demandes, currentUser])

  /* ── Stats rapides adaptées au rôle ── */
  const stats = useMemo(() => {
    const role = currentUser?.role

    if (role === "Comptable") {
      return [
        { label: "À traiter",   value: demandes.filter((d) => d.statut === "APPROUVE").length },
        { label: "En paiement", value: demandes.filter((d) => d.statut === "EN_PAIEMENT").length },
        { label: "Soldées",     value: demandes.filter((d) => d.statut === "SOLDE").length },
        {
          label: "Volume traité",
          value: formatFCFA(
            demandes
              .filter((d) => d.statut === "SOLDE" || d.statut === "EN_PAIEMENT")
              .reduce((sum, d) => sum + d.montant, 0),
          ),
          raw: true,
        },
      ]
    }

    if (role === "Directrice") {
      const mois = new Date().getMonth()
      const annee = new Date().getFullYear()
      const duMois = (d: DemandeAchat) => {
        const date = new Date(d.dateApprobation || d.dateDemande)
        return date.getMonth() === mois && date.getFullYear() === annee
      }
      return [
        { label: "En attente",       value: demandes.filter((d) => d.statut === "SOUMIS").length },
        { label: "Approuvées / mois", value: demandes.filter((d) => d.statut === "APPROUVE" && duMois(d)).length },
        { label: "Rejetées / mois",  value: demandes.filter((d) => d.statut === "REJETE" && duMois(d)).length },
        {
          label: "Volume approuvé",
          value: formatFCFA(
            demandes
              .filter((d) => d.statut === "APPROUVE" && duMois(d))
              .reduce((sum, d) => sum + d.montant, 0),
          ),
          raw: true,
        },
      ]
    }

    // Vue standard (Employé, Chef Dept., RAF)
    const mesDemandes = demandes.filter((d) => d.demandeur === currentUser?.email)
    return [
      { label: "Mes demandes", value: mesDemandes.length },
      { label: "En cours",     value: mesDemandes.filter((d) => !["APPROUVE", "SOLDE", "REJETE"].includes(d.statut)).length },
      { label: "Approuvées",   value: mesDemandes.filter((d) => d.statut === "APPROUVE" || d.statut === "SOLDE").length },
      {
        label: "Volume approuvé",
        value: mesDemandes
          .filter((d) => d.statut === "APPROUVE" || d.statut === "SOLDE")
          .reduce((sum, d) => sum + d.montant, 0) > 0
          ? formatFCFA(mesDemandes
              .filter((d) => d.statut === "APPROUVE" || d.statut === "SOLDE")
              .reduce((sum, d) => sum + d.montant, 0))
          : "—",
        raw: true,
      },
    ]
  }, [demandes, currentUser])

  /* Ids des onglets qui portent le badge numérique */
  const ongletsBadge: Onglet[] = ["a-valider", "a-approuver", "en-paiement"]

  const peutCreer = ROLES_PEUVENT_CREER.includes(currentUser?.role ?? "Employé")

  /* ── Message vide selon l'onglet ── */
  function messageVide(): string {
    switch (onglet) {
      case "mes-demandes":     return "Vous n'avez aucune demande pour le moment"
      case "a-valider":        return "Aucune demande en attente de votre validation"
      case "a-approuver":      return "Aucune demande en attente d'approbation"
      case "mon-departement":  return "Aucune demande dans votre département"
      case "en-paiement":      return "Aucune demande à traiter"
      case "soldees":          return "Aucun paiement soldé"
      default:                 return "Aucune demande ne correspond à votre recherche"
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── En-tête de page ── */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--bg-border)" }}>
        {/* Bouton retour tableau de bord */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Tableau de bord
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.20)" }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>
                Achats
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Demandes d'achat et procédures internes
              </p>
            </div>
          </div>

          {/* Bouton visible uniquement pour les rôles qui peuvent créer */}
          {peutCreer && (
            <button
              onClick={() => setFormulaire(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                color:      "var(--text-inverse)",
                boxShadow:  "0 0 16px var(--gold-glow)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)" }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)" }}
            >
              <Plus className="w-4 h-4" />
              Nouvelle demande
            </button>
          )}
        </div>

        {/* ── Statistiques rapides ── */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {stats.map(({ label, value, raw }) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {label}
              </p>
              <p
                className="font-display font-bold text-xl mt-1"
                style={{ color: raw ? "var(--gold-warm)" : "var(--text-primary)" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Onglets ── */}
      <div
        className="px-6 flex items-center gap-1 pt-4"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        {onglets.map(({ id, label, icon }) => {
          const actif = onglet === id
          const afficherBadge = ongletsBadge.includes(id) && nbATraiter > 0
          return (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-display font-medium transition-all relative"
              style={{
                color:        actif ? "var(--text-primary)" : "var(--text-muted)",
                background:   actif ? "var(--bg-surface)"  : "transparent",
                borderBottom: actif ? "2px solid var(--gold-warm)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {icon}
              {label}
              {afficherBadge && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full ml-1"
                  style={{
                    background: "var(--gold-warm)",
                    color:      "var(--text-inverse)",
                    minWidth:   "18px",
                    textAlign:  "center",
                  }}
                >
                  {nbATraiter}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filtres ── */}
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
        {/* Barre de recherche */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px]"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher par objet, demandeur, ligne budgétaire..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{
              background: "transparent",
              border:     "none",
              outline:    "none",
              width:      "100%",
              fontSize:   "14px",
              color:      "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        {/* Filtre statut */}
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value as StatutDemande | "TOUS")}
          style={{
            background:   "var(--bg-surface)",
            border:       "1px solid var(--bg-border)",
            borderRadius: "8px",
            padding:      "8px 12px",
            fontSize:     "14px",
            color:        "var(--text-secondary)",
            outline:      "none",
            fontFamily:   "'DM Sans', sans-serif",
            cursor:       "pointer",
          }}
        >
          <option value="TOUS">Tous les statuts</option>
          {(Object.entries(STATUT_CONFIG) as [StatutDemande, typeof STATUT_CONFIG[StatutDemande]][]).map(
            ([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ),
          )}
        </select>
      </div>

      {/* ── Contenu principal ── */}
      <div className="px-6 pb-6">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
            <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Chargement des demandes…
            </span>
          </div>
        )}

        {isError && (
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)" }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm" style={{ color: "#ef4444" }}>
              Impossible de charger les demandes. Vérifiez votre connexion et réessayez.
            </p>
          </div>
        )}

        {!isLoading && !isError && demandesFiltrees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="p-4 rounded-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
            >
              <ShoppingCart className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-display font-medium" style={{ color: "var(--text-secondary)" }}>
              {messageVide()}
            </p>
            {onglet === "mes-demandes" && peutCreer && (
              <button
                onClick={() => setFormulaire(true)}
                className="text-sm font-display font-semibold px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold-warm), var(--gold-bright))",
                  color:      "var(--text-inverse)",
                }}
              >
                Créer ma première demande
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && demandesFiltrees.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--bg-border)" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Objet", "Demandeur", "Montant", "Date de besoin", "Type", "Statut"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-display font-semibold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demandesFiltrees.map((d, i) => {
                  const cfg = STATUT_CONFIG[d.statut]
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setDemande(d)}
                      style={{
                        background:   i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                        cursor:       "pointer",
                        transition:   "background 150ms",
                        borderBottom: "1px solid var(--bg-border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background  = "var(--bg-elevated)"
                        e.currentTarget.style.borderLeft  = "3px solid var(--gold-warm)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background  = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)"
                        e.currentTarget.style.borderLeft  = "3px solid transparent"
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-display font-medium" style={{ color: "var(--text-primary)" }}>
                          {d.titre}
                        </p>
                        {d.ligneBudgetaire && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {d.ligneBudgetaire}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {d.demandeur.split("@")[0]}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-display font-semibold" style={{ color: "var(--gold-warm)" }}>
                          {formatFCFA(d.montant)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {formatDateFr(d.dateBesoin)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-display font-medium px-2 py-0.5 rounded-md"
                          style={{
                            background: d.typeAchat === "ORDINAIRE"
                              ? "rgba(34,197,94,0.08)"
                              : "rgba(239,68,68,0.08)",
                            color: d.typeAchat === "ORDINAIRE" ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {d.typeAchat === "ORDINAIRE" ? "Ordinaire" : "Restreint"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-display font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: cfg.bg,
                            color:      cfg.color,
                            border:     `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pied de tableau */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--bg-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {demandesFiltrees.length} demande{demandesFiltrees.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Cliquez sur une ligne pour voir les détails
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      <FormulaireDemandeAchat
        open={formulaireOuvert}
        onClose={() => setFormulaire(false)}
      />

      <DetailDemandeAchat
        demande={demandeSelectee}
        open={demandeSelectee !== null}
        onClose={() => setDemande(null)}
      />
    </div>
  )
}
