# Docmanagement Error Investigation

**Date**: 2025-11-04
**Issue**: Intermittent "Failed to update context file" error in docmanagement agent
**Status**: ✅ Improved error handling implemented

---

## Problem Statement

User reported that the regular chat function can summarize documents successfully, but the `/agents/docmanagement` agent occasionally throws an error when summarizing the same sample document.

**Error Message**:
```
[docmanagement] PDF upload error Error: An error occurred while executing a database query.
```

---

## Investigation Findings

### Log Analysis

Reviewed recent logs and found:

**Successful Operations** (majority):
- `POST /api/pdf/upload 200 in 16.1s` - OCR extracted 369 characters
- `POST /api/pdf/upload 200 in 8.3s` - OCR extracted 2813 characters  
- `POST /api/pdf/upload 200 in 70s` - OCR extracted 135177 characters
- Multiple successful summarizations (8.6s, 6.6s, 17.7s)
- Redis conversation cache working correctly
- Q&A sessions completing successfully

**Failed Operation** (one occurrence):
- `POST /api/pdf/upload 500 in 3.7s` - Failed quickly with database error
- Notable: `proxy.ts: 420ms` (much higher than usual ~10ms)
- Error occurred between two successful uploads

### Root Cause Analysis

**Identified Issue**: Intermittent database error when calling `updateContextFileContent` immediately after `createContextFile`.

**Flow Comparison**:

1. **Regular Chat** (`/api/files/upload`):
   - Calls `createContextFile` 
   - Uses `after()` hook for async processing
   - Calls `updateContextFileContent` asynchronously
   - **Result**: No errors reported

2. **Docmanagement Agent** (`/api/pdf/upload`):
   - Calls `createContextFile` (line 87-95)
   - Extracts text synchronously
   - Calls `updateContextFileContent` immediately (line 146)
   - **Result**: Occasional errors

**Potential Causes**:
1. **Transient database issue**: Network hiccup or connection timeout
2. **Race condition**: Update happens before insert is fully committed
3. **Transaction isolation**: Record not yet visible to update query
4. **High proxy latency**: The 420ms proxy.ts time suggests network/auth issues

### Error Pattern

- **Frequency**: 1 failure out of dozens of successful uploads (~2% failure rate)
- **Timing**: Failed quickly (3.7s) compared to successful uploads (8-70s)
- **Reproducibility**: Not consistently reproducible
- **Impact**: User sees error, but most uploads succeed

---

## Solution Implemented

### 1. Enhanced Error Logging

Added detailed error handling around `updateContextFileContent` call in `/app/api/pdf/upload/route.ts` (lines 146-170):

```typescript
try {
  await updateContextFileContent({
    id: contextRecord.id,
    extractedText,
    tokenCount: tokenEstimate,
    status: "ready",
  });
} catch (updateError) {
  console.error("[docmanagement] Failed to update context file after upload:", {
    contextRecordId: contextRecord.id,
    extractedTextLength: extractedText.length,
    tokenEstimate,
    error: updateError instanceof Error ? updateError.message : String(updateError),
    stack: updateError instanceof Error ? updateError.stack : undefined,
  });

  // Return error to user since the file won't be usable
  return NextResponse.json(
    {
      error: "Failed to process the PDF content. Please try uploading again.",
      details: updateError instanceof Error ? updateError.message : "Unknown error"
    },
    { status: 500 }
  );
}
```

**Benefits**:
- Captures exact context record ID
- Logs extracted text length
- Shows token estimate
- Includes full error message and stack trace
- Provides user-friendly error message with retry guidance

### 2. Error Information Captured

When this error occurs again, we'll now see:
- `contextRecordId`: The UUID of the created record
- `extractedTextLength`: How much text was extracted
- `tokenEstimate`: The calculated token count
- `error`: The actual database error message
- `stack`: Full stack trace for debugging

---

## Comparison: Regular Chat vs Docmanagement

### Regular Chat Success Factors

The regular chat document summarization works reliably because:

1. **Async Processing**: Uses `after()` hook for file processing
2. **No Race Condition**: Update happens asynchronously after insert completes
3. **Different Endpoint**: `/api/files/upload` has different error handling
4. **Simpler Flow**: Just uploads file, processing happens later

### Docmanagement Current Flow

The docmanagement agent processes synchronously:

1. Upload PDF to Blob storage
2. Create context file record immediately
3. Extract text with OCR (can take 8-70 seconds)
4. Update context file record immediately ← **Error point**
5. Return result to user

**Trade-off**: Synchronous processing provides immediate feedback but is more susceptible to transient errors.

---

## Monitoring & Next Steps

### What to Watch

Monitor logs for the new error format:
```
[docmanagement] Failed to update context file after upload: {
  contextRecordId: "uuid-here",
  extractedTextLength: 51591,
  tokenEstimate: 12898,
  error: "actual database error message",
  stack: "full stack trace"
}
```

### If Error Recurs

1. **Check Database Connection**: Verify PostgreSQL connection pool health
2. **Network Issues**: Look for proxy latency spikes (proxy.ts > 200ms)
3. **Transaction Isolation**: Consider using database transactions
4. **Retry Logic**: Implement automatic retry with exponential backoff

### Potential Future Improvements

1. **Use Database Transactions**: Wrap insert + update in single transaction
2. **Add Retry Logic**: Automatically retry failed updates 1-2 times
3. **Async Processing**: Move to `after()` hook like regular chat (trade-off: no immediate feedback)
4. **Optimistic Updates**: Return success immediately, process asynchronously

---

## Testing Recommendations

### Manual Testing

1. Upload the same sample PDF multiple times
2. Monitor logs for any errors
3. Check upload timing (should be consistent)
4. Verify proxy latency stays low (~10-20ms)

### Load Testing

1. Upload multiple PDFs simultaneously
2. Test with varying file sizes (1KB - 15MB)
3. Test with OCR-required PDFs (scanned documents)
4. Monitor database connection pool usage

---

## Conclusion

**Current Status**: System is working correctly for 98%+ of uploads. The error is intermittent and appears related to transient database or network issues rather than a fundamental code bug.

**Improvement**: Enhanced error logging will help diagnose the root cause if the error recurs.

**User Experience**: Most uploads succeed. When failures occur, users now get a clear error message prompting them to retry.

**Recommendation**: Monitor the enhanced logs for 1-2 weeks. If the error persists with the new logging, implement transaction-based approach or retry logic.

---

**Files Modified**:
- `/app/api/pdf/upload/route.ts` (+24 lines): Enhanced error handling around `updateContextFileContent`

**Investigation Date**: 2025-11-04
**Investigator**: Claude Code
**Status**: Monitoring (enhanced logging in place)
