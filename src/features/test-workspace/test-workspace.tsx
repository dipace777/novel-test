import { useRef, useState } from "react"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PromptComposer } from "./components/prompt-composer"
import { CreateWorkspaceDrawer } from "./components/create-workspace-drawer"
import { CreateTestDrawer } from "./components/create-test-drawer"
import type { NewTestInput } from "./components/create-test-drawer"
import { TestCaseDetails } from "./components/test-case-details"
import { WorkspaceHeader } from "./components/workspace-header"
import { WorkspaceSettings } from "./components/workspace-settings"
import { defaultWorkspaceConfig } from "./config"
import type { WorkspaceConfig } from "./config"
import { testGroups, workspaces as initialWorkspaces } from "./data"
import type { TestCase, TestGroup, WorkspaceId } from "./data"

export function TestWorkspace() {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("personal")
  const [createTestOpen, setCreateTestOpen] = useState(false)
  const [groupsByWorkspace, setGroupsByWorkspace] = useState<
    Record<WorkspaceId, TestGroup[]>
  >(() =>
    Object.fromEntries(
      initialWorkspaces.map((workspace) => [workspace.value, testGroups])
    )
  )
  const workspaceTestGroups = groupsByWorkspace[workspaceId] ?? []
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [configs, setConfigs] = useState<
    Partial<Record<WorkspaceId, WorkspaceConfig>>
  >({})
  const config = configs[workspaceId] ?? defaultWorkspaceConfig
  const [selectedTests, setSelectedTests] = useState<
    Partial<Record<WorkspaceId, string | null>>
  >({})
  const selectedTestId = selectedTests[workspaceId] ?? null
  const selectedGroup = workspaceTestGroups.find((group) =>
    group.tests.some((test) => test.id === selectedTestId)
  )
  const selectedTest = selectedGroup?.tests.find(
    (test) => test.id === selectedTestId
  )
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draftKey = `${workspaceId}:${selectedTestId ?? "new"}`
  const prompt = drafts[draftKey] ?? ""
  const workspaceName =
    workspaces.find((workspace) => workspace.value === workspaceId)?.label ??
    "Workspace"
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function setPrompt(value: string) {
    setDrafts((current) => ({ ...current, [draftKey]: value }))
  }

  function createTest(input: NewTestInput) {
    const test: TestCase = {
      id: crypto.randomUUID(),
      name: input.name,
      description: "",
      steps: [],
      expectedResult: "",
    }
    const categoryId = input.category.id
    setGroupsByWorkspace((current) => {
      const groups = current[workspaceId] ?? []
      const updated = groups.map((group) =>
        group.id === categoryId
          ? { ...group, tests: [...group.tests, test] }
          : group
      )
      return { ...current, [workspaceId]: updated }
    })
    setSelectedTests((current) => ({ ...current, [workspaceId]: test.id }))
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as CSSProperties}>
      <AppSidebar
        onNewTest={() => setCreateTestOpen(true)}
        selectedTestId={selectedTestId}
        testGroups={workspaceTestGroups}
        onSelectTest={(testId) =>
          setSelectedTests((current) => ({ ...current, [workspaceId]: testId }))
        }
      />
      <SidebarInset className="h-svh min-w-0 bg-background">
        <WorkspaceHeader
          workspaceId={workspaceId}
          onWorkspaceChange={setWorkspaceId}
          testName={selectedTest?.name ?? "Tests"}
          onOpenSettings={() => setSettingsOpen(true)}
          mode={config.mode}
          workspaces={workspaces}
          onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
        />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <section aria-label="Test conversation" className="flex-1 sm:px-10">
            {selectedTest && selectedGroup && selectedTest.steps.length > 0 && (
              <TestCaseDetails
                test={selectedTest}
                featureName={selectedGroup.name}
              />
            )}
          </section>
          {selectedTest && (
            <div className="shrink-0 px-5 pb-5 sm:px-10 sm:pb-7">
              <PromptComposer
                prompt={prompt}
                onPromptChange={setPrompt}
                inputRef={inputRef}
                mode={config.mode}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>
          )}
        </div>
      </SidebarInset>
      <CreateTestDrawer
        open={createTestOpen}
        onOpenChange={setCreateTestOpen}
        groups={workspaceTestGroups}
        initialCategoryId={selectedGroup?.id}
        chatInputRef={inputRef}
        onCreate={createTest}
        onCreateCategory={(name) => {
          const id = crypto.randomUUID()
          setGroupsByWorkspace((current) => ({
            ...current,
            [workspaceId]: [
              ...(current[workspaceId] ?? []),
              { id, name, tests: [] },
            ],
          }))
          return id
        }}
      />
      <WorkspaceSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workspaceName={workspaceName}
        config={config}
        onSave={(value) =>
          setConfigs((current) => ({ ...current, [workspaceId]: value }))
        }
      />
      <CreateWorkspaceDrawer
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        workspaces={workspaces}
        onCreate={(name, workspaceConfig) => {
          const workspace = { value: crypto.randomUUID(), label: name }
          setWorkspaces((current) => [...current, workspace])
          setConfigs((current) => ({
            ...current,
            [workspace.value]: workspaceConfig,
          }))
          setWorkspaceId(workspace.value)
        }}
      />
    </SidebarProvider>
  )
}
