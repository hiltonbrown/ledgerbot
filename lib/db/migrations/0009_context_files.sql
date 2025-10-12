CREATE TABLE "ContextFile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "blobUrl" TEXT NOT NULL,
  "fileType" VARCHAR(128) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "extractedText" TEXT,
  "tokenCount" INTEGER,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  "errorMessage" TEXT,
  description TEXT,
  tags JSONB,
  "isPinned" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastUsedAt" TIMESTAMP,
  "processedAt" TIMESTAMP
);

CREATE INDEX "idx_context_file_user_id" ON "ContextFile"("userId");
CREATE INDEX "idx_context_file_status" ON "ContextFile"(status);
CREATE INDEX "idx_context_file_pinned" ON "ContextFile"("isPinned");
CREATE INDEX "idx_context_file_last_used" ON "ContextFile"("lastUsedAt");
