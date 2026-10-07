import { FlaskConical } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { WorkspaceSwitcher } from "./workspace-switcher"
import type { Workspace, WorkspaceId } from "../data"

type WorkspaceHeaderProps = {
  workspaceId: WorkspaceId
  onWorkspaceChange: (workspaceId: WorkspaceId) => void
  testName: string
  onOpenSettings: () => void
  workspaces: Workspace[]
  onCreateWorkspace: () => void
}

export function WorkspaceHeader({
  workspaceId,
  onWorkspaceChange,
  testName,
  onOpenSettings,
  workspaces,
  onCreateWorkspace,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3 text-xs">
        <SidebarTrigger className="text-muted-foreground" />
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <FlaskConical className="hidden size-3.5 text-primary min-[360px]:block" />
          <span className="sr-only sm:not-sr-only sm:max-w-64 sm:truncate">
            {testName}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          onWorkspaceChange={onWorkspaceChange}
          onOpenSettings={onOpenSettings}
          workspaces={workspaces}
          onCreateWorkspace={onCreateWorkspace}
        />
        <ThemeToggle />
      </div>
    </header>
  )
}
