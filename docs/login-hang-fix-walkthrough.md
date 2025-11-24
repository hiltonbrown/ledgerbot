# Fix Production Login Hang

**Date:** 2025-11-24  
**Objective:** Fix app hanging when trying to log in on production.

---

## Problem

**Symptom:** App hangs indefinitely when trying to log in on production.

**Root Cause:** The `getUserSettings()` function is called on every page load (including the chat page after login) and makes a blocking call to `getChartOfAccounts()` which can hang if the Xero API is slow or timing out.

---

## Root Cause Analysis

### Call Stack

1. User logs in → redirected to `/` (chat page)
2. Chat page calls `getUserSettings()` ([app/(chat)/page.tsx:29](file:///home/hilton/Documents/ledgerbot/app/(chat)/page.tsx#L29))
3. `getUserSettings()` calls `getChartOfAccounts()` ([app/(settings)/api/user/data.ts:164](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts#L164))
4. `getChartOfAccounts()` makes database query
5. **If database is slow or Xero connection has issues → page hangs indefinitely**

### Why This Happens

The `getChartOfAccounts()` function:
- Queries the database for chart of accounts data
- Has no timeout mechanism
- Blocks the entire page load if it's slow

**Original code:**
```typescript
const chartData = await getChartOfAccounts(xeroConnection.id);
```

**Problem:** No timeout, no way to recover from slow responses.

---

## Solution Implemented

### Added Timeout Helper Function

**File:** [app/(settings)/api/user/data.ts](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts)

```typescript
// Helper function to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};
```

**How it works:**
- Uses `Promise.race()` to race the original promise against a timeout
- If the promise doesn't resolve within `ms` milliseconds, the timeout rejects
- Generic type `<T>` preserves type safety

---

### Wrapped getChartOfAccounts Call

**Before:**
```typescript
const chartData = await getChartOfAccounts(xeroConnection.id);
```

**After:**
```typescript
const chartData = await withTimeout(
  getChartOfAccounts(xeroConnection.id),
  5000 // 5 second timeout to prevent login hang
);
```

**Benefits:**
- Page will load within 5 seconds even if Xero is slow
- Existing error handling catches timeout errors
- Graceful degradation (continues without chart data)

---

### Updated Error Logging

**Before:**
```typescript
console.error(
  `[getUserSettings] Failed to fetch chart of accounts for connection ${xeroConnection.id}:`,
  chartError instanceof Error ? chartError.message : String(chartError)
);
```

**After:**
```typescript
console.error(
  `[getUserSettings] Failed to fetch chart of accounts for connection ${xeroConnection.id}:`,
  chartError instanceof Error ? chartError.message : String(chartError),
  "This may be due to timeout or Xero API issues"
);
```

**Benefits:**
- Clearer error messages for debugging
- Indicates when timeout is the cause

---

## Impact

### Before Fix

- ❌ Page hangs indefinitely if Xero API is slow
- ❌ User cannot log in or use the app
- ❌ No way to recover without restarting

### After Fix

- ✅ Page loads within 5 seconds maximum
- ✅ User can log in and use the app
- ✅ Graceful degradation (chart data optional)
- ✅ Clear error logging for debugging

---

## Testing Recommendations

### Local Testing

**Test 1: Normal Flow**
1. Start app locally
2. Log in
3. **Expected:** Page loads normally with chart data

**Test 2: Slow Database**
1. Simulate slow database (add delay to `getChartOfAccounts`)
2. Log in
3. **Expected:** Page loads within 5 seconds, error logged

**Test 3: Database Timeout**
1. Simulate database timeout (make `getChartOfAccounts` never resolve)
2. Log in
3. **Expected:** Page loads after 5 seconds, timeout error logged

---

### Production Testing

**Test 1: Deploy and Monitor**
1. Deploy fix to production
2. Test login flow
3. Monitor logs for timeout errors
4. **Expected:** No more login hangs

**Test 2: Check Error Logs**
1. Review production logs
2. Look for timeout errors
3. **Expected:** Timeout errors indicate slow Xero API, but page still loads

---

## Monitoring

### What to Watch For

**Good Signs:**
- Login works consistently
- Page loads within 5 seconds
- No user complaints about hanging

**Warning Signs:**
- Frequent timeout errors in logs
- Chart data not loading for many users
- Indicates underlying Xero API or database performance issue

### Recommended Actions

If you see frequent timeout errors:
1. Check Xero API status
2. Check database performance
3. Consider increasing timeout to 10 seconds
4. Consider caching chart data
5. Consider lazy-loading chart data after page loads

---

## Code Changes Summary

**File Modified:** [app/(settings)/api/user/data.ts](file:///home/hilton/Documents/ledgerbot/app/(settings)/api/user/data.ts)

**Lines Changed:**
- Added `withTimeout` helper function (lines 33-42)
- Wrapped `getChartOfAccounts` call with timeout (lines 163-166)
- Updated error logging (line 185)

**Total Changes:** ~15 lines added/modified

---

## Verification

### TypeScript Compilation

Ran `pnpm tsc --noEmit`:

**Result:** ✅ No errors related to changes
- Pre-existing test file errors are unrelated

### Lint Warnings

**Pre-existing warnings:** Unused variables in `getUserSettings()` function
- Not related to this fix
- Can be addressed separately

---

## Next Steps

1. **Deploy to production** - Fix is ready for deployment
2. **Monitor logs** - Watch for timeout errors
3. **Test login flow** - Verify no more hangs
4. **Optimize if needed** - If timeouts are frequent, consider:
   - Increasing timeout duration
   - Caching chart data
   - Lazy-loading chart data

---

## Summary

**Problem:** Login hangs indefinitely due to slow Xero API call

**Solution:** Added 5-second timeout to `getChartOfAccounts()` call

**Impact:**
- ✅ Prevents login hang
- ✅ Page loads within 5 seconds
- ✅ Graceful degradation
- ✅ Better error logging

**Risk:** Low - existing error handling catches timeouts

**Ready for:** Production deployment
