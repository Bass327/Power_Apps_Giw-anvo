import { LineChart } from "lucide-react"
import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess } from "@/lib/permissions"

const procedures = [
  { name: "Contrôle financier interne",        list: "Suivi_Budgtaire" },
  { name: "Rapports techniques et financiers", list: "Suivi_Budgtaire" },
  { name: "Suivi budgétaire trimestriel",      list: "Suivi_Budgtaire" },
  { name: "Suivi-évaluation des projets",      list: "Suivi_Budgtaire" },
]

const DESCRIPTIONS = {
  read:    "Consultez les rapports et indicateurs qui vous concernent personnellement.",
  partial: "Accédez aux rapports de votre département et au suivi des indicateurs de votre équipe.",
  full:    "Tableau de contrôle global : contrôle financier interne, rapports techniques et financiers, suivi budgétaire et évaluation des projets.",
}

export default function SuiviControlePage() {
  const { role } = useCurrentUser()
  // Suivi & Contrôle est accessible à tous les rôles
  const access = role ? getModuleAccess(role, "suivi") : "read"

  const description = DESCRIPTIONS[access as keyof typeof DESCRIPTIONS] ?? DESCRIPTIONS.read

  return (
    <ModulePlaceholder
      label="Suivi & Contrôle"
      description={description}
      Icon={LineChart}
      iconColor="#f472b6"
      bgColor="rgba(244,114,182,0.1)"
      procedures={procedures}
      accessLevel={access as "read" | "partial" | "full"}
    />
  )
}
