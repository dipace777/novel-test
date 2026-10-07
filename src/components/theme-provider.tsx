import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { THEME_STORAGE_KEY } from "@/lib/theme"
import type { Theme } from "@/lib/theme"

type ThemeContextValue = {
  theme: Theme
  ready: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    )
    setReady(true)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light"
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    document.documentElement.style.colorScheme = nextTheme
    setTheme(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Switching themes still works when browser storage is unavailable.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, ready, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
