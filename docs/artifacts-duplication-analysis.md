# Artifact Duplication Analysis

## Executive Summary

Text documents may become duplicated in a conversation when the AI model incorrectly calls `createDocument` multiple times instead of using `updateDocument` to modify an existing document. This creates entirely separate documents with different IDs rather than new versions of the same document.

## Background: Document Versioning vs Document Duplication

The system has two distinct concepts that must not be confused:

### 1. Document Versioning (By Design - Working Correctly)
- **Database Schema**: The `document` table uses a composite primary key `(id, createdAt)`
- **Purpose**: Store multiple versions of the same document over time
- **Behavior**: When saving document changes, a new row is inserted with the same `id` but a new `createdAt` timestamp
- **Display**: The UI shows only the most recent version (`documents.at(-1)` in artifact.tsx:115)
- **Navigation**: Users can view version history through the version footer component

### 2. Document Duplication (Bug - Needs Fixing)
- **Root Cause**: AI model calls `createDocument` multiple times in the same conversation
- **Behavior**: Each call generates a new UUID, creating completely separate documents
- **Impact**: Users see multiple distinct documents instead of one document with multiple versions
- **Example**: User asks to "write an essay about X", then "make it about Y" → AI creates two separate essays

## How Document Creation Works

### createDocument Tool Flow

```typescript
// lib/ai/tools/create-document.ts
export const createDocument = ({ user, dataStream }) =>
  tool({
    description: "Create a document for a writing or content creation activities...",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      // 1. Generate a NEW UUID for this document
      const id = generateUUID();
      
      // 2. Stream document metadata to client
      dataStream.write({ type: "data-id", data: id });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-kind", data: kind });
      
      // 3. Generate content using appropriate handler
      await documentHandler.onCreateDocument({ id, title, dataStream, user });
      
      // 4. Save document to database
      // This happens in createDocumentHandler (lib/artifacts/server.ts:55)
      await saveDocument({ id, title, content, kind, userId });
      
      return { id, title, kind, content: "A document was created..." };
    },
  });
```

### updateDocument Tool Flow

```typescript
// lib/ai/tools/update-document.ts
export const updateDocument = ({ user, dataStream }) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z.string().describe("The description of changes..."),
    }),
    execute: async ({ id, description }) => {
      // 1. Fetch existing document by ID
      const document = await getDocumentById({ id });
      
      // 2. Generate updated content
      await documentHandler.onUpdateDocument({ document, description, dataStream, user });
      
      // 3. Save new version with SAME id but new createdAt
      await saveDocument({ id, title, content, kind, userId });
      
      return { id, title, kind, content: "The document has been updated..." };
    },
  });
```

## When Duplication Occurs

### Scenario 1: Ambiguous User Intent
**User Message**: "Actually, make it about Y instead"
**AI Interpretation**: 
- ❌ Wrong: "Create a new document about Y" → calls `createDocument`
- ✅ Correct: "Update the existing document" → calls `updateDocument`

### Scenario 2: Prompt Weakness
**Current System Prompt** (lib/ai/prompts.ts):
```
**When to use `createDocument`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use `createDocument`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat
```

**Missing Guidance**:
- No explicit instruction to use `updateDocument` for modifications
- No guidance about tracking active documents in conversation
- No examples of when to update vs create

### Scenario 3: Conversation Context Loss
- AI loses track of previously created documents
- Treats each message as independent
- Creates new documents when updates would be appropriate

### Scenario 4: Model-Specific Behavior
- Some models are more prone to over-using `createDocument`
- Reasoning models may interpret requests differently
- Temperature and other parameters affect tool selection

## Evidence in Codebase

### 1. Prompt Explicitly Warns Against Premature Updates
```typescript
// lib/ai/prompts.ts:10
DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. 
WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.
```
This suggests the model has historically been too eager to update, but provides no guidance on when creation is inappropriate.

### 2. Tool Descriptions Are Brief
```typescript
// create-document.ts:18-19
description: "Create a document for a writing or content creation activities. 
This tool will call other functions that will generate the contents..."

// update-document.ts:15
description: "Update a document with the given description."
```
These don't provide context about when each tool is appropriate.

### 3. No Conversation State Tracking
The tools don't maintain state about which documents were created in the current conversation, making it harder for the AI to know when to update vs create.

## Root Causes

1. **Insufficient System Prompt Guidance**
   - Doesn't explicitly state when to use `updateDocument` vs `createDocument`
   - Lacks examples of appropriate update scenarios
   - Doesn't explain the document ID concept

2. **Tool Description Ambiguity**
   - `createDocument` description doesn't warn against creating duplicates
   - `updateDocument` description doesn't clarify it's for existing documents
   - No cross-reference between the two tools

3. **No Prevention Mechanism**
   - No validation to detect if similar document was just created
   - No confirmation before creating multiple documents rapidly
   - No deduplication at database or application level

4. **AI Model Limitations**
   - Context window limitations may cause it to "forget" recent documents
   - Tool selection algorithms may favor creation over updates
   - Model training may not emphasize update-over-create patterns

## Recommended Solutions

### Solution 1: Enhanced System Prompt (High Impact, Low Effort)

Add explicit guidance to `artifactsPrompt` in `lib/ai/prompts.ts`:

```typescript
**When to use `createDocument`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a NEW document
- When the user wants to create something different from existing documents
- For when content contains a single code snippet

**When NOT to use `createDocument`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat
- When a document on the same topic already exists in this conversation
- When the user asks to modify, change, or improve existing content

**Using `updateDocument`:**
- Use updateDocument to modify existing documents created in this conversation
- Use updateDocument when user says "change", "update", "modify", "improve", "fix", "revise", etc.
- Use updateDocument when user provides feedback on existing content
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**Document ID Management:**
- Track which documents you've created in this conversation
- When user refers to "the document", "it", or "this", they mean the most recently created document
- Always use updateDocument for follow-up requests about the same content
- Only create a new document if the user explicitly wants something separate
```

### Solution 2: Improved Tool Descriptions (Medium Impact, Low Effort)

Update tool descriptions to be more explicit:

```typescript
// create-document.ts
description: `Create a NEW document for writing or content creation activities. 
Use this ONLY when:
- Starting a completely new document
- User explicitly asks for a "new" document
- Creating content unrelated to existing documents
DO NOT use if user wants to modify an existing document - use updateDocument instead.`

// update-document.ts
description: `Update an EXISTING document that was previously created in this conversation.
Use this when:
- User asks to change, modify, improve, or fix existing content
- User provides feedback on a document you created
- User says "make it...", "change it to...", "add...", "remove...", etc.
This preserves the document ID and creates a new version.`
```

### Solution 3: Add Document Context to Messages (High Impact, Medium Effort)

Track created documents in the conversation context:

```typescript
// In chat route, maintain active document IDs
const conversationState = {
  activeDocumentId: null,
  createdDocuments: []
};

// After createDocument is called
conversationState.activeDocumentId = result.id;
conversationState.createdDocuments.push({ id: result.id, title, kind });

// Add to system prompt dynamically
if (conversationState.activeDocumentId) {
  systemPrompt += `\n\nActive document in this conversation: ID=${conversationState.activeDocumentId}, Title="${conversationState.createdDocuments.slice(-1)[0].title}". Use updateDocument to modify this document.`;
}
```

### Solution 4: Implement Deduplication Detection (Low Impact, High Effort)

Add validation to detect potential duplicates:

```typescript
// In create-document.ts execute function
const recentDocuments = await getRecentDocumentsByUser(user.id, 5);
const similarTitles = recentDocuments.filter(doc => 
  levenshteinDistance(doc.title, title) < 5
);

if (similarTitles.length > 0 && Date.now() - similarTitles[0].createdAt < 60000) {
  // Warn or prevent duplicate creation
  return {
    error: `A similar document "${similarTitles[0].title}" was just created. Use updateDocument to modify it instead.`
  };
}
```

### Solution 5: UI-Level Deduplication (Medium Impact, Medium Effort)

Show warnings in the UI when duplicates are detected:

```typescript
// In document-preview.tsx or artifact.tsx
const detectDuplicates = (documents: Document[]) => {
  const groups = groupBy(documents, doc => 
    doc.title.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  return Object.values(groups).filter(g => g.length > 1);
};

// Display warning
{duplicates.length > 0 && (
  <Alert>
    Multiple similar documents detected. Consider using one document with updates instead.
  </Alert>
)}
```

## Recommended Implementation Order

1. **Phase 1 - Quick Wins (Week 1)**
   - ✅ Update system prompt with clear guidance (Solution 1)
   - ✅ Enhance tool descriptions (Solution 2)
   - ✅ Add tests to verify prompt behavior

2. **Phase 2 - Conversation Context (Week 2-3)**
   - Add document tracking to conversation state (Solution 3)
   - Update chat route to maintain active document ID
   - Test with various conversation patterns

3. **Phase 3 - Advanced Features (Week 4-5)**
   - Implement deduplication detection if needed (Solution 4)
   - Add UI warnings for duplicates (Solution 5)
   - Monitor metrics to measure improvement

## Testing Strategy

### Unit Tests
- Test that system prompt includes new guidance
- Verify tool descriptions are updated
- Check conversation state tracking

### Integration Tests
- Test createDocument followed by update request
- Verify updateDocument is used for modifications
- Test edge cases (multiple documents, different types)

### E2E Tests
```typescript
test("Should update document instead of creating duplicate", async () => {
  await chatPage.sendUserMessage("Write an essay about AI");
  await artifactPage.isGenerationComplete();
  
  const firstDocId = await artifactPage.getDocumentId();
  
  await chatPage.sendUserMessage("Change it to be about ML instead");
  await artifactPage.isGenerationComplete();
  
  const secondDocId = await artifactPage.getDocumentId();
  
  expect(secondDocId).toBe(firstDocId); // Same document, updated
});
```

### Prompt Engineering Tests
```typescript
// tests/prompts/duplication.ts
test("AI should use updateDocument for modification requests", async () => {
  const conversation = [
    { role: "user", content: "Write a document about quantum computing" },
    { role: "assistant", toolCalls: [{ name: "createDocument", args: { title: "Quantum Computing" } }] },
    { role: "user", content: "Make it more technical" }
  ];
  
  const response = await runPromptTest(conversation);
  
  expect(response.toolCalls[0].name).toBe("updateDocument");
  expect(response.toolCalls[0].args.id).toBe(previousDocumentId);
});
```

## Monitoring and Metrics

Track these metrics to measure success:

1. **Duplication Rate**: Number of documents created per conversation
2. **Update Rate**: Ratio of updateDocument to createDocument calls
3. **User Feedback**: Track issues related to duplicate documents
4. **Tool Call Patterns**: Analyze sequences of createDocument calls

## Conclusion

Artifact duplication is caused by the AI model calling `createDocument` when it should use `updateDocument`. The solution requires:

1. **Clear prompt guidance** on when to create vs update
2. **Better tool descriptions** that explain the difference
3. **Conversation context** to track active documents
4. **Optional safeguards** to detect and prevent duplicates

The versioning system (composite primary key) is working as designed and should not be changed. The focus should be on guiding the AI to make better tool selection decisions.
