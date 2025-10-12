# File Upload Extension Plan

<!--
  This document captures the implementation roadmap for extending LedgerBot's
  file upload and persistent context systems. It mirrors the internal planning
  notes that guided the recent feature work so contributors can reference the
  architecture decisions post-merge.
-->

## Executive Summary

This document outlines a comprehensive plan to extend LedgerBot's file upload functionality to support images, PDFs, Word documents, and Excel files. The implementation is divided into two distinct parts:

1. **Single-Conversation File Context**: Files uploaded for use within a specific conversation only
2. **Persistent Custom Context**: Files that remain available across all conversations as permanent knowledge base

## Current State Analysis

### Existing Implementation

**File Upload API** (`app/(chat)/api/files/upload/route.ts`):
- Only accepts image files (JPEG, PNG)
- Maximum file size: 5MB
- Uploads to Vercel Blob storage with public access
- Basic validation using Zod schema
- Returns blob URL, pathname, and contentType

**Attachment System**:
- Attachments stored in component state (`multimodal-input.tsx:84-85`)
- Displayed as preview cards before sending (`PreviewAttachment` component)
- Sent as message parts with structure:
  ```typescript
  {
    type: "file",
    url: string,
    name: string,
    mediaType: string
  }
  ```
- Attachments visible in message history (`message.tsx:49-106`)

**Current Limitations**:
- No PDF, Word, or Excel support
- No text extraction from documents
- No persistent file storage in database
- Files only exist in blob storage
- No file management interface (settings page shows mock data)
- No way to reuse files across conversations
- Reasoning models cannot use attachments (`multimodal-input.tsx:406`)

**Existing Infrastructure**:
- Vercel Blob storage configured (`BLOB_READ_WRITE_TOKEN`)
- User authentication via Clerk
- PostgreSQL database with Drizzle ORM
- Message parts architecture supports file attachments
- Settings page skeleton exists at `/settings/files`

---

## Part 1: Single-Conversation File Context

### Goal
Enable users to upload images, PDFs, Word documents, and Excel files as attachments to individual messages. The AI model should be able to reference and analyze these files during that specific conversation.

### Architecture Overview

```
User uploads file → Upload API → Vercel Blob Storage
                                      ↓
                               Document Parser (if needed)
                                      ↓
                               Returns URL + extracted text
                                      ↓
                               Attached to message part
                                      ↓
                               Sent to AI model with context
```

### Implementation Steps

#### 1.1 Expand Upload API

**File**: `app/(chat)/api/files/upload/route.ts`

**Changes**:
```typescript
// Update schema to support additional file types
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => {
      const validTypes = [
        // Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        // Documents
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      ];
      return validTypes.includes(file.type);
    }, {
      message: "File type not supported. Allowed: Images (PNG, JPG, GIF, WebP), PDF, DOCX, XLSX",
    }),
});

// Add document processing
async function processDocument(file: Blob, contentType: string) {
  if (contentType === "application/pdf") {
    return await extractPdfText(file);
  } else if (contentType.includes("wordprocessingml")) {
    return await extractDocxText(file);
  } else if (contentType.includes("spreadsheetml")) {
    return await extractXlsxData(file);
  }
  return null; // Images don't need text extraction
}

// Update POST handler
export async function POST(request: Request) {
  // ... existing validation ...

  const fileBuffer = await file.arrayBuffer();

  // Upload to blob storage
  const data = await put(`${filename}`, fileBuffer, {
    access: "public",
  });

  // Extract text content if it's a document
  const extractedText = await processDocument(file, file.type);

  return NextResponse.json({
    ...data,
    extractedText,
    fileSize: file.size,
  });
}
```

#### 1.2 Create Document Parser Library

**New File**: `lib/files/parsers.ts`

```typescript
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function extractPdfText(blob: Blob): Promise<string> {
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractDocxText(blob: Blob): Promise<string> {
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

export async function extractXlsxData(blob: Blob): Promise<string> {
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Convert all sheets to CSV format for AI consumption
    const sheets = workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `Sheet: ${sheetName}\n${csv}`;
    });

    return sheets.join('\n\n');
  } catch (error) {
    console.error('XLSX extraction error:', error);
    throw new Error('Failed to extract data from Excel file');
  }
}

// Utility to detect file type from buffer
export function getMimeType(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // PK header - could be DOCX or XLSX
    // Need deeper inspection of zip contents
    return 'application/zip-based';
  }
  return 'unknown';
}
```

#### 1.3 Update Type Definitions

**File**: `lib/types.ts`

```typescript
// Update Attachment type
export type Attachment = {
  name: string;
  url: string;
  contentType: string;
  fileSize?: number;
  extractedText?: string;
  processingError?: string;
};

// Add file type utilities
export type SupportedFileType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const FILE_TYPE_LABELS: Record<string, string> = {
  'image/jpeg': 'Image (JPEG)',
  'image/png': 'Image (PNG)',
  'image/gif': 'Image (GIF)',
  'image/webp': 'Image (WebP)',
  'application/pdf': 'PDF Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
};
```

#### 1.4 Update Chat API to Include Document Context

**File**: `app/(chat)/api/chat/route.ts`

**Changes**:
```typescript
// Around line 190, modify message conversion
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({ selectedChatModel, requestHints }),
  messages: convertToModelMessages(uiMessages), // This already handles file parts
  // ... rest of config
});

// The Vercel AI SDK automatically handles file parts with URLs
// For documents with extracted text, we need to enhance the conversion
```

**File**: `lib/utils.ts` (or create new `lib/ai/message-converter.ts`)

```typescript
// Enhance message conversion to include extracted text context
export function convertToModelMessages(messages: UIMessage[]): CoreMessage[] {
  return messages.map(message => {
    const textParts: TextPart[] = [];
    const imageParts: ImagePart[] = [];
    const fileParts: FilePart[] = [];

    for (const part of message.parts) {
      if (part.type === 'text') {
        textParts.push({ type: 'text', text: part.text });
      } else if (part.type === 'file') {
        // Check if it's an image or document
        if (part.mediaType?.startsWith('image/')) {
          imageParts.push({
            type: 'image',
            image: part.url,
          });
        } else {
          // For documents, add extracted text as context
          if (part.extractedText) {
            textParts.push({
              type: 'text',
              text: `[Document: ${part.filename}]\n${part.extractedText}\n[End Document]`,
            });
          }
          fileParts.push({
            type: 'file',
            data: part.url,
            mimeType: part.mediaType,
          });
        }
      }
    }

    return {
      role: message.role,
      content: [...textParts, ...imageParts, ...fileParts],
    };
  });
}
```

#### 1.5 Update UI Components

**File**: `components/preview-attachment.tsx`

```typescript
import { FileIcon, FileTextIcon, TableIcon } from './icons';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType, processingError } = attachment;

  const getFileIcon = () => {
    if (contentType.startsWith('image/')) {
      return (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      );
    }
    if (contentType === 'application/pdf') {
      return <FileTextIcon className="size-8 text-red-500" />;
    }
    if (contentType.includes('wordprocessingml')) {
      return <FileTextIcon className="size-8 text-blue-500" />;
    }
    if (contentType.includes('spreadsheetml')) {
      return <TableIcon className="size-8 text-green-500" />;
    }
    return <FileIcon className="size-8 text-muted-foreground" />;
  };

  return (
    <div className="group relative size-16 overflow-hidden rounded-lg border bg-muted">
      <div className="flex size-full items-center justify-center">
        {getFileIcon()}
      </div>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader size={16} />
        </div>
      )}

      {processingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/80">
          <span className="text-white text-xs">Error</span>
        </div>
      )}

      {/* ... rest of component ... */}
    </div>
  );
};
```

**File**: `components/multimodal-input.tsx`

Update `uploadFile` function:

```typescript
const uploadFile = useCallback(async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/files/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const { url, pathname, contentType, extractedText, fileSize } = data;

      return {
        url,
        name: pathname,
        contentType,
        fileSize,
        extractedText,
      };
    }
    const { error } = await response.json();
    toast.error(error);
  } catch (error) {
    toast.error("Failed to upload file, please try again!");
  }
}, []);
```

Update file input to accept all supported types:

```typescript
<input
  className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
  multiple
  accept="image/*,.pdf,.docx,.xlsx"
  onChange={handleFileChange}
  ref={fileInputRef}
  tabIndex={-1}
  type="file"
/>
```

---

## Part 2: Persistent Custom Context Files

### Goal
Allow users to upload files that persist in the database and are automatically included as context in all future conversations. These files act as a permanent knowledge base for the AI.

### Architecture Overview

```
User uploads file → Context Files API → Vercel Blob Storage
                                             ↓
                                    Database Record Created
                                             ↓
                                    Background Processing
                                             ↓
                                    Extract Text (async)
                                             ↓
                                    Update DB Status → 'ready'
                                             ↓
                   On new chat → Fetch user's context files
                                             ↓
                                    Inject into system prompt
```

### Database Schema

#### 2.1 Create ContextFile Table

**File**: `lib/db/schema.ts`

```typescript
export const contextFile = pgTable("ContextFile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // File metadata
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  blobUrl: text("blobUrl").notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  fileSize: integer("fileSize").notNull(), // bytes

  // Extracted content
  extractedText: text("extractedText"),
  tokenCount: integer("tokenCount"), // cached token count for context management

  // Processing status
  status: varchar("status", {
    enum: ["processing", "ready", "failed"]
  }).notNull().default("processing"),
  errorMessage: text("errorMessage"),

  // Metadata
  description: text("description"), // user-provided description
  tags: json("tags").$type<string[]>(), // for categorization
  isPinned: boolean("isPinned").default(false), // prioritize in context

  // Timestamps
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  lastUsedAt: timestamp("lastUsedAt"),
  processedAt: timestamp("processedAt"),
});

export type ContextFile = InferSelectModel<typeof contextFile>;

// Indexes for performance
CREATE INDEX idx_context_file_user_id ON "ContextFile"("userId");
CREATE INDEX idx_context_file_status ON "ContextFile"("status");
CREATE INDEX idx_context_file_pinned ON "ContextFile"("isPinned");
CREATE INDEX idx_context_file_last_used ON "ContextFile"("lastUsedAt");
```

#### 2.2 Add Database Queries

**File**: `lib/db/queries.ts`

```typescript
// Create context file record
export async function createContextFile({
  userId,
  name,
  originalName,
  blobUrl,
  fileType,
  fileSize,
  description,
}: {
  userId: string;
  name: string;
  originalName: string;
  blobUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
}) {
  return await db.insert(contextFile).values({
    userId,
    name,
    originalName,
    blobUrl,
    fileType,
    fileSize,
    description,
    status: "processing",
  }).returning();
}

// Get user's context files
export async function getContextFilesByUserId({
  userId,
  status,
}: {
  userId: string;
  status?: "processing" | "ready" | "failed";
}) {
  const query = db
    .select()
    .from(contextFile)
    .where(eq(contextFile.userId, userId));

  if (status) {
    query.where(eq(contextFile.status, status));
  }

  return await query.orderBy(
    desc(contextFile.isPinned),
    desc(contextFile.lastUsedAt),
    desc(contextFile.createdAt)
  );
}

// Update context file after processing
export async function updateContextFileContent({
  id,
  extractedText,
  tokenCount,
  status,
  errorMessage,
}: {
  id: string;
  extractedText?: string;
  tokenCount?: number;
  status: "ready" | "failed";
  errorMessage?: string;
}) {
  return await db
    .update(contextFile)
    .set({
      extractedText,
      tokenCount,
      status,
      errorMessage,
      processedAt: new Date(),
    })
    .where(eq(contextFile.id, id))
    .returning();
}

// Delete context file
export async function deleteContextFile({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  // Verify ownership
  const file = await db
    .select()
    .from(contextFile)
    .where(
      and(
        eq(contextFile.id, id),
        eq(contextFile.userId, userId)
      )
    )
    .limit(1);

  if (file.length === 0) {
    throw new Error("File not found or unauthorized");
  }

  // Delete from blob storage
  await del(file[0].blobUrl);

  // Delete from database
  return await db
    .delete(contextFile)
    .where(eq(contextFile.id, id))
    .returning();
}

// Update last used timestamp
export async function touchContextFile(id: string) {
  return await db
    .update(contextFile)
    .set({ lastUsedAt: new Date() })
    .where(eq(contextFile.id, id));
}

// Get user's storage usage
export async function getUserStorageUsage(userId: string) {
  const result = await db
    .select({
      totalSize: sql<number>`COALESCE(SUM(${contextFile.fileSize}), 0)`,
      fileCount: sql<number>`COUNT(*)`,
    })
    .from(contextFile)
    .where(eq(contextFile.userId, userId));

  return result[0];
}
```

### API Routes

#### 2.3 Context Files API

**File**: `app/api/context-files/route.ts`

```typescript
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { after } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  createContextFile,
  getContextFilesByUserId,
  getUserStorageUsage,
} from "@/lib/db/queries";
import { processContextFile } from "@/lib/files/context-processor";

const MAX_STORAGE_PER_USER = 100 * 1024 * 1024; // 100MB

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "processing" | "ready" | "failed" | null;

  const files = await getContextFilesByUserId({
    userId: user.id,
    status: status ?? undefined,
  });

  const usage = await getUserStorageUsage(user.id);

  return NextResponse.json({
    files,
    usage: {
      used: usage.totalSize,
      capacity: MAX_STORAGE_PER_USER,
      fileCount: usage.fileCount,
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check storage quota
  const usage = await getUserStorageUsage(user.id);
  if (usage.totalSize >= MAX_STORAGE_PER_USER) {
    return NextResponse.json(
      { error: "Storage quota exceeded" },
      { status: 413 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Upload to blob
    const fileBuffer = await file.arrayBuffer();
    const blobData = await put(
      `context-files/${user.id}/${Date.now()}-${file.name}`,
      fileBuffer,
      { access: "public" }
    );

    // Create database record
    const [contextFileRecord] = await createContextFile({
      userId: user.id,
      name: blobData.pathname,
      originalName: file.name,
      blobUrl: blobData.url,
      fileType: file.type,
      fileSize: file.size,
      description: description ?? undefined,
    });

    // Process file asynchronously
    after(() => processContextFile(contextFileRecord.id, blobData.url, file.type));

    return NextResponse.json(contextFileRecord);
  } catch (error) {
    console.error("Context file upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
```

**File**: `app/api/context-files/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { deleteContextFile } from "@/lib/db/queries";
import { db } from "@/lib/db/drizzle";
import { contextFile } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await db
    .select()
    .from(contextFile)
    .where(
      and(
        eq(contextFile.id, params.id),
        eq(contextFile.userId, user.id)
      )
    )
    .limit(1);

  if (file.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(file[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await deleteContextFile({
      id: params.id,
      userId: user.id,
    });

    return NextResponse.json(deleted[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { description, isPinned, tags } = body;

  const updated = await db
    .update(contextFile)
    .set({
      description,
      isPinned,
      tags,
    })
    .where(
      and(
        eq(contextFile.id, params.id),
        eq(contextFile.userId, user.id)
      )
    )
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
```

---

## Part 3: Persistent Custom Context Files

*(See the full plan for details on background processing, context aggregation, UI components, testing, and rollout phases.)*

---

## Future Enhancements

1. **Semantic Search**: Use embeddings to find relevant context instead of including all files
2. **File Versioning**: Track changes to context files over time
3. **Collaborative Context**: Share context files across team workspaces
4. **OCR for Images**: Extract text from image-only PDFs and screenshots
5. **Chunking Strategy**: Smart chunking for very large documents
6. **RAG Integration**: Full retrieval-augmented generation with vector database
7. **File Preview**: In-app preview for PDFs and documents
8. **Batch Upload**: Upload multiple files at once with progress tracking
9. **Export Context**: Download all context files as ZIP
10. **Context Analytics**: Show which files are used most frequently

---

*Last updated: October 12, 2025*
