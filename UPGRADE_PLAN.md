# LedgerBot Package Upgrade Plan
**Date:** October 26, 2025  
**Current Status:** Planning Phase

## Executive Summary

This document provides a comprehensive upgrade plan for updating LedgerBot's dependencies from their current versions to the latest stable releases. The plan is organized by priority and includes detailed migration steps, breaking changes, and testing requirements.

---

## 🎯 Upgrade Overview

### Critical Statistics
- **Total Packages to Update:** 12 major packages
- **Major Version Updates:** 3 (Next.js, Zod, React)
- **Estimated Time:** 3-5 days
- **Risk Level:** Medium-High

### Version Comparison Table

| Package | Current | Latest | Change Type | Priority |
|---------|---------|--------|-------------|----------|
| **next** | 15.4.7 | 16.0.0 | Major | 🔴 High |
| **react** | 19.0.0-rc | 19.2.0 | Stable | 🔴 High |
| **react-dom** | 19.0.0-rc | 19.2.0 | Stable | 🔴 High |
| **ai** | 5.0.26 | 5.0.79 | Minor | 🔴 High |
| **@ai-sdk/react** | 2.0.26 | Latest | Minor | 🔴 High |
| **drizzle-orm** | 0.34.0 | 0.44.7 | Minor | 🟡 Medium |
| **drizzle-kit** | 0.25.0 | 0.31.5 | Minor | 🟡 Medium |
| **typescript** | 5.6.3 | 5.9.3 | Minor | 🟡 Medium |
| **zod** | 3.25.76 | 4.1.12 | Major | 🟡 Medium |
| **@clerk/nextjs** | 6.33.2 | 6.34.0 | Patch | 🟢 Low |
| **tailwindcss** | 4.1.13 | 4.1.16 | Patch | 🟢 Low |

---

## 📋 Phase 1: React 19 Stable Release (Priority: HIGH)

### Current State
- Using React 19.0.0-rc (Release Candidate)
- React-DOM 19.0.0-rc

### Target State
- React 19.2.0 (Stable)
- React-DOM 19.2.0 (Stable)

### Breaking Changes
1. **No Breaking Changes from RC to Stable** - The React team ensured RC → Stable is compatible

### New Features Available
- **View Transitions** - Animate elements during transitions/navigation
- **useEffectEvent** - Extract non-reactive logic from Effects
- **Activity Component** - Render background activity with `display: none`
- **useActionState** (formerly useFormState) - Renamed API
- **Improved Error Handling** - Better error boundaries and reporting

### Migration Steps

```bash
# Step 1: Update React packages
npm install react@19.2.0 react-dom@19.2.0

# Step 2: Verify no breaking changes
npm run build
npm run test
```

### Testing Checklist
- [ ] All pages render correctly
- [ ] Form submissions work (Actions/Server Actions)
- [ ] Client-side routing functions properly
- [ ] Error boundaries catch errors correctly
- [ ] SSR/Hydration works without mismatches

### Risk Assessment
**Risk Level:** 🟢 Low  
**Reasoning:** Moving from RC to stable is typically safe; the RC was well-tested.

---

## 📋 Phase 2: AI SDK 5.0.79 Update (Priority: HIGH)

### Current State
- AI SDK: 5.0.26
- @ai-sdk/react: 2.0.26
- 53 versions behind latest

### Target State
- AI SDK: 5.0.79
- @ai-sdk/react: Latest compatible version

### Breaking Changes (v4 → v5 Reference)
⚠️ **Note:** You're already on v5, so these are for reference only:

1. **Tool Call Properties Renamed**
   - `args` → `input`
   - `result` → `output`

2. **Stream Type Renames**
   - `reasoning` → `reasoning-delta`
   - `DataStreamToSSETransformStream` → `JsonToSseTransformStream`

3. **Package Reorganization**
   - `ai/react` → `@ai-sdk/react`
   - `LanguageModelV3` moved to `@ai-sdk/provider`

4. **Tool UI Part States** - More granular states for better streaming lifecycle representation

### Migration Steps

```bash
# Step 1: Update AI SDK packages
npm install ai@5.0.79 @ai-sdk/react@latest

# Step 2: Run AI SDK codemods (if any new changes)
npx @ai-sdk/codemod upgrade

# Step 3: Test all AI-powered features
npm run build
npm run test
```

### Code Review Checklist
Since you're already on v5, check for:
- [ ] Tool call property names (should be `input`/`output`)
- [ ] Stream handling uses correct type names
- [ ] Import paths from correct packages
- [ ] Error handling for tool invocations

### Testing Checklist
- [ ] Chat functionality works
- [ ] Streaming responses render correctly
- [ ] Tool/function calling works properly
- [ ] Artifact generation functions
- [ ] Message streaming and chunking
- [ ] MCP (Model Context Protocol) integration

### Risk Assessment
**Risk Level:** 🟡 Medium  
**Reasoning:** Minor version updates with bug fixes; already on v5 architecture.

---

## 📋 Phase 3: Next.js 16.0 Upgrade (Priority: HIGH - EVALUATE FIRST)

### ⚠️ CRITICAL: Major Version with Breaking Changes

### Current State
- Next.js 15.4.7

### Target State
- Next.js 16.0.0

### Major Breaking Changes

#### 1. **Version Requirements**
- Node.js: 18.x → **20.9+** (MUST UPGRADE)
- TypeScript: 5.1+ → **5.1+** (Current 5.6.3 ✅)
- Browsers: Updated minimum versions

#### 2. **Async Parameters (BREAKING)**
```typescript
// ❌ OLD (Next.js 15)
export default function Page({ params, searchParams }) {
  const slug = params.slug;
  const query = searchParams.q;
}

// ✅ NEW (Next.js 16) - MUST USE ASYNC
export default async function Page({ params, searchParams }) {
  const { slug } = await params;
  const { q: query } = await searchParams;
}
```

#### 3. **Async Request APIs (BREAKING)**
```typescript
// ❌ OLD (Next.js 15)
import { cookies, headers, draftMode } from 'next/headers';

const cookieStore = cookies();
const headersList = headers();
const draft = draftMode();

// ✅ NEW (Next.js 16) - MUST USE ASYNC/AWAIT
import { cookies, headers, draftMode } from 'next/headers';

const cookieStore = await cookies();
const headersList = await headers();
const draft = await draftMode();
```

#### 4. **Middleware → Proxy (BREAKING)**
```bash
# Rename file
mv middleware.ts proxy.ts
```

```typescript
// ❌ OLD
export function middleware(request: NextRequest) {
  // logic
}

// ✅ NEW
export function proxy(request: NextRequest) {
  // logic - same implementation
}
```

#### 5. **Cache Components (New Model)**
```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,  // New caching model
};

// REMOVED:
// experimental.ppr
// experimental.dynamicIO
```

#### 6. **Image Configuration Changes**
```typescript
// next.config.ts
const nextConfig = {
  images: {
    // CHANGED: minimumCacheTTL default: 60s → 14400s (4 hours)
    // CHANGED: imageSizes default: removed 16px
    // CHANGED: qualities default: [1..100] → [75]
    // NEW: dangerouslyAllowLocalIP (default false)
    // NEW: maximumRedirects (default 3, was unlimited)
    
    // For local images with query strings:
    localPatterns: [
      {
        pathname: '/assets/**',
        search: '?v=1',
      },
    ],
  },
};
```

#### 7. **Removals**
- ❌ AMP support (all APIs removed)
- ❌ `next lint` command (use ESLint directly)
- ❌ `serverRuntimeConfig`, `publicRuntimeConfig`
- ❌ `next/legacy/image` component
- ❌ `images.domains` (use `images.remotePatterns`)
- ❌ `unstable_rootParams()`

#### 8. **Default Bundler Change**
- **Turbopack is now default** (2-5x faster builds)
- Opt-out: `next build --webpack`

#### 9. **Improved Caching APIs**
```typescript
// NEW: updateTag() for Server Actions
'use server';
import { updateTag } from 'next/cache';

export async function updateUserProfile(userId: string, profile: Profile) {
  await db.users.update(userId, profile);
  updateTag(`user-${userId}`); // Immediate refresh
}

// CHANGED: revalidateTag() now requires cacheLife profile
import { revalidateTag } from 'next/cache';

// ❌ OLD
revalidateTag('blog-posts');

// ✅ NEW
revalidateTag('blog-posts', 'max'); // Stale-while-revalidate

// NEW: refresh() for uncached data
import { refresh } from 'next/cache';

export async function markNotificationAsRead(id: string) {
  await db.notifications.markAsRead(id);
  refresh(); // Refresh uncached data only
}
```

### Migration Steps

```bash
# Step 0: BACKUP YOUR CODE
git checkout -b upgrade-nextjs-16
git commit -am "Pre-upgrade checkpoint"

# Step 1: Check Node.js version
node --version  # Must be 20.9+

# Step 2: Run automated codemod
npx @next/codemod@canary upgrade latest

# Step 3: Manual fixes (codemod may not catch everything)
# - Convert all params/searchParams to async
# - Convert cookies()/headers()/draftMode() to async
# - Rename middleware.ts to proxy.ts
# - Update cache configuration

# Step 4: Update image config if needed
# - Add localPatterns if using query strings
# - Restore imageSizes: [16, ...] if needed
# - Restore qualities: [50, 75, 100] if needed

# Step 5: Install Next.js 16
npm install next@16.0.0

# Step 6: Build and test
npm run build
npm run dev

# Step 7: Fix any remaining issues
# Check terminal output for deprecation warnings
```

### Testing Checklist
- [ ] All pages build successfully
- [ ] Dynamic routes work (`params` are async)
- [ ] API routes function correctly
- [ ] Server Actions work (updateTag, revalidateTag)
- [ ] Middleware/Proxy redirects properly
- [ ] Images load correctly (check query strings)
- [ ] Form submissions work
- [ ] Authentication (Clerk) functions
- [ ] Database queries (Drizzle) execute
- [ ] Caching behavior is correct
- [ ] No hydration errors
- [ ] Performance is maintained or improved

### Risk Assessment
**Risk Level:** 🔴 High  
**Reasoning:** Major version with many breaking changes; requires careful testing.

### Rollback Plan
```bash
# If issues arise:
git checkout main
npm install  # Restore original package-lock.json
```

---

## 📋 Phase 4: Zod v4 Upgrade (Priority: MEDIUM - EVALUATE)

### ⚠️ MAJOR VERSION CHANGE

### Current State
- Zod 3.25.76

### Target State
- Zod 4.1.12

### Breaking Changes (v3 → v4)

Based on the release notes, Zod v4 includes:

1. **Type System Improvements**
   - Better type inference
   - More accurate error messages

2. **Validation Changes**
   - Enhanced regex validation
   - Better CIDR validation
   - Improved coercion behavior

3. **Error Handling**
   - `flatten()` crash fix for 'toString' key
   - More consistent error structures

4. **New Features**
   - Better JSON Schema conversion (`toJSONSchema`)
   - Enhanced metadata support
   - Improved codec system

### Migration Steps

```bash
# Step 1: Check Zod usage in codebase
grep -r "import.*zod" . --include="*.ts" --include="*.tsx"

# Step 2: Update Zod
npm install zod@4.1.12

# Step 3: Run tests
npm run test

# Step 4: Fix any type errors
npm run build

# Step 5: Test form validation
# Verify all schemas still work correctly
```

### Code Review Areas
- [ ] Form validation schemas
- [ ] API request/response validation
- [ ] Environment variable schemas
- [ ] Configuration validation
- [ ] Database schema validation (if using Zod with Drizzle)

### Testing Checklist
- [ ] All forms validate correctly
- [ ] API endpoints validate input/output
- [ ] Error messages are user-friendly
- [ ] Type inference works in IDE
- [ ] No runtime validation failures

### Risk Assessment
**Risk Level:** 🟡 Medium  
**Reasoning:** Major version but largely backward compatible; mainly improvements.

---

## 📋 Phase 5: Drizzle ORM Update (Priority: MEDIUM)

### Current State
- drizzle-orm: 0.34.0
- drizzle-kit: 0.25.0

### Target State
- drizzle-orm: 0.44.7 (10 minor versions ahead)
- drizzle-kit: 0.31.5 (6 minor versions ahead)

### Notable Changes (0.34 → 0.44)
- Performance improvements
- Bug fixes for schema generation
- Enhanced TypeScript support
- Better migration handling
- Improved query builder

### Migration Steps

```bash
# Step 1: Backup database (IMPORTANT!)
# Create a database backup before proceeding

# Step 2: Update Drizzle packages
npm install drizzle-orm@0.44.7 drizzle-kit@0.31.5

# Step 3: Generate new migration (if schema changes)
npm run db:generate

# Step 4: Review migration files
# Check ./drizzle folder for new migrations

# Step 5: Test migrations in development
npm run db:migrate

# Step 6: Run application
npm run dev

# Step 7: Test database operations
npm run test
```

### Testing Checklist
- [ ] All database queries work
- [ ] Migrations apply successfully
- [ ] Relations load correctly
- [ ] Transactions function properly
- [ ] Type inference works
- [ ] No SQL syntax errors
- [ ] Studio (drizzle-kit studio) works

### Risk Assessment
**Risk Level:** 🟡 Medium  
**Reasoning:** Multiple minor versions; mostly non-breaking changes.

---

## 📋 Phase 6: TypeScript 5.9.3 Update (Priority: MEDIUM)

### Current State
- TypeScript 5.6.3

### Target State
- TypeScript 5.9.3

### Notable Changes
- Bug fixes
- Performance improvements
- Better type inference
- Updated type checking

### Migration Steps

```bash
# Step 1: Update TypeScript
npm install typescript@5.9.3

# Step 2: Clean build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Step 3: Rebuild
npm run build

# Step 4: Check for type errors
npx tsc --noEmit
```

### Testing Checklist
- [ ] No new type errors
- [ ] IDE autocompletion works
- [ ] Build succeeds
- [ ] All tests pass

### Risk Assessment
**Risk Level:** 🟢 Low  
**Reasoning:** Minor version update with backward compatibility.

---

## 📋 Phase 7: Minor Updates (Priority: LOW)

### Clerk, Tailwind CSS, and Other Patches

```bash
# Update all minor/patch packages
npm install @clerk/nextjs@6.34.0 tailwindcss@4.1.16

# Update other patch versions
npm update
```

### Testing Checklist
- [ ] Authentication works (Clerk)
- [ ] Styling is unchanged (Tailwind)
- [ ] No visual regressions
- [ ] UI components render correctly

### Risk Assessment
**Risk Level:** 🟢 Low  
**Reasoning:** Patch and minor updates; minimal risk.

---

## 🎯 Recommended Execution Order

### Option A: Conservative (Recommended)
1. **Phase 1:** React 19 Stable (1 day)
2. **Phase 2:** AI SDK 5.0.79 (1 day)
3. **Phase 6:** TypeScript 5.9.3 (0.5 days)
4. **Phase 5:** Drizzle ORM (0.5 days)
5. **Phase 7:** Minor updates (0.5 days)
6. **Phase 4:** Zod v4 - EVALUATE (1 day)
7. **Phase 3:** Next.js 16 - EVALUATE (2-3 days)

**Total Time:** 6-7 days

### Option B: Aggressive
1. All at once with comprehensive testing
2. **Not Recommended** due to multiple major version changes

---

## 🧪 Testing Strategy

### Pre-Upgrade Testing
```bash
# Ensure all current tests pass
npm run test
npm run build
npm run dev

# Manual testing checklist
- [ ] Authentication flow
- [ ] Chat functionality
- [ ] Artifact generation
- [ ] Form submissions
- [ ] Database operations
- [ ] API routes
```

### Post-Upgrade Testing
```bash
# After each phase
npm run test
npm run build
npm run dev

# Regression testing
- [ ] All features from pre-upgrade work
- [ ] No console errors
- [ ] No hydration mismatches
- [ ] Performance is maintained
```

### Automated Testing
```bash
# Run Playwright tests
npm run test

# Check for build warnings
npm run build 2>&1 | grep -i "warn"

# Check for deprecation notices
npm run dev 2>&1 | grep -i "deprecat"
```

---

## 📊 Risk Matrix

| Phase | Risk | Impact | Effort | Dependencies |
|-------|------|--------|--------|--------------|
| React 19 | 🟢 Low | High | Low | None |
| AI SDK | 🟡 Medium | High | Medium | None |
| TypeScript | 🟢 Low | Medium | Low | None |
| Drizzle | 🟡 Medium | High | Medium | None |
| Minor Updates | 🟢 Low | Low | Low | None |
| Zod v4 | 🟡 Medium | Medium | Medium | May affect validation |
| Next.js 16 | 🔴 High | Critical | High | Node.js 20.9+ |

---

## 🔄 Rollback Procedures

### General Rollback
```bash
# 1. Revert to previous commit
git reset --hard HEAD~1

# 2. Restore package-lock.json
git checkout main -- package-lock.json

# 3. Reinstall dependencies
rm -rf node_modules
npm install

# 4. Rebuild
npm run build
```

### Emergency Rollback (Production)
```bash
# If deployed to Vercel/production:
# 1. Revert to previous deployment via platform UI
# 2. Or redeploy from previous commit:
git checkout <previous-commit>
git push --force
```

---

## 📝 Documentation Updates Needed

After upgrades, update:
- [ ] README.md with new version requirements
- [ ] CONTRIBUTING.md with updated setup instructions
- [ ] package.json with correct version constraints
- [ ] CI/CD pipeline with new Node.js version
- [ ] Deployment documentation
- [ ] Environment variable documentation (if changed)

---

## 🎓 Learning Resources

### Next.js 16
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js Conf 2025](https://nextjs.org/conf)

### React 19
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

### AI SDK 5.0
- [AI SDK 5.0 Migration Guide](https://github.com/vercel/ai)
- [AI SDK Documentation](https://ai-sdk.dev/docs)

### Zod v4
- [Zod v4 Releases](https://github.com/colinhacks/zod/releases)
- [Zod Documentation](https://zod.dev)

---

## ✅ Final Checklist

Before starting:
- [ ] Create backup branch
- [ ] Document current behavior
- [ ] Ensure all tests pass
- [ ] Check Node.js version (20.9+ for Next.js 16)
- [ ] Review breaking changes
- [ ] Prepare rollback plan

During upgrade:
- [ ] Follow phases in order
- [ ] Test after each phase
- [ ] Document any issues
- [ ] Update code for breaking changes
- [ ] Run automated tests

After upgrade:
- [ ] Full regression testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Update documentation
- [ ] Deploy to staging first
- [ ] Monitor for issues

---

## 🚨 Emergency Contacts

If critical issues arise:
- Check GitHub Issues for each package
- Review Discord/community channels
- Check Stack Overflow
- Consult official migration guides

---

## 📅 Timeline Estimate

**Conservative Approach:** 6-7 business days
**Aggressive Approach:** 3-4 business days (NOT RECOMMENDED)

**Recommended:** Execute conservatively over 1-2 weeks with thorough testing between each phase.

---

## 🎉 Success Criteria

Upgrade is successful when:
- ✅ All tests pass
- ✅ Application builds without errors
- ✅ No runtime errors in production
- ✅ Performance is maintained or improved
- ✅ All features work as before
- ✅ No security vulnerabilities introduced
- ✅ Documentation is updated
- ✅ Team is trained on new features

---

**Document Version:** 1.0  
**Last Updated:** October 26, 2025  
**Next Review:** After Phase 1 completion
