import { createContext, useEffect, useState } from "react"

export type Theme = "dark" | "light"

type ThemeProviderState = {
  theme:       Theme
  toggleTheme: () => void
}

const initialState: ThemeProviderState = {
  theme:       "dark",
  toggleTheme: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("giwa-theme")
    return stored === "light" ? "light" : "dark"
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    localStorage.setItem("giwa-theme", next)
    setTheme(next)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
