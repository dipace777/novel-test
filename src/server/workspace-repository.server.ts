import "@tanstack/react-start/server-only"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { getDb } from "./db/connection"
import { categories, testCases, workspaces } from "./db/schema"
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
      const rows = await getDb()
        .insert(workspaces)
        .values({ id: crypto.randomUUID(), name: generatedName, config })
        .onConflictDoNothing()
        .returning()
      if (rows.length > 0) {
        const row = rows[0]
        return {
          workspace: { value: row.id, label: row.name },
          config: row.config,
        }
      }
    }
    name = `${baseName.slice(0, 52)} (${crypto.randomUUID().slice(0, 8)})`
  }
  const rows = await getDb()
    .insert(workspaces)
    .values({ id: crypto.randomUUID(), name, config })
    .returning()
  const row = rows[0]
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

export async function deleteWorkspace(workspaceId: string) {
  // Cascading foreign keys remove categories, tests, and prompts atomically.
  const rows = await getDb()
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id })
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This workspace no longer exists. Reload and try again."
    )
  return rows[0]
}

export async function createCategory(workspaceId: string, name: string) {
  const db = getDb()
  const workspaceRows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
  if (workspaceRows.length === 0)
    throw new WorkspaceInputError("Choose an existing workspace.")
  const rows = await db
    .insert(categories)
    .values({ id: crypto.randomUUID(), workspaceId, name })
    .returning()
  const row = rows[0]
  return { id: row.id, name: row.name, tests: [] }
}

export async function renameCategory(
  workspaceId: string,
  categoryId: string,
  name: string
) {
  const rows = await getDb()
    .update(categories)
    .set({ name })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId)
      )
    )
    .returning({ id: categories.id, name: categories.name })
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This category no longer exists in the workspace."
    )
  return rows[0]
}

export async function deleteCategory(workspaceId: string, categoryId: string) {
  // The foreign key deletes the category's tests and prompts atomically.
  const rows = await getDb()
    .delete(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId)
      )
    )
    .returning({ id: categories.id })
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This category no longer exists in the workspace."
    )
  return rows[0]
}

export async function createTest(
  workspaceId: string,
  categoryId: string,
  name: string
) {
  const db = getDb()
  const categoryRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.workspaceId, workspaceId)
      )
    )
  if (categoryRows.length === 0)
    throw new WorkspaceInputError("Choose a category in this workspace.")
  const rows = await db
    .insert(testCases)
    .values({ id: crypto.randomUUID(), categoryId, name })
    .returning()
  const row = rows[0]
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    steps: row.steps,
    expectedResult: row.expectedResult,
    prompt: row.prompt,
  }
}

export async function savePrompt(
  workspaceId: string,
  testId: string,
  prompt: string
) {
  const db = getDb()
  const ownedCategories = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.workspaceId, workspaceId))
  const rows = await db
    .update(testCases)
    .set({ prompt })
    .where(
      and(
        eq(testCases.id, testId),
        inArray(testCases.categoryId, ownedCategories)
      )
    )
    .returning({ id: testCases.id })
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This test no longer exists in the workspace."
    )
  return rows[0]
}

export async function deleteTest(workspaceId: string, testId: string) {
  const db = getDb()
  const ownedCategories = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.workspaceId, workspaceId))
  const rows = await db
    .delete(testCases)
    .where(
      and(
        eq(testCases.id, testId),
        inArray(testCases.categoryId, ownedCategories)
      )
    )
    .returning({ id: testCases.id })
  if (rows.length === 0)
    throw new WorkspaceInputError(
      "This test no longer exists in the workspace."
    )
  return rows[0]
}

export function publicError(error: unknown): string {
  if (error instanceof WorkspaceInputError) return error.message
  // Drizzle wraps driver errors in a query error. Never return SQL or credentials.
  const cause = (error as { cause?: { code?: string } } | null)?.cause ?? error
  if ((cause as { code?: string } | null)?.code === "23505")
    return "This name already exists. Choose another name."
  return "Could not reach the database. Check PostgreSQL and try again."
}
