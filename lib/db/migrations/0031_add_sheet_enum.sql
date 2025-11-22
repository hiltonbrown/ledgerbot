DO $$
BEGIN
    -- Add 'sheet' to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Document_kind'
        AND e.enumlabel = 'sheet'
    ) THEN
        ALTER TYPE "Document_kind" ADD VALUE 'sheet';
    END IF;
END $$;