import "@tanstack/react-start/server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { getDb } from "./db/connection"
import { categories, testCases, workspaces } from "./db/schema"
import { TestFiles, TestFilesError, type WorkspaceFolder } from "./test-files"
import type { WorkspaceSnapshot } from "../features/test-workspace/data"
import type { WorkspaceConfig } from "../features/test-workspace/config"
import {
  normalizeWorkspaceConfig,
  validateWorkspaceConfig,
} from "../features/test-workspace/config"

export class WorkspaceInputError extends Error {}

export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const db = getDb()
  return db.transaction(
    async (tx) => {
      const rows = await tx
        .select()
        .from(workspaces)
        .orderBy(
          desc(eq(workspaces.name, "Default Workspace")),
          asc(workspaces.createdAt),
          asc(workspaces.id)
        )
      const groups = await tx
        .select()
        .from(categories)
        .orderBy(asc(categories.createdAt), asc(categories.id))
      const tests = await tx
        .select()
        .from(testCases)
        .orderBy(asc(testCases.createdAt), asc(testCases.id))
      return {
        workspaces: rows.map((row) => ({ value: row.id, label: row.name })),
        configs: Object.fromEntries(
          rows.map((row) => [row.id, normalizeWorkspaceConfig(row.config)])
        ),
        groupsByWorkspace: Object.fromEntries(
          rows.map((row) => [
            row.id,
            groups
              .filter((group) => group.workspaceId === row.id)
              .map((group) => ({
                id: group.id,
                name: group.name,
                tests: tests
                  .filter((test) => test.categoryId === group.id)
                  .map(
                    ({
                      id,
                      name,
                      description,
                      steps,
                      expectedResult,
                      prompt,
                    }) => ({
                      id,
                      name,
                      description,
                      steps,
                      expectedResult,
                      prompt,
                    })
                  ),
              })),
          ])
        ),
      }
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  )
}

function checkConfig(config: WorkspaceConfig) {
  const error = validateWorkspaceConfig(config)
  if (error) throw new WorkspaceInputError(error)
}

export async function createWorkspace(
  name: string | undefined,
  config: WorkspaceConfig
) {
  config = normalizeWorkspaceConfig(config)
  checkConfig(config)
  if (!name) {
    const baseName = new URL(config.globalUrl).hostname.slice(0, 56)
    // Let the unique index resolve concurrent requests for the same hostname.
    for (let suffix = 1; suffix <= 100; suffix++) {
      const generatedName = suffix === 1 ? baseName : `${baseName} (${suffix})`
      const row = await insertWorkspace(generatedName, config, true)
      if (row) {
        return {
          workspace: { value: row.id, label: row.name },
          config: row.config,
        }
      }
    }
    name = `${baseName.slice(0, 52)} (${crypto.randomUUID().slice(0, 8)})`
  }
  const row = await insertWorkspace(name, config)
  if (!row) throw new WorkspaceInputError("This workspace name already exists.")
  return { workspace: { value: row.id, label: row.name }, config: row.config }
}

export async function saveWorkspaceConfig(
  workspaceId: string,
  config: WorkspaceConfig
) {
  config = normalizeWorkspaceConfig(config)
  checkConfig(config)
  const rows = await getDb()
    .update(workspaces)
    .set({ config })
    .where(eq(workspaces.id, workspaceId))
    .returning()
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This workspace no longer exists. Reload and try again."
    )
  return rows[0].config
}

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0]

async function fileTransaction<T>(
  operation: (
    tx: Transaction,
    track: (workspace: WorkspaceFolder) => TestFiles
  ) => Promise<T>
): Promise<T> {
  let files: TestFiles | undefined
  let result: T
  try {
    result = await getDb().transaction(async (tx) => {
      // Workspace slugs share one parent, so naming and migration must also
      // serialize across workspaces, including across server processes.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('novel-test-files'))`
      )
      return operation(tx, (workspace) => {
        files = new TestFiles(workspace)
        return files
      })
    })
  } catch (error) {
    await files?.rollback()
    throw error
  }
  await files?.commit()
  return result
}

async function insertWorkspace(
  name: string,
  config: WorkspaceConfig,
  ignoreConflict = false
) {
  return fileTransaction(async (tx, track) => {
    const query = tx
      .insert(workspaces)
      .values({ id: crypto.randomUUID(), name, config })
    const rows = await (
      ignoreConflict ? query.onConflictDoNothing() : query
    ).returning()
    const row = rows.length ? rows[0] : undefined
    if (row) await track({ id: row.id, name: row.name }).createWorkspace()
    return row
  })
}

async function withWorkspaceFiles<T>(
  workspaceId: string,
  operation: (tx: Transaction, files: TestFiles) => Promise<T>
): Promise<T> {
  return fileTransaction(async (tx, track) => {
    // Serialize filesystem changes, prompt autosaves and cascades in this workspace.
    const rows = await tx
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .for("update")
    if (!rows.length)
      throw new WorkspaceInputError(
        "This workspace no longer exists. Reload and try again."
      )
    return operation(tx, track(rows[0]))
  })
}

async function ownedCategory(
  tx: Transaction,
  workspaceId: string,
  categoryId: string
) {
  const rows = await tx
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId)
      )
    )
  if (!rows.length)
    throw new WorkspaceInputError("Choose a category in this workspace.")
  return rows[0]
}

async function ownedTest(tx: Transaction, workspaceId: string, testId: string) {
  const rows = await tx
    .select({ test: testCases, category: categories })
    .from(testCases)
    .innerJoin(categories, eq(categories.id, testCases.categoryId))
    .where(
      and(eq(testCases.id, testId), eq(categories.workspaceId, workspaceId))
    )
  if (!rows.length)
    throw new WorkspaceInputError(
      "This test no longer exists in the workspace."
    )
  return rows[0]
}

export async function deleteWorkspace(workspaceId: string) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    await files.deleteWorkspace()
    const [row] = await tx
      .delete(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .returning({ id: workspaces.id })
    return row
  })
}

export async function createCategory(workspaceId: string, name: string) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    const [row] = await tx
      .insert(categories)
      .values({ id: crypto.randomUUID(), workspaceId, name })
      .returning()
    await files.createCategory(row)
    return { id: row.id, name: row.name, tests: [] }
  })
}

export async function renameCategory(
  workspaceId: string,
  categoryId: string,
  name: string
) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    const category = await ownedCategory(tx, workspaceId, categoryId)
    const [row] = await tx
      .update(categories)
      .set({ name })
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id, name: categories.name })
    await files.renameCategory(category, name)
    return row
  })
}

export async function deleteCategory(workspaceId: string, categoryId: string) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    const category = await ownedCategory(tx, workspaceId, categoryId)
    await files.deleteCategory(category)
    const [row] = await tx
      .delete(categories)
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id })
    return row
  })
}

export async function createTest(
  workspaceId: string,
  categoryId: string,
  name: string
) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    const category = await ownedCategory(tx, workspaceId, categoryId)
    const [row] = await tx
      .insert(testCases)
      .values({ id: crypto.randomUUID(), categoryId, name })
      .returning()
    const test = {
      id: row.id,
      name: row.name,
      description: row.description,
      steps: row.steps,
      expectedResult: row.expectedResult,
      prompt: row.prompt,
    }
    await files.createTest(category, test)
    return test
  })
}

export async function savePrompt(
  workspaceId: string,
  testId: string,
  prompt: string
) {
  return withWorkspaceFiles(workspaceId, async (tx) => {
    const { test } = await ownedTest(tx, workspaceId, testId)
    await tx.update(testCases).set({ prompt }).where(eq(testCases.id, testId))
    return { id: test.id }
  })
}

export async function deleteTest(workspaceId: string, testId: string) {
  return withWorkspaceFiles(workspaceId, async (tx, files) => {
    const { test, category } = await ownedTest(tx, workspaceId, testId)
    await files.deleteTest(category, test)
    await tx.delete(testCases).where(eq(testCases.id, testId))
    return { id: test.id }
  })
}

export async function migrateTestFiles() {
  const rows = await getDb().select({ id: workspaces.id }).from(workspaces)
  for (const row of rows) {
    await withWorkspaceFiles(row.id, async (tx, files) => {
      const groups = await tx
        .select()
        .from(categories)
        .where(eq(categories.workspaceId, row.id))
      const tests = await tx
        .select({ test: testCases })
        .from(testCases)
        .innerJoin(categories, eq(categories.id, testCases.categoryId))
        .where(eq(categories.workspaceId, row.id))
      await files.migrate(
        groups.map((group) => ({
          ...group,
          tests: tests
            .map(({ test }) => test)
            .filter((test) => test.categoryId === group.id),
        }))
      )
    })
  }
}

export function publicError(error: unknown): string {
  if (error instanceof WorkspaceInputError || error instanceof TestFilesError)
    return error.message
  // Drizzle wraps driver errors in a query error. Never return SQL or credentials.
  const cause = (error as { cause?: { code?: string } } | null)?.cause ?? error
  if ((cause as { code?: string } | null)?.code === "23505")
    return "This name already exists. Choose another name."
  return "Could not reach the database. Check PostgreSQL and try again."
}
