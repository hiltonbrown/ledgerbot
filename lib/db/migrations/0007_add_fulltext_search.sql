-- Add tsvector column for full-text search
ALTER TABLE "RegulatoryDocument"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
--> statement-breakpoint

-- Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS "regulatory_document_search_vector_idx"
ON "RegulatoryDocument"
USING GIN("search_vector");
--> statement-breakpoint

-- Function to update search_vector
CREATE OR REPLACE FUNCTION update_regulatory_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."extractedText", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS update_regulatory_document_search_vector_trigger ON "RegulatoryDocument";
--> statement-breakpoint
CREATE TRIGGER update_regulatory_document_search_vector_trigger
BEFORE INSERT OR UPDATE ON "RegulatoryDocument"
FOR EACH ROW
EXECUTE FUNCTION update_regulatory_document_search_vector();
--> statement-breakpoint

-- Update existing rows
UPDATE "RegulatoryDocument"
SET "search_vector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("extractedText", '')), 'B')
WHERE "search_vector" IS NULL;