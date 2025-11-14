-- Add refreshTokenIssuedAt column for tracking 60-day refresh token expiry
-- For existing connections, use updatedAt as best estimate (conservative approach)
ALTER TABLE "XeroConnection" ADD COLUMN "refreshTokenIssuedAt" timestamp;

-- Backfill existing records with updatedAt (conservative - may be earlier than actual)
UPDATE "XeroConnection" SET "refreshTokenIssuedAt" = "updatedAt" WHERE "refreshTokenIssuedAt" IS NULL;

-- Make column non-nullable after backfill
ALTER TABLE "XeroConnection" ALTER COLUMN "refreshTokenIssuedAt" SET NOT NULL;