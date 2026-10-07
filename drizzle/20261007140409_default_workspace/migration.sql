-- Custom SQL migration file, put your code below! --
-- Install the built-in workspace and retire entries from the former demo seed.
-- Custom workspaces are not affected; Personal's categories and tests are moved.
DO $$
DECLARE
  default_id text;
  category_record record;
  candidate_name text;
  suffix text;
  suffix_number integer;
BEGIN
  INSERT INTO "workspaces" ("id", "name", "config", "createdAt")
  VALUES (
    'default',
    'Default Workspace',
    COALESCE(
      (SELECT "config" FROM "workspaces" WHERE "id" = 'personal' AND "name" = 'Personal workspace'),
      '{"globalUrl":""}'::jsonb
    ),
    COALESCE(
      (SELECT "createdAt" FROM "workspaces" WHERE "id" = 'personal' AND "name" = 'Personal workspace'),
      now()
    )
  ) ON CONFLICT DO NOTHING;

  SELECT "id" INTO default_id FROM "workspaces"
  WHERE lower("name") = lower('Default Workspace');
  IF default_id IS NULL THEN
    RAISE EXCEPTION 'Could not create Default Workspace';
  END IF;
  UPDATE "workspaces" SET "name" = 'Default Workspace' WHERE "id" = default_id;

  IF EXISTS (SELECT 1 FROM "workspaces" WHERE "id" = 'personal' AND "name" = 'Personal workspace') THEN
    FOR category_record IN
      SELECT "id", "name" FROM "categories" WHERE "workspaceId" = 'personal'
      ORDER BY "createdAt", "id"
    LOOP
      candidate_name := category_record."name";
      suffix_number := 1;
      WHILE EXISTS (
        SELECT 1 FROM "categories" WHERE "workspaceId" = default_id
        AND lower("name") = lower(candidate_name)
      ) LOOP
        suffix := ' (' || suffix_number || ')';
        candidate_name := left(category_record."name", 64 - length(suffix)) || suffix;
        suffix_number := suffix_number + 1;
      END LOOP;
      UPDATE "categories" SET "workspaceId" = default_id, "name" = candidate_name
      WHERE "id" = category_record."id";
    END LOOP;
    DELETE FROM "workspaces" WHERE "id" = 'personal';
  END IF;

  -- Only delete QA/Staging when they still contain exclusively untouched demos.
  DELETE FROM "workspaces" AS legacy
  WHERE legacy."id" IN ('qa', 'staging')
    AND legacy."name" = CASE legacy."id" WHEN 'qa' THEN 'QA workspace' ELSE 'Staging workspace' END
    AND COALESCE(legacy."config"->>'globalUrl', '') = ''
    AND NOT EXISTS (
      SELECT 1 FROM "categories" AS category
      WHERE category."workspaceId" = legacy."id"
      AND NOT (
        (category."id" = legacy."id" || ':auth' AND category."name" = 'Auth Feature')
        OR (category."id" = legacy."id" || ':posts' AND category."name" = 'Posts')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM "test_cases" AS test
      JOIN "categories" AS category ON category."id" = test."categoryId"
      WHERE category."workspaceId" = legacy."id" AND (
        test."prompt" <> '' OR test."name" IS DISTINCT FROM CASE test."id"
          WHEN legacy."id" || ':valid-sign-in' THEN 'Valid sign-in'
          WHEN legacy."id" || ':invalid-credentials' THEN 'Invalid credentials'
          WHEN legacy."id" || ':protected-route' THEN 'Protected route access'
          WHEN legacy."id" || ':admin-authorization' THEN 'Admin-only authorization'
          WHEN legacy."id" || ':create-post' THEN 'Create a post'
          WHEN legacy."id" || ':edit-own-post' THEN 'Edit your own post'
          WHEN legacy."id" || ':post-authorization' THEN 'Prevent unauthorized edits'
          ELSE NULL
        END
      )
    );
END $$;
