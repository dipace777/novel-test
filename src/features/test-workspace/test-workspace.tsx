import { useEffect, useRef, useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ResizableSidebarProvider } from "@/components/resizable-sidebar"
import { PromptComposer } from "./components/prompt-composer"
import { CreateWorkspaceDrawer } from "./components/create-workspace-drawer"
import { CreateTestDrawer } from "./components/create-test-drawer"
import { DeleteTestDialog } from "./components/delete-test-dialog"
import { DeleteConfirmationDialog } from "./components/delete-confirmation-dialog"
import { EditCategoryDialog } from "./components/edit-category-dialog"
import type { NewTestInput } from "./components/create-test-drawer"
import { TestCaseDetails } from "./components/test-case-details"
import { WorkspaceHeader } from "./components/workspace-header"
import { WorkspaceSettings } from "./components/workspace-settings"
import { defaultWorkspaceConfig } from "./config"
import type { WorkspaceConfig } from "./config"
import * as api from "./server-functions"
import { Button } from "@/components/ui/button"
import type {
  TestCase,
  TestGroup,
  WorkspaceId,
  WorkspaceSnapshot,
} from "./data"

type AgentTurn = {
  id: string
  role: "user" | "assistant" | "error"
  content: string
}

export function TestWorkspace({
  initialData,
}: {
  initialData: WorkspaceSnapshot
}) {
  const [workspaces, setWorkspaces] = useState(initialData.workspaces)
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>(
    initialData.workspaces[0]?.value ?? ""
  )
  const [createTestOpen, setCreateTestOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    workspaceId: string
    test: TestCase
  } | null>(null)
  const [categoryTarget, setCategoryTarget] = useState<{
    kind: "edit" | "delete"
    workspaceId: string
    group: TestGroup
  } | null>(null)
  const [groupsByWorkspace, setGroupsByWorkspace] = useState<
    Partial<Record<WorkspaceId, TestGroup[]>>
  >(initialData.groupsByWorkspace)
  const workspaceTestGroups = groupsByWorkspace[workspaceId] ?? []
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [configs, setConfigs] = useState<
    Partial<Record<WorkspaceId, WorkspaceConfig>>
  >(initialData.configs)
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
  const [drafts, setDrafts] = useState<Partial<Record<string, string>>>({})
  const draftKey = `${workspaceId}:${selectedTestId ?? "new"}`
  const prompt = drafts[draftKey] ?? selectedTest?.prompt ?? ""
  const workspaceName =
    workspaces.find((workspace) => workspace.value === workspaceId)?.label ??
    "Workspace"
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const [turnsByTest, setTurnsByTest] = useState<
    Partial<Record<string, AgentTurn[]>>
  >({})
  const turns = turnsByTest[draftKey] ?? []
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [agentListening, setAgentListening] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void api
      .getAgentStatus()
      .then((result) => {
        if (!cancelled) setAgentListening(result.data?.listening ?? false)
      })
      .catch(() => {
        if (!cancelled) setAgentListening(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" })
  }, [turns, pendingKey, draftKey])

  const [draftErrors, setDraftErrors] = useState<Record<string, string | null>>(
    {}
  )
  const pendingDraft = useRef<{
    workspaceId: string
    testId: string
    prompt: string
    key: string
  } | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueue = useRef(Promise.resolve())

  function flushDraft() {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    const pending = pendingDraft.current
    pendingDraft.current = null
    if (!pending) return
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const result = await api.savePrompt({ data: pending })
        if (result.error) throw new Error(result.error)
        setDraftErrors((current) => ({ ...current, [pending.key]: null }))
      } catch (error) {
        setDraftErrors((current) => ({
          ...current,
          [pending.key]:
            error instanceof Error
              ? error.message
              : "Could not save draft. Try again.",
        }))
      }
    })
  }

  useEffect(() => () => flushDraft(), [])

  async function sendCommand() {
    const command = prompt.trim()
    if (!selectedTestId || !command || pendingKey) return
    const key = draftKey
    const targetWorkspaceId = workspaceId
    const testId = selectedTestId
    flushDraft()
    setPendingKey(key)
    setTurnsByTest((current) => ({
      ...current,
      [key]: [
        ...(current[key] ?? []),
        { id: crypto.randomUUID(), role: "user", content: command },
      ],
    }))
    try {
      const result = await api.sendAgentCommand({
        data: { workspaceId: targetWorkspaceId, testId, command },
      })
      setTurnsByTest((current) => ({
        ...current,
        [key]: [
          ...(current[key] ?? []),
          {
            id: crypto.randomUUID(),
            role: result.error ? "error" : "assistant",
            content:
              result.error ??
              result.data?.reply ??
              "The agent finished without a reply.",
          },
        ],
      }))
    } catch (error) {
      setTurnsByTest((current) => ({
        ...current,
        [key]: [
          ...(current[key] ?? []),
          {
            id: crypto.randomUUID(),
            role: "error",
            content:
              error instanceof Error
                ? error.message
                : "Could not reach the agent.",
          },
        ],
      }))
    } finally {
      setPendingKey((current) => (current === key ? null : current))
    }
  }

  function setPrompt(value: string) {
    if (!selectedTestId) return
    setDrafts((current) => ({ ...current, [draftKey]: value }))
    setDraftErrors((current) => ({ ...current, [draftKey]: null }))
    pendingDraft.current = {
      workspaceId,
      testId: selectedTestId,
      prompt: value,
      key: draftKey,
    }
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(flushDraft, 500)
  }

  async function createTest(input: NewTestInput) {
    const result = await api.createTest({
      data: { workspaceId, categoryId: input.category.id, name: input.name },
    })
    if (!result.data) throw new Error(result.error)
    const test = result.data
    setGroupsByWorkspace((current) => ({
      ...current,
      [workspaceId]: (current[workspaceId] ?? []).map((group) =>
        group.id === input.category.id
          ? { ...group, tests: [...group.tests, test] }
          : group
      ),
    }))
    flushDraft()
    setSelectedTests((current) => ({ ...current, [workspaceId]: test.id }))
  }

  async function deleteTest() {
    if (!deleteTarget) return
    const { workspaceId: targetWorkspaceId, test } = deleteTarget
    // Finish pending saves before deletion so an autosave cannot outlive its test.
    flushDraft()
    await saveQueue.current
    const result = await api.deleteTest({
      data: { workspaceId: targetWorkspaceId, testId: test.id },
    })
    if (!result.data) throw new Error(result.error)
    setGroupsByWorkspace((current) => ({
      ...current,
      [targetWorkspaceId]: (current[targetWorkspaceId] ?? []).map((group) => ({
        ...group,
        tests: group.tests.filter((item) => item.id !== test.id),
      })),
    }))
    setSelectedTests((current) =>
      current[targetWorkspaceId] === test.id
        ? { ...current, [targetWorkspaceId]: null }
        : current
    )
    const key = `${targetWorkspaceId}:${test.id}`
    setDrafts((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setDraftErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setTurnsByTest((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setDeleteTarget(null)
  }

  async function deleteWorkspace() {
    const targetWorkspaceId = workspaceId
    flushDraft()
    await saveQueue.current
    const result = await api.deleteWorkspace({
      data: { workspaceId: targetWorkspaceId },
    })
    if (!result.data) throw new Error(result.error)
    const remainingWorkspaces = workspaces.filter(
      (workspace) => workspace.value !== targetWorkspaceId
    )
    setWorkspaces(remainingWorkspaces)
    setWorkspaceId(remainingWorkspaces[0]?.value ?? "")
    setGroupsByWorkspace((current) => {
      const next = { ...current }
      delete next[targetWorkspaceId]
      return next
    })
    setConfigs((current) => {
      const next = { ...current }
      delete next[targetWorkspaceId]
      return next
    })
    setSelectedTests((current) => {
      const next = { ...current }
      delete next[targetWorkspaceId]
      return next
    })
    const prefix = `${targetWorkspaceId}:`
    setDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(prefix))
      )
    )
    setDraftErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(prefix))
      )
    )
    setTurnsByTest((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(prefix))
      )
    )
  }

  function openCategoryAction(kind: "edit" | "delete", categoryId: string) {
    const group = workspaceTestGroups.find((item) => item.id === categoryId)
    if (group) setCategoryTarget({ kind, workspaceId, group })
  }

  async function renameCategory(name: string) {
    if (!categoryTarget) return
    const { workspaceId: targetWorkspaceId, group } = categoryTarget
    const result = await api.renameCategory({
      data: { workspaceId: targetWorkspaceId, categoryId: group.id, name },
    })
    if (!result.data) throw new Error(result.error)
    const saved = result.data
    setGroupsByWorkspace((current) => ({
      ...current,
      [targetWorkspaceId]: (current[targetWorkspaceId] ?? []).map((item) =>
        item.id === saved.id ? { ...item, name: saved.name } : item
      ),
    }))
    setCategoryTarget(null)
  }

  async function deleteCategory() {
    if (!categoryTarget) return
    const { workspaceId: targetWorkspaceId, group } = categoryTarget
    flushDraft()
    await saveQueue.current
    const result = await api.deleteCategory({
      data: { workspaceId: targetWorkspaceId, categoryId: group.id },
    })
    if (!result.data) throw new Error(result.error)
    const deletedIds = new Set(group.tests.map((test) => test.id))
    setGroupsByWorkspace((current) => ({
      ...current,
      [targetWorkspaceId]: (current[targetWorkspaceId] ?? []).filter(
        (item) => item.id !== group.id
      ),
    }))
    setSelectedTests((current) => {
      const id = current[targetWorkspaceId]
      return id && deletedIds.has(id)
        ? { ...current, [targetWorkspaceId]: null }
        : current
    })
    const deletedKeys = new Set(
      group.tests.map((test) => `${targetWorkspaceId}:${test.id}`)
    )
    setDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !deletedKeys.has(key))
      )
    )
    setDraftErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !deletedKeys.has(key))
      )
    )
    setTurnsByTest((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !deletedKeys.has(key))
      )
    )
    setCategoryTarget(null)
  }

  return (
    <ResizableSidebarProvider>
      <AppSidebar
        onNewTest={() =>
          workspaceId ? setCreateTestOpen(true) : setCreateWorkspaceOpen(true)
        }
        selectedTestId={selectedTestId}
        testGroups={workspaceTestGroups}
        onDeleteTest={(test) => setDeleteTarget({ workspaceId, test })}
        onEditCategory={(id) => openCategoryAction("edit", id)}
        onDeleteCategory={(id) => openCategoryAction("delete", id)}
        onSelectTest={(testId) => {
          flushDraft()
          setSelectedTests((current) => ({ ...current, [workspaceId]: testId }))
        }}
      />
      <SidebarInset className="h-svh min-w-0 bg-background">
        <WorkspaceHeader
          workspaceId={workspaceId}
          onWorkspaceChange={(id) => {
            flushDraft()
            setWorkspaceId(id)
          }}
          testName={selectedTest?.name ?? "Tests"}
          onOpenSettings={() => setSettingsOpen(true)}
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
            {selectedTest && turns.length > 0 && (
              <div
                role="log"
                aria-live="polite"
                aria-label="Agent replies"
                className="mx-auto w-full max-w-[760px] space-y-3 px-5 py-6 sm:px-0"
              >
                {turns.map((turn) => (
                  <article
                    key={turn.id}
                    className={
                      turn.role === "user"
                        ? "rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6"
                        : turn.role === "error"
                          ? "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
                          : "rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground"
                    }
                  >
                    <p className="mb-1 text-xs font-medium text-foreground">
                      {turn.role === "user"
                        ? "Command"
                        : turn.role === "error"
                          ? "Agent error"
                          : "Agent"}
                    </p>
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </article>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </section>
          {selectedTest && (
            <div className="shrink-0 px-5 pb-5 sm:px-10 sm:pb-7">
              {draftErrors[draftKey] && (
                <div className="mx-auto mb-2 flex max-w-[760px] items-center justify-between gap-2 text-xs text-destructive">
                  <p role="alert">Draft not saved. {draftErrors[draftKey]}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrompt(prompt)
                      flushDraft()
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
              <p className="mx-auto mb-2 max-w-[760px] text-xs text-muted-foreground">
                {pendingKey === draftKey
                  ? "Agent is working on this command…"
                  : pendingKey
                    ? "Agent is working on another command…"
                    : agentListening
                      ? "Agent is listening"
                      : agentListening === false
                        ? "Agent is unavailable"
                        : "Starting agent…"}
              </p>
              <PromptComposer
                prompt={prompt}
                onBlur={flushDraft}
                onPromptChange={setPrompt}
                inputRef={inputRef}
                onOpenSettings={() => setSettingsOpen(true)}
                onSubmit={sendCommand}
                pending={pendingKey !== null}
              />
            </div>
          )}
        </div>
      </SidebarInset>
      {deleteTarget && (
        <DeleteTestDialog
          key={deleteTarget.test.id}
          testName={deleteTarget.test.name}
          onCancel={() => setDeleteTarget(null)}
          onDelete={deleteTest}
        />
      )}
      {categoryTarget?.kind === "edit" && (
        <EditCategoryDialog
          key={categoryTarget.group.id}
          category={categoryTarget.group}
          groups={groupsByWorkspace[categoryTarget.workspaceId] ?? []}
          onCancel={() => setCategoryTarget(null)}
          onSave={renameCategory}
        />
      )}
      {categoryTarget?.kind === "delete" && (
        <DeleteConfirmationDialog
          key={categoryTarget.group.id}
          title="Delete category?"
          description={`Delete “${categoryTarget.group.name}”? All test cases and saved prompts in this category will also be deleted. This cannot be undone.`}
          actionLabel="Delete category"
          onCancel={() => setCategoryTarget(null)}
          onDelete={deleteCategory}
        />
      )}
      <CreateTestDrawer
        open={createTestOpen}
        onOpenChange={setCreateTestOpen}
        groups={workspaceTestGroups}
        initialCategoryId={selectedGroup?.id}
        chatInputRef={inputRef}
        onCreate={createTest}
        onCreateCategory={async (name) => {
          const result = await api.createCategory({
            data: { workspaceId, name },
          })
          if (!result.data) throw new Error(result.error)
          const group = result.data
          setGroupsByWorkspace((current) => ({
            ...current,
            [workspaceId]: [...(current[workspaceId] ?? []), group],
          }))
          return group.id
        }}
      />
      <WorkspaceSettings
        key={workspaceId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workspaceName={workspaceName}
        config={config}
        onDelete={deleteWorkspace}
        onSave={async (value) => {
          const result = await api.saveWorkspaceConfig({
            data: { workspaceId, config: value },
          })
          if (!result.data) throw new Error(result.error)
          const savedConfig = result.data
          setConfigs((current) => ({ ...current, [workspaceId]: savedConfig }))
        }}
      />
      <CreateWorkspaceDrawer
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        workspaces={workspaces}
        onCreate={async (name, workspaceConfig) => {
          const result = await api.createWorkspace({
            data: { name: name || undefined, config: workspaceConfig },
          })
          if (!result.data) throw new Error(result.error)
          const { workspace, config: savedConfig } = result.data
          setWorkspaces((current) => [...current, workspace])
          setConfigs((current) => ({
            ...current,
            [workspace.value]: savedConfig,
          }))
          setGroupsByWorkspace((current) => ({
            ...current,
            [workspace.value]: [],
          }))
          flushDraft()
          setWorkspaceId(workspace.value)
        }}
      />
    </ResizableSidebarProvider>
  )
}
