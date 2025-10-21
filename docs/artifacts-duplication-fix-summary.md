# Artifact Duplication Fix - Summary

## Issue Overview

**Problem**: Some text documents were duplicating when being created, with users seeing multiple similar documents instead of a single updated document.

**Root Cause**: The AI model was calling `createDocument` multiple times in a conversation when it should have been using `updateDocument` to modify existing documents. Each `createDocument` call generates a new UUID, creating entirely separate documents.

## Solution Implemented

### 1. Enhanced System Prompt

**File**: `lib/ai/prompts.ts`

**Changes**:
- Added explicit guidance on when to use `createDocument` vs `updateDocument`
- Included specific trigger phrases that indicate update intent ("make it", "change it", "fix it", etc.)
- Added warnings against creating duplicate documents on similar topics
- Emphasized document ID tracking within conversation context

**Key Additions**:
```
When NOT to use createDocument:
- When a document on the same or similar topic already exists in this conversation
- When the user asks to modify, change, improve, or revise existing content
- When the user says "make it", "change it", "update it", "fix it", or similar phrases

When to use updateDocument:
- When user asks to modify, change, improve, fix, or revise existing content
- When user provides feedback on a document you created
- When user refers to "the document", "it", or "this" (meaning the most recent document)
- ALWAYS use updateDocument for follow-up requests about the same content
```

### 2. Improved Tool Descriptions

**Files**: `lib/ai/tools/create-document.ts` and `lib/ai/tools/update-document.ts`

**createDocument** now says:
> "Create a NEW document for writing or content creation activities. Use this ONLY when starting completely new content that is unrelated to existing documents in this conversation. DO NOT use if user wants to modify existing content - use updateDocument instead."

**updateDocument** now says:
> "Update an EXISTING document that was previously created in this conversation. Use this when user asks to change, modify, improve, fix, or revise existing content. Use this when user says 'make it', 'change it to', 'add', 'remove', etc."

### 3. Test Scenarios

**File**: `tests/prompts/duplication.ts`

Created comprehensive test scenarios covering:
- Modification requests (should use updateDocument)
- New document requests (should use createDocument)
- Edge cases (ambiguous requests)

## Expected Behavior

### BEFORE Fix:
```
User: "Write an essay about AI"
AI: → createDocument(title: "AI Essay") ✓

User: "Change it to be about ML"
AI: → createDocument(title: "ML Essay") ✗ DUPLICATE!
```

### AFTER Fix:
```
User: "Write an essay about AI"
AI: → createDocument(title: "AI Essay") ✓

User: "Change it to be about ML"
AI: → updateDocument(id: <same-id>, description: "change to ML") ✓ UPDATED!
```

## User Experience Impact

**Before**: Users would see multiple similar documents in their conversation, causing confusion about which one to use.

**After**: Users see a single document that evolves based on their feedback, with version history tracked automatically.

## Technical Details

### Database Schema (No Changes)
The database already supports versioning correctly:
- Composite primary key: `(id, createdAt)`
- Multiple versions of same document can exist with different timestamps
- UI displays most recent version by default

### Document Versioning Flow (Working as Designed)
1. `createDocument` → Generates NEW UUID → Creates NEW document
2. `updateDocument` → Uses EXISTING UUID → Creates NEW VERSION of same document
3. Frontend fetches all versions, displays latest: `documents.at(-1)`

### Why This Fix Works

The issue was NOT with the database or versioning system (which work correctly), but with the AI's tool selection logic. By providing:

1. **Clear guidance** in the system prompt
2. **Explicit warnings** in tool descriptions
3. **Specific trigger phrases** to guide decision-making

We help the AI make the correct choice between creating a new document vs updating an existing one.

## Monitoring & Validation

### Metrics to Track
1. **Create/Update Ratio**: Ratio of `updateDocument` to `createDocument` calls per conversation
2. **Duplicate Rate**: Number of similar documents created within 5 minutes
3. **Version Depth**: Average number of versions per document ID
4. **User Feedback**: Issues related to duplicate documents

### Success Criteria
- ✅ Decrease in duplicate document reports
- ✅ Increase in updateDocument usage for modification requests
- ✅ Positive user feedback on document behavior
- ✅ Version history shows proper update chains

## Testing Recommendations

### Manual Testing
1. Create a document about topic X
2. Ask to change it to topic Y
3. Verify same document ID is used (not a new document)

### Automated Testing
Run prompt engineering tests in `tests/prompts/duplication.ts` to verify:
- Modification phrases trigger `updateDocument`
- New document phrases trigger `createDocument`
- Edge cases are handled correctly

### Production Testing
- Monitor logs for createDocument/updateDocument patterns
- A/B test with different prompt variations
- Collect user feedback on document behavior

## Rollback Plan

If the fix causes issues:

1. **Immediate Rollback**: Revert changes to prompts.ts and tool descriptions
   ```bash
   git revert <commit-hash>
   ```

2. **Partial Rollback**: Keep enhanced prompts but revert tool descriptions

3. **Adjust Guidance**: Fine-tune prompt wording based on observed behavior

## Future Enhancements

### Phase 2: Conversation Context Tracking
- Add state management to track active document IDs
- Include document context in system prompt dynamically
- Implement "recently created documents" list

### Phase 3: Advanced Prevention
- Deduplication detection at tool level
- UI warnings for potential duplicates
- Similarity scoring for document titles
- Confirmation prompts for rapid document creation

## Related Documentation

- **Full Analysis**: `/docs/artifacts-duplication-analysis.md`
- **Test Scenarios**: `/tests/prompts/duplication.ts`
- **Database Schema**: `/lib/db/schema.ts` (lines 112-131)
- **Document Queries**: `/lib/db/queries.ts` (lines 449-510)

## Conclusion

This fix addresses the root cause of artifact duplication by improving AI decision-making through:
- ✅ Enhanced prompt guidance
- ✅ Clearer tool descriptions  
- ✅ Documented test scenarios

The solution is backward compatible, requires no database changes, and can be easily adjusted based on production feedback.

**Status**: ✅ Implemented and ready for testing
**Risk**: Low (only prompt changes, easily reversible)
**Impact**: High (significantly improves user experience)
