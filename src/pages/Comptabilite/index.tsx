import { BookOpen } from "lucide-react"
import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"

const procedures = [
  { name: "Journaux comptables",                list: "Journal_Caisse" },
  { name: "Tableau de bord mensuel",            list: "Suivi_Budgtaire" },
  { name: "Arrêté des comptes annuels",         list: "Suivi_Budgtaire" },
  { name: "Gestion des pièces justificatives",  list: "Journal_Caisse" },
  { name: "Amortissements des immobilisations", list: "Lecture seule / reporting" },
]

const DESCRIPTIONS = {
  full:    "Saisie des écritures comptables, gestion des journaux, production des états financiers et gestion des pièces justificatives.",
  read:    "Consultez les états financiers et les rapports comptables.",
}

export default function ComptabilitePage() {
  const { role } = useCurrentUser()
  const access   = role ? getModuleAccess(role, "comptabilite") : "none"

  // Employé et Chef Dept. → accès refusé
  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.comptabilite} />
  }

  const description = DESCRIPTIONS[access as keyof typeof DESCRIPTIONS] ?? DESCRIPTIONS.full

  return (
    <ModulePlaceholder
      label="Comptabilité"
      description={description}
      Icon={BookOpen}
      iconColor="#fb923c"
      bgColor="rgba(251,146,60,0.1)"
      procedures={procedures}
      accessLevel={access as "read" | "partial" | "full"}
    />
  )
}
