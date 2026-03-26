import { Wallet } from "lucide-react"
import { ModulePlaceholder } from "@/components/shared/ModulePlaceholder"
import { AccessDenied } from "@/components/shared/AccessDenied"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getModuleAccess, ACCESS_DENIED_MESSAGES } from "@/lib/permissions"

const procedures = [
  { name: "Alimentation des comptes bancaires", list: "Demandes_Dcaissement" },
  { name: "Dépenses par chèque / virement",     list: "Demandes_Dcaissement" },
  { name: "Rapprochement bancaire",             list: "Journal_Caisse" },
  { name: "Approvisionnement de la caisse",     list: "Journal_Caisse" },
  { name: "Paiements en espèces (caisse)",      list: "Journal_Caisse" },
  { name: "Inventaire de caisse",               list: "Journal_Caisse" },
]

const DESCRIPTIONS = {
  read:    "Consultez les décaissements de votre département. Les opérations sont réservées au RAF et au Comptable.",
  full:    "Gestion complète de la trésorerie : caisse, paiements bancaires, rapprochements et approbation des décaissements.",
}

export default function TresoreriePage() {
  const { role } = useCurrentUser()
  const access   = role ? getModuleAccess(role, "tresorerie") : "none"

  // Employé → accès refusé
  if (access === "none") {
    return <AccessDenied message={ACCESS_DENIED_MESSAGES.tresorerie} />
  }

  const description = DESCRIPTIONS[access as keyof typeof DESCRIPTIONS] ?? DESCRIPTIONS.full

  return (
    <ModulePlaceholder
      label="Trésorerie"
      description={description}
      Icon={Wallet}
      iconColor="#34d399"
      bgColor="rgba(52,211,153,0.1)"
      procedures={procedures}
      accessLevel={access as "read" | "partial" | "full"}
    />
  )
}
