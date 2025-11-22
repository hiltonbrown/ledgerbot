-- Step 1: Create the Document_kind enum type with all values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Document_kind') THEN
        CREATE TYPE "Document_kind" AS ENUM ('text', 'code', 'image', 'sheet');
    END IF;
END $$;
