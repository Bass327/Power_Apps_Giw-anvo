import { useContext } from "react"
import { ThemeProviderContext } from "@/providers/theme-provider"
 
export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme doit être utilisé dans un ThemeProvider")

  return context
}