import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Workspace, WorkspaceId } from "../data"

const CREATE_WORKSPACE = "__create_workspace__"

type WorkspaceSwitcherProps = {
  workspaceId: WorkspaceId
  onWorkspaceChange: (workspaceId: WorkspaceId) => void
  onOpenSettings: () => void
  mode: "ui" | "api"
  workspaces: Workspace[]
  onCreateWorkspace: () => void
}

export function WorkspaceSwitcher({
  workspaceId,
  onWorkspaceChange,
  onOpenSettings,
  mode,
  workspaces,
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  return (
    <div className="relative shrink-0">
      <Select
        items={[
          ...workspaces,
          { value: CREATE_WORKSPACE, label: "Create workspace" },
        ]}
        value={workspaceId}
        onValueChange={(value) => {
          if (value === CREATE_WORKSPACE) onCreateWorkspace()
          else if (value) onWorkspaceChange(value)
        }}
      >
        <SelectTrigger
          aria-label="Switch workspace"
          className="w-[190px] text-xs sm:w-[260px]"
        >
          <SelectValue className="min-w-0 truncate" />
          <span
            className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
            title={mode === "ui" ? "Browser testing" : "API testing"}
          >
            {mode.toUpperCase()}
          </span>
          <span aria-hidden="true" className="w-6 shrink-0" />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Workspaces</SelectLabel>
            {workspaces.map((workspace) => (
              <SelectItem
                key={workspace.value}
                value={workspace.value}
                className="text-xs"
              >
                {workspace.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator className="mx-1" />
          <SelectGroup>
            <SelectItem
              value={CREATE_WORKSPACE}
              className="cursor-pointer text-xs"
            >
              <Plus className="size-3.5" /> Create workspace
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1/2 right-7 -translate-y-1/2 text-muted-foreground"
        onClick={onOpenSettings}
        aria-label="Workspace settings"
        title="Workspace settings"
      >
        <Settings />
      </Button>
    </div>
  )
}
