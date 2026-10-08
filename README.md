# Novel Test

A TanStack Start application for testing deployed staging apps with tests that combine browser interactions and API calls, using PostgreSQL and Drizzle ORM. Workspaces, categories, test cases, workspace configuration, and prompt drafts are persisted. AI test generation is not connected yet.

## Local setup

Requires Node.js, pnpm, and a running Docker daemon.

```sh
pnpm install
cp .env.example .env
pnpm db:setup
pnpm dev
```

PostgreSQL is available at `localhost:6542`; the application runs at `http://localhost:3000`. `db:setup` starts the container and applies checked-in migrations. Every installation includes an empty Default Workspace. Configure its Global URL in settings, then add categories and tests through the UI. Additional workspaces can be created from the switcher; their name is optional and defaults to the app's hostname.

The Compose service binds to loopback and stores data in the `postgres_data` volume. `pnpm db:down` stops the database without deleting its data. If changing the PostgreSQL credentials in `.env`, update `DATABASE_URL` to match. Credentials are initialized only when the database volume is first created.

## Database commands

```sh
pnpm db:up        # Start PostgreSQL and wait for its health check
pnpm db:down      # Stop PostgreSQL; keep its volume
pnpm db:generate  # Generate a migration after editing the schema
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Open Drizzle Studio
```

Drizzle ORM and Drizzle Kit are both pinned to `1.0.0-rc.4`, the official `rc` tag verified for this setup. Commit generated migrations alongside schema changes.

## Structure

- `src/features/test-workspace/`: UI, shared types, configuration validation, and TanStack server functions.
- `src/server/db/`: PostgreSQL connection pool and Drizzle schema.
- `src/server/workspace-repository.server.ts`: database operations; restricted to server imports.
- `src/server/test-files.ts`: test scaffolding and reversible filesystem changes.
- `drizzle/`: generated SQL migrations and snapshots.

## Test files

Creating a workspace creates its folder under the project's `tests/` directory. Categories live inside their workspace, and each test has a folder inside its category:

```text
tests/
  default-workspace/
    workspace.json
    reddit-market-study/
      category.json
      search-social-media-automation-tag-on-reddit/
        test.json
```

Folder names use sanitized readable names. A six-character suffix is added only when a sibling folder already uses the same name (for example, `sign-in--a1b2c3`). IDs remain in JSON metadata so a folder stays attached to its record, including after renames or deletion of a colliding sibling. Unmanaged folders are preserved and also count as name collisions. Run the server from the project root; locally this writes under `/Users/dipace/Desktop/novel_test/tests`.

`workspace.json` records the workspace ID and name without credentials. `category.json` records the category name and workspace ID. `test.json` records the test's metadata, steps, and expected result. Prompt drafts are saved in PostgreSQL and loaded dynamically by the app; no prompt text is written to disk. The agent will write automation code in these test folders later. Creation currently writes metadata only and preserves any automation code already present. AI generation is not connected yet.

Renaming a category moves its folder and preserves its test files. Deleting a test, category, or workspace removes the corresponding folders as well as the database records. Filesystem errors leave forms open with an error and roll back the database write; database failures restore filesystem changes. Filesystem changes are serialized with a PostgreSQL transaction advisory lock across workspaces and server processes, so folder allocation, migration, renames, and deletions cannot race. This rollback handles request failures, but does not provide a distributed transaction across PostgreSQL and disk in the event of a process crash.

Run `pnpm files:migrate` to rename existing full-ID folders and remove their legacy `prompt.md` files and JSON prompt fields. Migration uses database records to identify existing folders, preserves automation code, and can be rerun. Existing database-only records are not backfilled on startup. Existing workspaces and categories are scaffolded when a category or test is added. Files are maintained by the application; editing JSON on disk does not import changes into PostgreSQL.

Category headers provide edit and delete actions. Renaming preserves the category’s tests; deleting a category removes all its tests and saved prompts after confirmation. Test cases can be deleted from their sidebar row after confirmation. Deletion removes the test and its saved prompt while retaining its category. Forms wait for successful database writes before closing, and show errors without discarding entered values. Names are unique without regard to case within their scope. Test and draft writes check category ownership. Drafts save after 500 ms of inactivity and flush when leaving the input or switching tests. Global URL is the only required workspace configuration field. API authentication, headers, timeout, and redirect behavior are optional defaults. API credentials are stored as part of the workspace configuration in this local database.

Workspace settings include a red Delete workspace button. After confirmation, deletion permanently removes the workspace and all its categories, tests, and saved prompts in one database operation. The app selects a remaining workspace; if none remain, create a workspace from the switcher or New test button.

Drag the sidebar's right edge to resize it. The width is saved in browser `localStorage` and restored after refresh. Focus the resize handle to use arrow keys; double-click it to reset to the default width.

## Checks

`tests/` is reserved for automation managed by this tool. Tests of Novel Test itself live in `app-tests/e2e/` and `src/server/*.test.ts`; Playwright checks for the application never discover files in `tests/`.

`pnpm test` uses `playwright.config.ts` to run future agent-authored automation in `tests/`. `pnpm test:workspace` uses a separate configuration to check the Novel Test application in `app-tests/e2e/`.

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm test:files
pnpm test:db
pnpm test:workspace
```

The workspace tests require a migrated database and an installed Playwright Chromium browser (`pnpm exec playwright install chromium`). They start a separate app server on port `3001`, exercise persistence across reloads, and remove the workspaces they create.
