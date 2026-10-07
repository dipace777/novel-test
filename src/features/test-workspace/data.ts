import type { WorkspaceConfig } from "./config"

export type WorkspaceId = string
export type Workspace = { value: WorkspaceId; label: string }

export type TestCase = {
  id: string
  name: string
  description: string
  steps: string[]
  expectedResult: string
  prompt: string
}

export type TestGroup = {
  id: string
  name: string
  tests: TestCase[]
}

export type WorkspaceSnapshot = {
  workspaces: Workspace[]
  groupsByWorkspace: Record<WorkspaceId, TestGroup[]>
  configs: Record<WorkspaceId, WorkspaceConfig>
}
