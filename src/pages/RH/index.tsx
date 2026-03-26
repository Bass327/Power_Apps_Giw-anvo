import { Users } from "lucide-react"
import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"

const procedures = [
  { name: "Recrutement",                              list: "Utilisateurs_Giwanvo" },
  { name: "Gestion des absences",                     list: "Demandes_Congs" },
  { name: "Gestion des missions / Ordres de mission", list: "Ordres_Mission" },
  { name: "Gestion des congés",                       list: "Demandes_Congs" },
  { name: "Sanctions disciplinaires",                 list: "Utilisateurs_Giwanvo" },
  { name: "Évaluation des performances",              list: "valuations_Performance" },
  { name: "Gestion du courrier",                      list: "À créer" },
]

const DESCRIPTIONS = {
  partial: "Soumettez vos demandes de congé et d'absence, consultez vos évaluations et ordres de mission personnels.",
  full:    "Gestion complète du personnel : congés, missions, évaluations, recrutement et gestion disciplinaire.",
}

export default function RHPage() {
  const { role } = useCurrentUser()
  const access   = role ? getModuleAccess(role, "rh") : "none"

  // Comptable → accès refusé
  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.rh} />
  }

  const description = DESCRIPTIONS[access as keyof typeof DESCRIPTIONS] ?? DESCRIPTIONS.partial

  return (
    <ModulePlaceholder
      label="Ressources Humaines"
      description={description}
      Icon={Users}
      iconColor="#60a5fa"
      bgColor="rgba(96,165,250,0.1)"
      procedures={procedures}
      accessLevel={access as "read" | "partial" | "full"}
    />
  )
}
