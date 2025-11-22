-- Step 2: Add the new 'kind' column with the enum type
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "kind" "Document_kind" NOT NULL DEFAULT 'text'::"Document_kind";

-- Step 3: Copy existing data from 'text' column to 'kind' column
UPDATE "Document" SET "kind" = "text"::"Document_kind" WHERE "kind" = 'text'::"Document_kind";

-- Step 4: Drop the old 'text' column
ALTER TABLE "Document" DROP COLUMN IF EXISTS "text";
