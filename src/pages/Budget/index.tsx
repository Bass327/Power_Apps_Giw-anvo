import { BarChart3 } from "lucide-react"
import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"

const procedures = [
  { name: "Préparation du budget (PAB)", list: "Suivi_Budgtaire" },
  { name: "Exécution budgétaire",        list: "Suivi_Budgtaire" },
  { name: "Suivi trimestriel budgétaire", list: "Suivi_Budgtaire" },
]

/* Descriptions adaptées au niveau d'accès */
const DESCRIPTIONS = {
  read:    "Consultez le budget de votre département. La modification est réservée au RAF.",
  partial: "Consultez le budget de votre département et soumettez des demandes de modification au RAF.",
  full:    "Gestion complète du cycle budgétaire : préparation du PAB, exécution, suivi trimestriel et soumission à la Directrice.",
}

export default function BudgetPage() {
  const { role } = useCurrentUser()
  const access   = role ? getModuleAccess(role, "budget") : "read"

  // Budget : tous les rôles ont au moins un accès lecture — pas de refus
  const description = DESCRIPTIONS[access as keyof typeof DESCRIPTIONS] ?? DESCRIPTIONS.read

  return (
    <ModulePlaceholder
      label="Budget"
      description={description}
      Icon={BarChart3}
      iconColor="#4ade80"
      bgColor="rgba(74,222,128,0.1)"
      procedures={procedures}
      accessLevel={access as "read" | "partial" | "full"}
    />
  )
}
