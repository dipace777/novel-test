import { sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import type { WorkspaceConfig } from "../../features/test-workspace/config"

export const workspaces = pgTable(
  "workspaces",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    config: jsonb().$type<WorkspaceConfig>().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_name_unique").on(sql`lower(${table.name})`),
  ]
)

export const categories = pgTable(
  "categories",
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("category_name_unique").on(
      table.workspaceId,
      sql`lower(${table.name})`
    ),
    index("category_workspace_index").on(table.workspaceId),
  ]
)

export const testCases = pgTable(
  "test_cases",
  {
    id: text().primaryKey(),
    categoryId: text()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text().default("").notNull(),
    steps: jsonb().$type<string[]>().default([]).notNull(),
    expectedResult: text().default("").notNull(),
    prompt: text().default("").notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("test_name_unique").on(
      table.categoryId,
      sql`lower(${table.name})`
    ),
    index("test_category_index").on(table.categoryId),
  ]
)
