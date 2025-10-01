# RAG File Upload Implementation Guide with Context7

## Overview

This guide will walk you through extending the AI chatbot to support file uploads for RAG (Retrieval Augmented Generation) functionality using Context7. The implementation will allow users to:

1. Upload documents (PDFs, text files, markdown) for context
2. Process and index uploaded files for semantic search
3. Use Context7 API to fetch up-to-date library documentation
4. Combine file context with Context7 documentation for comprehensive responses

---

## Part 1: Understanding the Current System

### Current File Upload Implementation

**What exists now:**
- File: `app/(chat)/api/files/upload/route.ts`
- Currently only supports **images** (JPEG/PNG)
- Files uploaded to Vercel Blob storage
- File size limit: 5MB
- Attachments sent with messages but not indexed for RAG

**Current message flow:**
1. User uploads file via `multimodal-input.tsx` (line 171-196)
2. File sent to `/api/files/upload` endpoint
3. File stored in Vercel Blob, URL returned
4. URL attached to message as attachment (line 138-148 in multimodal-input.tsx)
5. AI receives file URL but doesn't extract/index content

**What's missing for RAG:**
- No text extraction from documents (PDF, DOCX, TXT)
- No vector embeddings generation
- No semantic search capability
- No document chunking strategy
- No integration with Context7 for library docs

---

## Part 2: Architecture Design

### RAG System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  (Upload Documents + Ask Questions)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              File Upload & Processing                        │
│  • Accept PDF/TXT/MD/DOCX files                             │
│  • Extract text content                                      │
│  • Chunk documents intelligently                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Vector Database (Upstash Vector)                  │
│  • Store document embeddings                                 │
│  • Perform semantic search                                   │
│  • Return relevant chunks                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         Context Assembly (RAG Tool)                          │
│  • Retrieve relevant document chunks                         │
│  • Fetch Context7 library docs (optional)                    │
│  • Combine into context                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                AI Model (Grok)                               │
│  • Process query + context                                   │
│  • Generate response                                         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**For Document Processing:**
- `pdf-parse` - Extract text from PDFs
- `mammoth` - Extract text from DOCX files
- `langchain` - Document chunking and text splitting

**For Vector Storage:**
- `@upstash/vector` - Upstash Vector database client
- Upstash Vector service - Serverless vector database

**For Context7 Integration:**
- Context7 HTTP API (https://mcp.context7.com)
- No SDK required, use fetch

**For Embeddings:**
- Vercel AI SDK with OpenAI embeddings
- Alternative: xAI embeddings if available

---

## Part 3: Database Schema Changes

### Step 1: Add Document Metadata Table

We need to track uploaded documents and their processing status.

**File to edit:** `lib/db/schema.ts`

**Add new imports at the top (around line 2-13):**

```typescript
import {
  boolean,
  foreignKey,
  integer,
  json,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  index,  // ADD THIS
} from "drizzle-orm/pg-core";
```

**Add new table definition at the bottom (after `stream` table, around line 173):**

```typescript
export const uploadedDocument = pgTable(
  "UploadedDocument",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    filename: text("filename").notNull(),
    originalUrl: text("originalUrl").notNull(),
    contentType: text("contentType").notNull(),
    fileSize: integer("fileSize").notNull(),
    extractedText: text("extractedText"),
    chunkCount: integer("chunkCount").default(0),
    processingStatus: varchar("processingStatus", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    processingError: text("processingError"),
    vectorNamespace: text("vectorNamespace"), // Upstash Vector namespace
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    processedAt: timestamp("processedAt"),
  },
  (table) => ({
    userIdIdx: index("uploaded_document_user_id_idx").on(table.userId),
    chatIdIdx: index("uploaded_document_chat_id_idx").on(table.chatId),
    statusIdx: index("uploaded_document_status_idx").on(table.processingStatus),
  })
);

export type UploadedDocument = InferSelectModel<typeof uploadedDocument>;

export const documentChunk = pgTable(
  "DocumentChunk",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("documentId")
      .notNull()
      .references(() => uploadedDocument.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    vectorId: text("vectorId"), // ID in Upstash Vector
    tokenCount: integer("tokenCount"),
    metadata: jsonb("metadata").$type<{
      pageNumber?: number;
      section?: string;
      [key: string]: any;
    }>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index("document_chunk_document_id_idx").on(table.documentId),
    vectorIdIdx: index("document_chunk_vector_id_idx").on(table.vectorId),
  })
);

export type DocumentChunk = InferSelectModel<typeof documentChunk>;
```

### Step 2: Generate and Apply Migration

**Commands to run:**

```bash
pnpm db:generate
```

**Review the migration file** in `lib/db/migrations/`, then apply:

```bash
pnpm db:migrate
```

**Verify:**

```bash
pnpm db:studio
```

You should see `UploadedDocument` and `DocumentChunk` tables.

---

## Part 4: Install Dependencies

### Step 1: Install Required Packages

**Command to run:**

```bash
pnpm add pdf-parse mammoth @upstash/vector langchain @langchain/textsplitters
```

**What each package does:**
- `pdf-parse` - Extracts text from PDF files
- `mammoth` - Converts DOCX to text/HTML
- `@upstash/vector` - Client for Upstash Vector database
- `langchain` - Document processing utilities
- `@langchain/textsplitters` - Intelligent text chunking

### Step 2: Add Environment Variables

**File to edit:** `.env` (create if doesn't exist, or `.env.local`)

**Add these variables:**

```bash
# Upstash Vector Database
UPSTASH_VECTOR_REST_URL=https://your-vector-endpoint.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-vector-token

# Context7 API (Optional - for higher rate limits)
CONTEXT7_API_KEY=your-context7-api-key

# OpenAI for embeddings (or use xAI if they support embeddings)
OPENAI_API_KEY=your-openai-api-key
```

**How to get these:**

1. **Upstash Vector:**
   - Go to https://console.upstash.com/
   - Create a new Vector database
   - Choose embedding model: "text-embedding-3-small" (1536 dimensions)
   - Copy REST URL and token

2. **Context7 API Key:**
   - Go to https://context7.com/dashboard
   - Sign in and generate API key
   - Free tier available for personal use

3. **OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create new key
   - Alternatively, wait for xAI embedding support

**Update `.env.example`:**

Add the same variables to `.env.example` with placeholder values.

---

## Part 5: Database Query Functions

### Step 1: Add Document Queries

**File to edit:** `lib/db/queries.ts`

**Add imports at the top (around line 22-34):**

```typescript
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  documentChunk,     // ADD THIS
  message,
  type Suggestion,
  stream,
  suggestion,
  uploadedDocument,  // ADD THIS
  type User,
  user,
  usageLog,
  vote,
} from "./schema";
```

**Add these functions at the bottom:**

```typescript
export async function saveUploadedDocument({
  id,
  userId,
  chatId,
  filename,
  originalUrl,
  contentType,
  fileSize,
}: {
  id: string;
  userId: string;
  chatId: string;
  filename: string;
  originalUrl: string;
  contentType: string;
  fileSize: number;
}) {
  try {
    return await db
      .insert(uploadedDocument)
      .values({
        id,
        userId,
        chatId,
        filename,
        originalUrl,
        contentType,
        fileSize,
        processingStatus: "pending",
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save uploaded document"
    );
  }
}

export async function updateDocumentProcessingStatus({
  documentId,
  status,
  extractedText,
  chunkCount,
  vectorNamespace,
  error,
}: {
  documentId: string;
  status: "processing" | "completed" | "failed";
  extractedText?: string;
  chunkCount?: number;
  vectorNamespace?: string;
  error?: string;
}) {
  try {
    return await db
      .update(uploadedDocument)
      .set({
        processingStatus: status,
        extractedText,
        chunkCount,
        vectorNamespace,
        processingError: error,
        processedAt: status === "completed" ? new Date() : undefined,
      })
      .where(eq(uploadedDocument.id, documentId));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update document processing status"
    );
  }
}

export async function saveDocumentChunks({
  chunks,
}: {
  chunks: Array<{
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    vectorId: string;
    tokenCount?: number;
    metadata?: any;
  }>;
}) {
  try {
    return await db.insert(documentChunk).values(chunks);
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save document chunks"
    );
  }
}

export async function getUploadedDocumentsByChatId({
  chatId,
}: {
  chatId: string;
}) {
  try {
    return await db
      .select()
      .from(uploadedDocument)
      .where(eq(uploadedDocument.chatId, chatId))
      .orderBy(desc(uploadedDocument.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get uploaded documents"
    );
  }
}

export async function getDocumentChunksByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(documentChunk)
      .where(eq(documentChunk.documentId, documentId))
      .orderBy(asc(documentChunk.chunkIndex));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document chunks"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [doc] = await db
      .select()
      .from(uploadedDocument)
      .where(eq(uploadedDocument.id, id));
    return doc;
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteUploadedDocument({ id }: { id: string }) {
  try {
    // Chunks will be cascade deleted
    return await db.delete(uploadedDocument).where(eq(uploadedDocument.id, id));
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete uploaded document"
    );
  }
}
```

---

## Part 6: Document Processing Service

### Step 1: Create Document Processor

**File to create:** `lib/rag/document-processor.ts`

**Content:**

```typescript
import "server-only";

import PDFParser from "pdf-parse";
import mammoth from "mammoth";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export type ProcessedDocument = {
  text: string;
  chunks: Array<{
    content: string;
    index: number;
    metadata: {
      pageNumber?: number;
      section?: string;
    };
  }>;
};

export class DocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  async processDocument(
    buffer: ArrayBuffer,
    contentType: string,
    filename: string
  ): Promise<ProcessedDocument> {
    let text: string;

    try {
      if (contentType === "application/pdf") {
        text = await this.extractTextFromPDF(buffer);
      } else if (
        contentType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        filename.endsWith(".docx")
      ) {
        text = await this.extractTextFromDOCX(buffer);
      } else if (contentType.startsWith("text/") || filename.endsWith(".md")) {
        text = await this.extractTextFromPlainText(buffer);
      } else {
        throw new Error(`Unsupported file type: ${contentType}`);
      }

      const chunks = await this.chunkText(text);

      return {
        text,
        chunks,
      };
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }

  private async extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
    const data = await PDFParser(Buffer.from(buffer));
    return data.text;
  }

  private async extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });
    return result.value;
  }

  private async extractTextFromPlainText(buffer: ArrayBuffer): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
  }

  private async chunkText(
    text: string
  ): Promise<
    Array<{
      content: string;
      index: number;
      metadata: {
        pageNumber?: number;
        section?: string;
      };
    }>
  > {
    const documents = await this.textSplitter.createDocuments([text]);

    return documents.map((doc, index) => ({
      content: doc.pageContent,
      index,
      metadata: {},
    }));
  }

  estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### Step 2: Create Vector Store Service

**File to create:** `lib/rag/vector-store.ts`

**Content:**

```typescript
import "server-only";

import { Index } from "@upstash/vector";

export type VectorSearchResult = {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
};

export class VectorStore {
  private index: Index;

  constructor() {
    if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
      throw new Error("Upstash Vector credentials not configured");
    }

    this.index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
  }

  async upsertDocumentChunks({
    documentId,
    chunks,
    embeddings,
  }: {
    documentId: string;
    chunks: Array<{ content: string; index: number; metadata: any }>;
    embeddings: number[][];
  }): Promise<string[]> {
    const vectorIds: string[] = [];

    // Upsert in batches
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchEmbeddings = embeddings.slice(i, i + batchSize);

      const vectors = batch.map((chunk, idx) => {
        const vectorId = `${documentId}-chunk-${chunk.index}`;
        vectorIds.push(vectorId);

        return {
          id: vectorId,
          vector: batchEmbeddings[idx],
          metadata: {
            documentId,
            chunkIndex: chunk.index,
            content: chunk.content,
            ...chunk.metadata,
          },
        };
      });

      await this.index.upsert(vectors);
    }

    return vectorIds;
  }

  async searchSimilarChunks({
    query,
    queryEmbedding,
    documentIds,
    topK = 5,
  }: {
    query: string;
    queryEmbedding: number[];
    documentIds?: string[];
    topK?: number;
  }): Promise<VectorSearchResult[]> {
    const results = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: documentIds
        ? `documentId IN [${documentIds.map((id) => `"${id}"`).join(",")}]`
        : undefined,
    });

    return results.map((result) => ({
      id: result.id,
      score: result.score,
      content: result.metadata?.content || "",
      metadata: result.metadata || {},
    }));
  }

  async deleteDocumentVectors(documentId: string): Promise<void> {
    // Delete all vectors for a document
    // Note: This requires querying first, then deleting by IDs
    // Upstash Vector doesn't support delete by filter directly
    try {
      // Query to get all vector IDs for this document
      const allChunks = await this.index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000, // Large number to get all
        includeMetadata: true,
        filter: `documentId = "${documentId}"`,
      });

      const idsToDelete = allChunks.map((chunk) => chunk.id);

      if (idsToDelete.length > 0) {
        await this.index.delete(idsToDelete);
      }
    } catch (error) {
      console.error("Error deleting document vectors:", error);
      throw error;
    }
  }
}
```

### Step 3: Create Embeddings Service

**File to create:** `lib/rag/embeddings.ts`

**Content:**

```typescript
import "server-only";

import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

export class EmbeddingsService {
  private model = openai.embedding("text-embedding-3-small");

  async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.model,
      value: text,
    });

    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: this.model,
      values: texts,
    });

    return embeddings;
  }
}
```

---

## Part 7: Update File Upload Endpoint

### Step 1: Extend Upload Route to Handle Documents

**File to edit:** `app/(chat)/api/files/upload/route.ts`

**Replace entire content with:**

```typescript
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { saveUploadedDocument } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
      message:
        "File type should be JPEG, PNG, PDF, TXT, MD, or DOCX",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const chatId = formData.get("chatId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: "public",
      });

      const documentId = generateUUID();

      // Save document metadata to database
      await saveUploadedDocument({
        id: documentId,
        userId: session.user.id,
        chatId,
        filename,
        originalUrl: data.url,
        contentType: file.type,
        fileSize: file.size,
      });

      return NextResponse.json({
        ...data,
        documentId,
        requiresProcessing: file.type !== "image/jpeg" && file.type !== "image/png",
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
```

---

## Part 8: Create Document Processing Endpoint

### Step 1: Create Background Processing Endpoint

**File to create:** `app/(chat)/api/documents/process/route.ts`

**Content:**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getDocumentById,
  saveDocumentChunks,
  updateDocumentProcessingStatus,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { DocumentProcessor } from "@/lib/rag/document-processor";
import { EmbeddingsService } from "@/lib/rag/embeddings";
import { VectorStore } from "@/lib/rag/vector-store";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 300; // 5 minutes for processing

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:api", "Not authenticated").toResponse();
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Get document from database
    const doc = await getDocumentById({ id: documentId });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership
    if (doc.userId !== session.user.id) {
      return new ChatSDKError("forbidden:api", "Not authorized").toResponse();
    }

    // Check if already processed
    if (doc.processingStatus === "completed") {
      return NextResponse.json({
        message: "Document already processed",
        status: "completed",
      });
    }

    // Update status to processing
    await updateDocumentProcessingStatus({
      documentId,
      status: "processing",
    });

    try {
      // Fetch file from Vercel Blob
      const fileResponse = await fetch(doc.originalUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      // Initialize services
      const processor = new DocumentProcessor();
      const embeddingsService = new EmbeddingsService();
      const vectorStore = new VectorStore();

      // Process document
      const { text, chunks } = await processor.processDocument(
        fileBuffer,
        doc.contentType,
        doc.filename
      );

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddings = await embeddingsService.generateEmbeddings(chunkTexts);

      // Store in vector database
      const vectorIds = await vectorStore.upsertDocumentChunks({
        documentId,
        chunks,
        embeddings,
      });

      // Save chunks to database
      const chunkRecords = chunks.map((chunk, index) => ({
        id: generateUUID(),
        documentId,
        chunkIndex: chunk.index,
        content: chunk.content,
        vectorId: vectorIds[index],
        tokenCount: processor.estimateTokenCount(chunk.content),
        metadata: chunk.metadata,
      }));

      await saveDocumentChunks({ chunks: chunkRecords });

      // Update document status
      await updateDocumentProcessingStatus({
        documentId,
        status: "completed",
        extractedText: text.substring(0, 10000), // Store first 10k chars
        chunkCount: chunks.length,
        vectorNamespace: `chat-${doc.chatId}`,
      });

      return NextResponse.json({
        message: "Document processed successfully",
        status: "completed",
        chunkCount: chunks.length,
      });
    } catch (error: any) {
      console.error("Error processing document:", error);

      await updateDocumentProcessingStatus({
        documentId,
        status: "failed",
        error: error.message,
      });

      return NextResponse.json(
        { error: "Failed to process document", details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Error in document processing endpoint:", error);
    return new ChatSDKError(
      "internal_server_error:api",
      "Failed to process document"
    ).toResponse();
  }
}
```

---

## Part 9: Create RAG Tools

### Step 1: Create Context7 Service

**File to create:** `lib/rag/context7.ts`

**Content:**

```typescript
import "server-only";

const CONTEXT7_API_BASE = "https://api.context7.com/v1";

export type Context7LibraryResult = {
  id: string;
  name: string;
  version?: string;
  description?: string;
};

export type Context7DocsResult = {
  content: string;
  tokens: number;
  library: string;
  topic?: string;
};

export class Context7Service {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.CONTEXT7_API_KEY;
  }

  async resolveLibraryId(libraryName: string): Promise<Context7LibraryResult[]> {
    try {
      const response = await fetch(
        `${CONTEXT7_API_BASE}/resolve-library-id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify({ libraryName }),
        }
      );

      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.libraries || [];
    } catch (error) {
      console.error("Error resolving library ID:", error);
      throw error;
    }
  }

  async getLibraryDocs({
    libraryId,
    topic,
    tokens = 10000,
  }: {
    libraryId: string;
    topic?: string;
    tokens?: number;
  }): Promise<Context7DocsResult> {
    try {
      const response = await fetch(`${CONTEXT7_API_BASE}/get-library-docs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          context7CompatibleLibraryID: libraryId,
          topic,
          tokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.documentation || "",
        tokens: data.tokens || 0,
        library: libraryId,
        topic,
      };
    } catch (error) {
      console.error("Error fetching library docs:", error);
      throw error;
    }
  }
}
```

**Note:** The exact API endpoints may differ. Check the Context7 GitHub repository for the latest API specification.

### Step 2: Create RAG Search Tool

**File to create:** `lib/ai/tools/search-documents.ts`

**Content:**

```typescript
import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getUploadedDocumentsByChatId } from "@/lib/db/queries";
import { EmbeddingsService } from "@/lib/rag/embeddings";
import { VectorStore } from "@/lib/rag/vector-store";
import { Context7Service } from "@/lib/rag/context7";

type SearchDocumentsProps = {
  session: Session;
  chatId: string;
};

export const searchDocuments = ({
  session,
  chatId,
}: SearchDocumentsProps) =>
  tool({
    description:
      "Search through uploaded documents and optionally fetch library documentation from Context7. Use this when the user asks questions about uploaded files or needs current library/framework documentation.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query or question to find relevant information"),
      includeContext7: z
        .boolean()
        .optional()
        .describe("Whether to fetch documentation from Context7"),
      libraryName: z
        .string()
        .optional()
        .describe("Name of the library/framework to fetch docs for (e.g., 'nextjs', 'react')"),
      topic: z
        .string()
        .optional()
        .describe("Specific topic within the library to focus on"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of document chunks to return"),
    }),
    execute: async ({
      query,
      includeContext7 = false,
      libraryName,
      topic,
      maxResults = 5,
    }) => {
      try {
        const results: {
          documentChunks: Array<{
            content: string;
            score: number;
            source: string;
          }>;
          context7Docs?: string;
          totalChunks: number;
        } = {
          documentChunks: [],
          totalChunks: 0,
        };

        // Get uploaded documents for this chat
        const uploadedDocs = await getUploadedDocumentsByChatId({ chatId });
        const processedDocs = uploadedDocs.filter(
          (doc) => doc.processingStatus === "completed"
        );

        if (processedDocs.length > 0) {
          // Search in vector store
          const embeddingsService = new EmbeddingsService();
          const vectorStore = new VectorStore();

          const queryEmbedding = await embeddingsService.generateEmbedding(query);

          const documentIds = processedDocs.map((doc) => doc.id);

          const searchResults = await vectorStore.searchSimilarChunks({
            query,
            queryEmbedding,
            documentIds,
            topK: maxResults,
          });

          results.documentChunks = searchResults.map((result) => ({
            content: result.content,
            score: result.score,
            source: processedDocs.find(
              (doc) => doc.id === result.metadata.documentId
            )?.filename || "Unknown",
          }));

          results.totalChunks = searchResults.length;
        }

        // Optionally fetch Context7 documentation
        if (includeContext7 && libraryName) {
          try {
            const context7Service = new Context7Service();

            // Resolve library ID
            const libraries = await context7Service.resolveLibraryId(libraryName);

            if (libraries.length > 0) {
              // Use first match
              const library = libraries[0];

              // Fetch documentation
              const docs = await context7Service.getLibraryDocs({
                libraryId: library.id,
                topic,
                tokens: 5000,
              });

              results.context7Docs = docs.content;
            }
          } catch (error) {
            console.error("Error fetching Context7 docs:", error);
            // Continue without Context7 docs
          }
        }

        return results;
      } catch (error) {
        console.error("Error in searchDocuments tool:", error);
        throw error;
      }
    },
  });
```

---

## Part 10: Integrate RAG Tool with Chat

### Step 1: Update Chat Route

**File to edit:** `app/(chat)/api/chat/route.ts`

**Add import at the top (around line 24-28):**

```typescript
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchDocuments } from "@/lib/ai/tools/search-documents";  // ADD THIS
import { updateDocument } from "@/lib/ai/tools/update-document";
```

**Update the tools configuration (around line 186-200):**

```typescript
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "searchDocuments",  // ADD THIS
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            searchDocuments: searchDocuments({ session, chatId: id }),  // ADD THIS
          },
```

### Step 2: Update Types

**File to edit:** `lib/types.ts`

**Update the ChatTools type (around line 26-31):**

```typescript
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { searchDocuments } from "./ai/tools/search-documents";  // ADD THIS
import type { updateDocument } from "./ai/tools/update-document";

// ... later in file

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchDocuments: InferUITool<ReturnType<typeof searchDocuments>>;  // ADD THIS
};
```

---

## Part 11: Update Frontend

### Step 1: Trigger Document Processing After Upload

**File to edit:** `components/multimodal-input.tsx`

**Update the `uploadFile` function (around line 171-196):**

```typescript
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);  // ADD THIS

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType, documentId, requiresProcessing } = data;

        // If document requires processing (not an image), trigger processing
        if (requiresProcessing && documentId) {
          // Trigger background processing
          fetch("/api/documents/process", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ documentId }),
          }).catch((error) => {
            console.error("Error triggering document processing:", error);
          });

          toast.success("Document uploaded and processing started");
        }

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, [chatId]);  // ADD chatId dependency
```

### Step 2: Update System Prompt

**File to edit:** `lib/ai/prompts.ts`

**Add information about the RAG tool in the system prompt:**

Find the system prompt and add:

```typescript
export function systemPrompt({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: ChatModel["id"];
  requestHints: RequestHints;
}) {
  const basePrompt = `You are a helpful AI assistant...

Available tools:
- getWeather: Get current weather information
- createDocument: Create artifacts (text, code, sheets)
- updateDocument: Update existing artifacts
- requestSuggestions: Generate document editing suggestions
- searchDocuments: Search through uploaded documents and fetch library documentation from Context7

When users upload documents (PDF, DOCX, TXT, MD files), you can search through them using the searchDocuments tool.
You can also fetch up-to-date library documentation by setting includeContext7=true and specifying a libraryName.

Example searches:
- "What does the uploaded contract say about payment terms?" - searches uploaded documents
- "How do I implement authentication in Next.js? use context7" - fetches Next.js docs
- "Compare the uploaded research paper with React best practices" - combines both

${requestHints.city ? `User location: ${requestHints.city}, ${requestHints.country}` : ""}
`;

  return basePrompt;
}
```

---

## Part 12: Testing

### Step 1: Test Document Upload

**Start the dev server:**

```bash
pnpm dev
```

**Test steps:**
1. Go to http://localhost:3000
2. Start a new chat
3. Click the attachment button
4. Upload a PDF or text file
5. Check browser console for processing trigger
6. Check server logs for processing status

**Verify in database:**

```bash
pnpm db:studio
```

- Check `UploadedDocument` table for new entry
- Status should change from "pending" → "processing" → "completed"
- Check `DocumentChunk` table for chunks

### Step 2: Test RAG Search

**In the chat, try:**

```
"What does my uploaded document say about [topic]?"
```

The AI should call the `searchDocuments` tool and return relevant information.

### Step 3: Test Context7 Integration

**In the chat, try:**

```
"How do I create API routes in Next.js? use context7"
```

Or more explicitly:

```
"Explain React hooks with examples"
```

Then check if the AI uses Context7 to fetch current documentation.

### Step 4: Test Combined RAG

**Upload a document, then ask:**

```
"Compare the approach in my uploaded document with Next.js best practices from context7"
```

This should:
1. Search your uploaded document
2. Fetch Next.js docs from Context7
3. Provide a comparison

---

## Part 13: Production Considerations

### Performance Optimization

**1. Caching:**
- Cache Context7 responses (they don't change frequently)
- Cache embeddings for frequently searched queries

**2. Rate Limiting:**
- Add rate limits to document processing endpoint
- Limit file uploads per user per day

**3. Background Processing:**
- Use a job queue (like Upstash QStash) for document processing
- Don't block the upload response

### Security

**1. File Validation:**
- Scan uploaded files for malware
- Validate file content matches declared type
- Limit file sizes strictly

**2. Access Control:**
- Verify user owns documents before searching
- Implement proper chat ownership checks
- Sanitize file content before storing

**3. Cost Management:**
- Monitor embedding API costs
- Set quotas per user type
- Track vector database usage

### Error Handling

**1. Processing Failures:**
- Implement retry logic
- Send notifications for failed processing
- Clean up partial data

**2. Vector Store Issues:**
- Handle connection failures gracefully
- Implement fallback to full-text search
- Monitor vector database health

### Monitoring

**1. Track Metrics:**
- Document processing time
- Search quality (relevance scores)
- API usage and costs
- Error rates

**2. Logging:**
- Log all document operations
- Track Context7 API calls
- Monitor embedding generation

---

## Part 14: Advanced Features

### Feature 1: Document Management UI

Create a page to view/manage uploaded documents:

**File to create:** `app/(chat)/documents/page.tsx`

```typescript
import { auth } from "@/app/(auth)/auth";
import { getUploadedDocumentsByUserId } from "@/lib/db/queries"; // You'll need to create this

export default async function DocumentsPage() {
  const session = await auth();
  // Render list of user's documents with status, delete button, etc.
}
```

### Feature 2: Semantic Caching

Cache similar queries to save on embedding costs:

```typescript
// In vector-store.ts
private queryCache = new Map<string, VectorSearchResult[]>();

async searchSimilarChunks(params) {
  const cacheKey = `${params.query}-${params.topK}`;

  if (this.queryCache.has(cacheKey)) {
    return this.queryCache.get(cacheKey)!;
  }

  const results = await this.index.query(/* ... */);
  this.queryCache.set(cacheKey, results);

  return results;
}
```

### Feature 3: Citation Support

Return sources with AI responses:

```typescript
// In search-documents.ts execute function
return {
  documentChunks: searchResults.map(result => ({
    content: result.content,
    score: result.score,
    source: /* ... */,
    citation: {
      filename: doc.filename,
      page: result.metadata.pageNumber,
      url: doc.originalUrl,
    }
  })),
  // ...
};
```

Then display citations in the UI.

### Feature 4: Multi-Document Chat

Allow selecting specific documents for context:

```typescript
// Add document filter to searchDocuments tool
inputSchema: z.object({
  // ... existing fields
  documentIds: z.array(z.string()).optional(),
}),
```

---

## Summary Checklist

- [ ] Part 1: Understand current system
- [ ] Part 2: Review architecture
- [ ] Part 3: Database schema
  - [ ] Add imports
  - [ ] Add `uploadedDocument` table
  - [ ] Add `documentChunk` table
  - [ ] Generate and apply migration
- [ ] Part 4: Install dependencies
  - [ ] Install npm packages
  - [ ] Set up environment variables
  - [ ] Get Upstash Vector credentials
  - [ ] Get Context7 API key (optional)
- [ ] Part 5: Database queries
  - [ ] Add query functions
- [ ] Part 6: Document processing
  - [ ] Create document-processor.ts
  - [ ] Create vector-store.ts
  - [ ] Create embeddings.ts
- [ ] Part 7: Update file upload
  - [ ] Extend allowed file types
  - [ ] Add document metadata saving
- [ ] Part 8: Processing endpoint
  - [ ] Create /api/documents/process
  - [ ] Test processing flow
- [ ] Part 9: RAG tools
  - [ ] Create context7.ts service
  - [ ] Create search-documents tool
- [ ] Part 10: Integration
  - [ ] Update chat route
  - [ ] Update types
- [ ] Part 11: Frontend
  - [ ] Update multimodal input
  - [ ] Update system prompt
- [ ] Part 12: Testing
  - [ ] Test file upload
  - [ ] Test document search
  - [ ] Test Context7 integration
  - [ ] Test combined RAG
- [ ] Part 13: Production prep
  - [ ] Add error handling
  - [ ] Implement rate limiting
  - [ ] Set up monitoring
- [ ] Part 14: Advanced features (optional)

---

## Troubleshooting

### Issue: Documents not processing

**Check:**
1. Is the processing endpoint being called? (Check network tab)
2. Are environment variables set correctly?
3. Check server logs for errors
4. Verify Upstash Vector connection

### Issue: Vector search returns no results

**Check:**
1. Are embeddings being generated correctly?
2. Is the vector dimension correct (1536 for text-embedding-3-small)?
3. Are vectors being stored in Upstash?
4. Is the query embedding using the same model?

### Issue: Context7 API errors

**Check:**
1. Is API key set correctly?
2. Are you exceeding rate limits?
3. Is the library name valid?
4. Check Context7 status page

### Issue: High costs

**Monitor:**
1. Embedding API usage (OpenAI charges per token)
2. Vector database queries
3. Context7 API calls
4. Implement caching to reduce calls

---

## Additional Resources

- **Upstash Vector Docs:** https://upstash.com/docs/vector
- **Context7 GitHub:** https://github.com/upstash/context7
- **LangChain Text Splitters:** https://js.langchain.com/docs/modules/data_connection/document_transformers/
- **Vercel AI SDK:** https://sdk.vercel.ai/docs

This implementation provides a complete RAG system with file upload processing and Context7 integration for your AI chatbot!
