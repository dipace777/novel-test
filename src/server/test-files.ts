import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import type { TestCase } from "../features/test-workspace/data"

export type WorkspaceFolder = { id: string; name: string }

type Category = { id: string; name: string; workspaceId: string }
type Undo = () => Promise<void>

export class TestFilesError extends Error {}

export function folderName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "")
  return slug || "untitled"
}

async function stat(file: string) {
  try {
    return await lstat(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

async function checkDirectory(directory: string) {
  const info = await stat(directory)
  if (info && (!info.isDirectory() || info.isSymbolicLink()))
    throw new TestFilesError(
      "Test folders must be directories, not symbolic links."
    )
  return info
}

async function availableDirectory(
  parent: string,
  record: WorkspaceFolder,
  exclude?: string
) {
  const base = folderName(record.name)
  const suffix = createHash("sha256")
    .update(record.id)
    .digest("hex")
    .slice(0, 6)
  for (let attempt = 0; attempt < 1000; attempt++) {
    const name =
      attempt === 0
        ? base
        : `${base}--${suffix}${attempt > 1 ? `-${attempt}` : ""}`
    const directory = path.join(parent, name)
    if (directory === exclude || !(await stat(directory))) return directory
  }
  throw new TestFilesError("Could not find an available test folder name.")
}

// Metadata keeps a record attached to its folder even when a sibling is deleted
// or its display name changes. Unmanaged folders count as occupied names.
async function resolveDirectory(
  parent: string,
  record: WorkspaceFolder,
  metadata: string
) {
  if (!/^[a-zA-Z0-9-]+$/.test(record.id))
    throw new TestFilesError("Invalid test ID.")
  if (await checkDirectory(parent)) {
    const entries = await readdir(parent, { withFileTypes: true })
    const matches: string[] = []
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const directory = path.join(parent, entry.name)
      if (entry.isSymbolicLink()) {
        if (
          [
            folderName(record.name),
            `${folderName(record.name)}--${record.id}`,
          ].includes(entry.name)
        )
          throw new TestFilesError(
            "Test folders must be directories, not symbolic links."
          )
        continue
      }
      if (!entry.isDirectory()) continue
      const file = path.join(directory, metadata)
      const info = await stat(file)
      if (!info) continue
      if (!info.isFile() || info.isSymbolicLink())
        throw new TestFilesError(
          "Test files must be regular files, not symbolic links."
        )
      let data: { id?: string } | null
      try {
        data = JSON.parse(await readFile(file, "utf8"))
      } catch (error) {
        if (error instanceof SyntaxError) continue
        throw error
      }
      if (data?.id === record.id) matches.push(directory)
    }
    if (matches.length > 1)
      throw new TestFilesError(
        "Multiple folders contain the same test ID. Check the tests folder."
      )
    if (matches.length) return matches[0]
  }
  return availableDirectory(parent, record)
}

export async function workspaceDirectory(
  workspace: WorkspaceFolder,
  root = path.resolve("tests")
) {
  return resolveDirectory(root, workspace, "workspace.json")
}

export async function categoryDirectory(
  workspace: WorkspaceFolder,
  category: Category,
  root = path.resolve("tests")
) {
  return resolveDirectory(
    await workspaceDirectory(workspace, root),
    category,
    "category.json"
  )
}

export async function testDirectory(
  workspace: WorkspaceFolder,
  category: Category,
  test: Pick<TestCase, "id" | "name">,
  root = path.resolve("tests")
) {
  return resolveDirectory(
    await categoryDirectory(workspace, category, root),
    test,
    "test.json"
  )
}

// The repository holds a workspace row lock while this journal is active.
// Undo file changes if the database transaction fails, including at commit.
export class TestFiles {
  private undo: Undo[] = []
  private garbage: string[] = []

  constructor(
    readonly workspace: WorkspaceFolder,
    readonly root = path.resolve("tests")
  ) {}

  private async io<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (cause) {
      if (cause instanceof TestFilesError) throw cause
      throw new TestFilesError(
        "Could not write test files. Check the tests folder and its permissions, then try again.",
        { cause }
      )
    }
  }

  private async directory(directory: string) {
    const info = await stat(directory)
    if (info) {
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new TestFilesError(
          "Test folders must be directories, not symbolic links."
        )
      return
    }
    await mkdir(directory)
    this.undo.push(async () => {
      try {
        await rmdir(directory)
      } catch (error) {
        // Never remove unrelated files created concurrently in a shared parent.
        if (
          !["ENOTEMPTY", "ENOENT"].includes(
            (error as NodeJS.ErrnoException).code ?? ""
          )
        )
          throw error
      }
    })
  }

  private async checkCategory(category: Category) {
    if (category.workspaceId !== this.workspace.id)
      throw new TestFilesError("This category belongs to another workspace.")
    await this.createWorkspace()
    const parent = await workspaceDirectory(this.workspace, this.root)
    const directory = await resolveDirectory(parent, category, "category.json")
    const info = await stat(directory)
    if (info && (!info.isDirectory() || info.isSymbolicLink()))
      throw new TestFilesError(
        "Test folders must be directories, not symbolic links."
      )
    return directory
  }

  private async write(file: string, content: string, onlyIfMissing = false) {
    const info = await stat(file)
    if (info && (!info.isFile() || info.isSymbolicLink()))
      throw new TestFilesError(
        "Test files must be regular files, not symbolic links."
      )
    if (info && onlyIfMissing) return
    const previous = info ? await readFile(file) : null
    await this.atomicWrite(file, content)
    this.undo.push(async () => {
      if (previous === null) await rm(file, { force: true })
      else await this.atomicWrite(file, previous)
    })
  }

  private async atomicWrite(file: string, content: string | Buffer) {
    const temporary = `${file}.${crypto.randomUUID()}.tmp`
    try {
      await writeFile(temporary, content, { flag: "wx" })
      await rename(temporary, file)
    } finally {
      await rm(temporary, { force: true })
    }
  }

  private async managedDirectory(
    parent: string,
    record: WorkspaceFolder,
    metadata: string
  ) {
    let directory = await resolveDirectory(parent, record, metadata)
    // Migrate only the old full-ID convention; keep existing collision suffixes stable.
    if (
      path.basename(directory).endsWith(`--${record.id}`) &&
      (await stat(directory))
    ) {
      const next = await availableDirectory(parent, record)
      await rename(directory, next)
      const previous = directory
      this.undo.push(() => rename(next, previous))
      directory = next
    }
    await this.directory(directory)
    return directory
  }

  async migrate(groups: Array<Category & { tests: TestCase[] }>) {
    return this.io(async () => {
      if (!(await stat(await workspaceDirectory(this.workspace, this.root))))
        return
      await this.createWorkspace()
      for (const category of groups) {
        if (
          !(await stat(
            await categoryDirectory(this.workspace, category, this.root)
          ))
        )
          continue
        await this.createCategory(category)
        for (const test of category.tests) {
          if (
            await stat(
              await testDirectory(this.workspace, category, test, this.root)
            )
          )
            await this.createTest(category, test)
        }
      }
    })
  }

  async createWorkspace() {
    return this.io(async () => {
      await this.directory(this.root)
      const directory = await this.managedDirectory(
        this.root,
        this.workspace,
        "workspace.json"
      )
      await this.write(
        path.join(directory, "workspace.json"),
        JSON.stringify({ version: 1, ...this.workspace }, null, 2) + "\n",
        true
      )
    })
  }

  async deleteWorkspace() {
    return this.io(async () => {
      await this.directory(this.root)
      await this.stageRemoval(
        await workspaceDirectory(this.workspace, this.root)
      )
    })
  }

  async createCategory(category: Category) {
    return this.io(async () => {
      await this.checkCategory(category)
      const directory = await this.managedDirectory(
        await workspaceDirectory(this.workspace, this.root),
        category,
        "category.json"
      )
      await this.write(
        path.join(directory, "category.json"),
        JSON.stringify(
          {
            version: 1,
            id: category.id,
            name: category.name,
            workspaceId: category.workspaceId,
          },
          null,
          2
        ) + "\n"
      )
    })
  }

  async createTest(category: Category, test: TestCase) {
    await this.createCategory(category)
    return this.io(async () => {
      const directory = await this.managedDirectory(
        await categoryDirectory(this.workspace, category, this.root),
        test,
        "test.json"
      )
      await this.write(
        path.join(directory, "test.json"),
        JSON.stringify(
          {
            version: 1,
            workspaceId: category.workspaceId,
            categoryId: category.id,
            id: test.id,
            name: test.name,
            description: test.description,
            steps: test.steps,
            expectedResult: test.expectedResult,
          },
          null,
          2
        ) + "\n"
      )
      await this.stageRemoval(path.join(directory, "prompt.md"), "file")
    })
  }

  async renameCategory(category: Category, name: string) {
    return this.io(async () => {
      const previous = await this.checkCategory(category)
      if (!(await stat(previous))) return // Older database-only categories are created lazily.
      const next = await availableDirectory(
        await workspaceDirectory(this.workspace, this.root),
        { ...category, name },
        previous
      )
      if (previous !== next) {
        if (await stat(next))
          throw new TestFilesError(
            "The destination category folder already exists."
          )
        await rename(previous, next)
        this.undo.push(() => rename(next, previous))
      }
      await this.createCategory({ ...category, name })
    })
  }

  private async stageRemoval(
    directory: string,
    kind: "directory" | "file" = "directory"
  ) {
    const info = await stat(directory)
    if (!info) return
    if (
      (kind === "directory" ? !info.isDirectory() : !info.isFile()) ||
      info.isSymbolicLink()
    )
      throw new TestFilesError(
        "Test folders must be directories, not symbolic links."
      )
    const temporary = path.join(
      this.root,
      `.novel-trash-${crypto.randomUUID()}`
    )
    await rename(directory, temporary)
    this.undo.push(() => rename(temporary, directory))
    this.garbage.push(temporary)
  }

  async deleteCategory(category: Category) {
    return this.io(async () => {
      await this.checkCategory(category)
      await this.stageRemoval(
        await categoryDirectory(this.workspace, category, this.root)
      )
    })
  }

  async deleteTest(category: Category, test: Pick<TestCase, "id" | "name">) {
    return this.io(async () => {
      const directory = await this.checkCategory(category)
      if (await stat(directory))
        await this.stageRemoval(
          await testDirectory(this.workspace, category, test, this.root)
        )
    })
  }

  async rollback() {
    const errors: unknown[] = []
    for (const undo of this.undo.reverse()) {
      try {
        await undo()
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length)
      throw new TestFilesError(
        "Could not restore test files after a failed save. Check the tests folder.",
        { cause: new AggregateError(errors) }
      )
  }

  async commit() {
    this.undo = []
    for (const directory of this.garbage) {
      // A cleanup failure must not turn a committed database write into a failed response.
      try {
        await rm(directory, { recursive: true, force: true })
      } catch (error) {
        console.error("Could not remove staged test files", error)
      }
    }
  }
}
