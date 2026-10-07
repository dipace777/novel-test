import { Plus, Settings } from "lucide-react"
import { useEffect, useState } from "react"
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
  workspaces: Workspace[]
  onCreateWorkspace: () => void
}

export function WorkspaceSwitcher({
  workspaceId,
  onWorkspaceChange,
  onOpenSettings,
  workspaces,
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <div className="relative shrink-0">
      <Select
        disabled={!ready}
        items={[
          ...workspaces,
          { value: CREATE_WORKSPACE, label: "Create workspace" },
        ]}
        value={workspaceId || null}
        onValueChange={(value) => {
          if (value === CREATE_WORKSPACE) onCreateWorkspace()
          else if (value) onWorkspaceChange(value)
        }}
      >
        <SelectTrigger
          aria-label="Switch workspace"
          className="w-[190px] text-xs sm:w-[260px]"
        >
          <SelectValue
            className="min-w-0 truncate"
            placeholder="Create workspace"
          />
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
        disabled={!workspaceId}
        title="Workspace settings"
      >
        <Settings />
      </Button>
    </div>
  )
}
