import { createContext, useContext, useState } from "react"
import type { UserRole } from "@/types/user"

const STORAGE_KEY = "dev_role_override"

export const ROLES_TEST: UserRole[] = [
  "Employé", "Chef Dept.", "RAF", "Directrice", "Comptable",
]

interface RoleOverrideCtx {
  roleOverride: UserRole | null
  setRoleOverride: (role: UserRole | null) => void
}

const RoleOverrideContext = createContext<RoleOverrideCtx>({
  roleOverride:    null,
  setRoleOverride: () => {},
})

export function RoleOverrideProvider({ children }: { children: React.ReactNode }) {
  const [roleOverride, setRoleOverrideState] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored as UserRole) || null
  })

  const setRoleOverride = (role: UserRole | null) => {
    if (role) {
      localStorage.setItem(STORAGE_KEY, role)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setRoleOverrideState(role)
  }

  return (
    <RoleOverrideContext.Provider value={{ roleOverride, setRoleOverride }}>
      {children}
    </RoleOverrideContext.Provider>
  )
}

export const useRoleOverride = () => useContext(RoleOverrideContext)
