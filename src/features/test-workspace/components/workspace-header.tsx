import { ChevronRight, FlaskConical } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export function WorkspaceHeader() {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3 text-xs">
        <SidebarTrigger className="text-muted-foreground" />
        <span className="hidden text-muted-foreground sm:inline">
          Workspace
        </span>
        <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
        <span className="flex items-center gap-2 font-medium">
          <FlaskConical className="size-3.5 text-primary" /> New test
        </span>
      </div>
      <ThemeToggle />
    </header>
  )
}
