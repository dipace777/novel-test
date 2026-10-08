import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { closeDb } from "./db/connection"
import {
  categoryDirectory,
  testDirectory,
  workspaceDirectory,
} from "./test-files"
import { defaultWorkspaceConfig } from "../features/test-workspace/config"
import {
  createWorkspace,
  createCategory,
  createTest,
  deleteTest,
  deleteWorkspace,
  renameCategory,
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
    const workspace = { id: first.workspace.value, name: first.workspace.label }
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(await workspaceDirectory(workspace), "workspace.json"),
          "utf8"
        )
      ).id,
      workspace.id
    )
    const category = { ...group, workspaceId: first.workspace.value }
    const caseRecord = await createTest(
      first.workspace.value,
      group.id,
      "Valid sign-in"
    )
    let directory = await testDirectory(workspace, category, caseRecord)
    assert.deepEqual((await readdir(directory)).sort(), ["test.json"])
    // A filesystem error after the insert must roll the database row back.
    const categoryFile = path.join(
      await categoryDirectory(workspace, category),
      "category.json"
    )
    const original = await readFile(categoryFile)
    await rm(categoryFile)
    await symlink(path.join(directory, "test.json"), categoryFile)
    try {
      await assert.rejects(
        createTest(first.workspace.value, group.id, "Disk failure"),
        (error) => publicError(error).includes("symbolic links")
      )
      const afterFailure = await loadWorkspaceSnapshot()
      assert.equal(
        afterFailure.groupsByWorkspace[first.workspace.value][0].tests.length,
        1
      )
      assert.equal((await readdir(path.dirname(categoryFile))).length, 2)
    } finally {
      await rm(categoryFile)
      await writeFile(categoryFile, original)
    }
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
    await assert.rejects(readFile(path.join(directory, "prompt.md")), {
      code: "ENOENT",
    })
    await savePrompt(first.workspace.value, caseRecord.id, "Updated prompt")
    assert.equal(
      "prompt" in
        JSON.parse(await readFile(path.join(directory, "test.json"), "utf8")),
      false
    )
    // Concurrent rename and autosave share the workspace lock and keep one folder.
    const oldCategoryDirectory = await categoryDirectory(workspace, category)
    await Promise.all([
      renameCategory(first.workspace.value, group.id, "Renamed auth"),
      savePrompt(first.workspace.value, caseRecord.id, "Updated prompt"),
    ])
    directory = await testDirectory(
      workspace,
      { ...category, name: "Renamed auth" },
      caseRecord
    )
    assert.equal(
      "prompt" in
        JSON.parse(await readFile(path.join(directory, "test.json"), "utf8")),
      false
    )
    await assert.rejects(readdir(oldCategoryDirectory), {
      code: "ENOENT",
    })
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
    await assert.rejects(readdir(directory), { code: "ENOENT" })
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
    try {
      for (const workspaceId of workspaceIds) await deleteWorkspace(workspaceId)
    } finally {
      await closeDb()
    }
  }
})

test("concurrent slug collisions use distinct readable folders", async () => {
  const workspaceIds: string[] = []
  const suffix = crypto.randomUUID()
  const config = { ...defaultWorkspaceConfig, globalUrl: "https://example.com" }
  try {
    const records = await Promise.all([
      createWorkspace(`${suffix} Demo/workspace`, config),
      createWorkspace(`${suffix} Demo workspace`, config),
    ])
    workspaceIds.push(...records.map((record) => record.workspace.value))
    const folders = await Promise.all(
      records.map((record) =>
        workspaceDirectory({
          id: record.workspace.value,
          name: record.workspace.label,
        })
      )
    )
    assert.notEqual(folders[0], folders[1])
    assert.equal(
      folders.filter((folder) => /--[a-f0-9]{6}$/.test(folder)).length,
      1
    )
    const workspace = { id: workspaceIds[0], name: records[0].workspace.label }
    const groups = await Promise.all([
      createCategory(workspace.id, "Sign/in"),
      createCategory(workspace.id, "Sign in"),
    ])
    const groupFolders = await Promise.all(
      groups.map((group) =>
        categoryDirectory(workspace, { ...group, workspaceId: workspace.id })
      )
    )
    assert.notEqual(groupFolders[0], groupFolders[1])
    const tests = await Promise.all([
      createTest(workspace.id, groups[0].id, "Valid/email"),
      createTest(workspace.id, groups[0].id, "Valid email"),
    ])
    const category = { ...groups[0], workspaceId: workspace.id }
    const testFolders = await Promise.all(
      tests.map((record) => testDirectory(workspace, category, record))
    )
    assert.notEqual(testFolders[0], testFolders[1])
    for (let index = 0; index < tests.length; index++) {
      assert.equal(
        JSON.parse(
          await readFile(path.join(testFolders[index], "test.json"), "utf8")
        ).id,
        tests[index].id
      )
    }
  } finally {
    try {
      for (const workspaceId of workspaceIds) await deleteWorkspace(workspaceId)
    } finally {
      await closeDb()
    }
  }
})
