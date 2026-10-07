import assert from "node:assert/strict"
import { test } from "node:test"
import { inArray } from "drizzle-orm"
import { getDb, closeDb } from "./db/connection"
import { workspaces } from "./db/schema"
import { defaultWorkspaceConfig } from "../features/test-workspace/config"
import {
  createWorkspace,
  createCategory,
  createTest,
  deleteTest,
  saveWorkspaceConfig,
  savePrompt,
  loadWorkspaceSnapshot,
  publicError,
} from "./workspace-repository.server"

test("database persistence, scoped names and workspace ownership", async () => {
  const workspaceIds: string[] = []
  const suffix = crypto.randomUUID()
  const config = { ...defaultWorkspaceConfig, globalUrl: "https://example.com" }
  try {
    const first = await createWorkspace(`Database check ${suffix}`, config)
    workspaceIds.push(first.workspace.value)
    const second = await createWorkspace(`Other workspace ${suffix}`, config)
    workspaceIds.push(second.workspace.value)
    const group = await createCategory(first.workspace.value, "Auth Feature")
    await createCategory(second.workspace.value, "Auth Feature")
    await assert.rejects(
      createCategory(first.workspace.value, "auth feature"),
      (error) => publicError(error).includes("already exists")
    )
    const caseRecord = await createTest(
      first.workspace.value,
      group.id,
      "Valid sign-in"
    )
    await assert.rejects(
      createTest(second.workspace.value, group.id, "Wrong workspace"),
      /Choose a category/
    )
    await assert.rejects(
      savePrompt(second.workspace.value, caseRecord.id, "Wrong workspace"),
      /no longer exists/
    )
    await assert.rejects(
      createTest(first.workspace.value, group.id, "valid sign-in"),
      (error) => publicError(error).includes("already exists")
    )
    await savePrompt(first.workspace.value, caseRecord.id, "Check the session.")
    await savePrompt(first.workspace.value, caseRecord.id, "")
    await savePrompt(first.workspace.value, caseRecord.id, "Updated prompt")
    await saveWorkspaceConfig(first.workspace.value, {
      ...config,
      api: {
        ...config.api,
        timeoutMs: 15000,
        headers: [
          { id: "custom-header", name: "X-Environment", value: "test" },
        ],
      },
    })
    await assert.rejects(
      saveWorkspaceConfig(first.workspace.value, {
        ...config,
        globalUrl: "file:///tmp/example",
      }),
      /HTTP or HTTPS/
    )
    await closeDb()
    const snapshot = await loadWorkspaceSnapshot()
    assert.equal(
      snapshot.groupsByWorkspace[first.workspace.value][0].tests[0].prompt,
      "Updated prompt"
    )
    assert.equal(snapshot.configs[first.workspace.value].api?.timeoutMs, 15000)
    assert.equal(
      snapshot.groupsByWorkspace[second.workspace.value][0].tests.length,
      0
    )
    await assert.rejects(
      deleteTest(second.workspace.value, caseRecord.id),
      /no longer exists/
    )
    await deleteTest(first.workspace.value, caseRecord.id)
    await assert.rejects(
      savePrompt(first.workspace.value, caseRecord.id, "Late autosave"),
      /no longer exists/
    )
    await closeDb()
    const afterDelete = await loadWorkspaceSnapshot()
    assert.equal(
      afterDelete.groupsByWorkspace[first.workspace.value][0].id,
      group.id
    )
    assert.equal(
      afterDelete.groupsByWorkspace[first.workspace.value][0].tests.length,
      0
    )
  } finally {
    await getDb().delete(workspaces).where(inArray(workspaces.id, workspaceIds))
    await closeDb()
  }
})
