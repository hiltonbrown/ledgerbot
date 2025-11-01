-- Add tsvector column for full-text search
ALTER TABLE regulatory_document
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS regulatory_document_search_vector_idx
ON regulatory_document
USING GIN(search_vector);

-- Function to update search_vector
CREATE OR REPLACE FUNCTION update_regulatory_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.extracted_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS update_regulatory_document_search_vector_trigger ON regulatory_document;
CREATE TRIGGER update_regulatory_document_search_vector_trigger
BEFORE INSERT OR UPDATE ON regulatory_document
FOR EACH ROW
EXECUTE FUNCTION update_regulatory_document_search_vector();

-- Update existing rows
UPDATE regulatory_document
SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B')
WHERE search_vector IS NULL;
