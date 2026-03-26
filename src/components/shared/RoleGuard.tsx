import { useCurrentUser } from "@/hooks/useCurrentUser"
import type { UserRole } from "@/types/user"

interface Props {
  /** Liste des rôles autorisés à voir le contenu */
  roles:      UserRole[]
  children:   React.ReactNode
  /** Contenu affiché si le rôle n'est pas autorisé (null par défaut) */
  fallback?:  React.ReactNode
}

/**
 * Affiche `children` uniquement si l'utilisateur a l'un des rôles requis.
 * Affiche `fallback` si fourni, sinon ne rend rien.
 *
 * Usage :
 *   <RoleGuard roles={['RAF', 'Directrice']}>
 *     <BoutonValider />
 *   </RoleGuard>
 *
 *   <RoleGuard roles={['Comptable', 'RAF']} fallback={<AccessDenied message="..." />}>
 *     <ModuleComptabilite />
 *   </RoleGuard>
 */
export const RoleGuard = ({ roles, children, fallback = null }: Props) => {
  const { role } = useCurrentUser()

  if (!role || !roles.includes(role)) return <>{fallback}</>

  return <>{children}</>
}
