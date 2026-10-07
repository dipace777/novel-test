import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, ready, toggleTheme } = useTheme()
  const label =
    theme === "light" ? "Switch to dark mode" : "Switch to light mode"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={!ready}
      aria-label={label}
      title={label}
      className="text-muted-foreground"
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </Button>
  )
}
