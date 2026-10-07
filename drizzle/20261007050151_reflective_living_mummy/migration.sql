CREATE TABLE "categories" (
	"id" text PRIMARY KEY,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" text PRIMARY KEY,
	"categoryId" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"steps" jsonb DEFAULT '[]' NOT NULL,
	"expectedResult" text DEFAULT '' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "category_name_unique" ON "categories" ("workspaceId",lower("name"));--> statement-breakpoint
CREATE INDEX "category_workspace_index" ON "categories" ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "test_name_unique" ON "test_cases" ("categoryId",lower("name"));--> statement-breakpoint
CREATE INDEX "test_category_index" ON "test_cases" ("categoryId");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_name_unique" ON "workspaces" (lower("name"));--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspaceId_workspaces_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_categoryId_categories_id_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE;