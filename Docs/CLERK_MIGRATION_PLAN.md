# Clerk Migration Plan - Revised (No Guest Users)

**Date**: 2025-10-04
**Strategy**: Remove guest functionality, require authentication for all users
**Deployment**: Phased rollout with rollback capability

---

## Executive Summary

This plan migrates from NextAuth.js v5 to Clerk authentication while **completely removing guest user functionality**. All users will be required to create an account to use the application.

**Key Decisions**:
- ✅ Remove guest users entirely
- ✅ Use two-phase database migration (safe rollback)
- ✅ Phased deployment strategy
- ✅ Reuse existing database connection
- ✅ Create shared type definitions

---

## Phase 1: Preparation (Low Risk)

### 1.1 Environment Setup

**Create Clerk Account**:
1. Sign up at https://clerk.com
2. Create new application
3. Enable authentication methods:
   - ✅ Email/Password (required)
   - ✅ Google OAuth (optional)
   - ✅ GitHub OAuth (optional)

**Add Environment Variables** to `.env.local`:
```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Keep NextAuth for rollback (remove in Phase 5)
AUTH_SECRET=xxxxx
```

**Update `.env.example`**:
```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Keep for migration period
AUTH_SECRET=****
```

### 1.2 Install Dependencies

```bash
pnpm add @clerk/nextjs
```

**Do NOT remove NextAuth yet** - keep for rollback capability.

### 1.3 Database Schema Migration (Phase 1)

**Update `lib/db/schema.ts`** - Add Clerk fields (nullable for migration):

```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }), // Keep for migration
  clerkId: varchar("clerkId", { length: 255 }).unique(), // NULLABLE initially
  clerkSynced: boolean("clerkSynced").default(false), // Track sync status
  createdAt: timestamp("createdAt").notNull().defaultNow(), // Add timestamp
});
```

**Generate and apply migration**:
```bash
pnpm db:generate
# Review migration file
pnpm db:migrate
```

**Verify in Drizzle Studio**:
```bash
pnpm db:studio
# Check that clerkId, clerkSynced, createdAt columns exist
```

---

## Phase 2: Core Implementation (Medium Risk)

### 2.1 Create Shared Type Definitions

**Create `lib/types/auth.ts`** (NEW FILE):

```typescript
/**
 * Shared authentication types for the application
 * Used by both Clerk helpers and entitlements system
 */

export type UserType = "regular"; // Guest removed

export interface AuthUser {
  id: string;          // Database UUID
  email: string;
  clerkId: string;     // Clerk user ID
  type: UserType;
}
```

### 2.2 Create Clerk Authentication Helper

**Create `lib/auth/clerk-helpers.ts`** (NEW FILE):

```typescript
import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/queries"; // REUSE existing connection
import { user as userTable } from "@/lib/db/schema";
import type { AuthUser, UserType } from "@/lib/types/auth";

/**
 * Get authenticated user from Clerk and sync with database
 * Replaces NextAuth's auth() function
 *
 * @returns AuthUser if authenticated, null otherwise
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    // Get Clerk session
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return null;
    }

    // Get full Clerk user data
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    // Extract email (Clerk users must have email)
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error("Clerk user missing email address");
      return null;
    }

    // Step 1: Try to find user by Clerk ID (already synced)
    const [userByClerkId] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.clerkId, clerkUserId))
      .limit(1);

    if (userByClerkId) {
      // User already synced, return immediately
      return {
        id: userByClerkId.id,
        email: userByClerkId.email,
        clerkId: clerkUserId,
        type: "regular",
      };
    }

    // Step 2: Try to find by email (existing user from NextAuth)
    const [userByEmail] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (userByEmail) {
      // Found existing user, sync Clerk ID
      console.log(`Syncing Clerk ID for existing user: ${email}`);

      await db
        .update(userTable)
        .set({
          clerkId: clerkUserId,
          clerkSynced: true,
        })
        .where(eq(userTable.id, userByEmail.id));

      return {
        id: userByEmail.id,
        email: userByEmail.email,
        clerkId: clerkUserId,
        type: "regular",
      };
    }

    // Step 3: New user, create in database
    console.log(`Creating new user in database: ${email}`);

    const [newUser] = await db
      .insert(userTable)
      .values({
        email,
        clerkId: clerkUserId,
        clerkSynced: true,
        password: null, // No password with Clerk
      })
      .returning();

    return {
      id: newUser.id,
      email: newUser.email,
      clerkId: clerkUserId,
      type: "regular",
    };
  } catch (error) {
    console.error("Error in getAuthUser:", error);
    return null;
  }
}

/**
 * Require authentication, throw error if not authenticated
 * Use in API routes that must have an authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Check if current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}
```

### 2.3 Update Entitlements

**Update `lib/ai/entitlements.ts`**:

```typescript
import type { UserType } from "@/lib/types/auth"; // New import location
import { chatModelIds } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  // Guest removed - only regular users now
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
  },

  // TODO: Add premium tier in future
  // premium: {
  //   maxMessagesPerDay: 1000,
  //   availableChatModelIds: chatModelIds,
  // },
};
```

### 2.4 Update Root Layout

**Update `app/layout.tsx`**:

```typescript
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs"; // NEW

import "./globals.css";
// Remove: import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://chat.vercel.ai"),
  title: "Next.js Chatbot Template",
  description: "Next.js chatbot template using the AI SDK.",
};

export const viewport = {
  maximumScale: 1,
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        className={`${geist.variable} ${geistMono.variable}`}
        lang="en"
        suppressHydrationWarning
      >
        <head>
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
            dangerouslySetInnerHTML={{
              __html: THEME_COLOR_SCRIPT,
            }}
          />
        </head>
        <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <Toaster position="top-center" />
            {children}
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 2.5 Update Middleware

**Replace `middleware.ts`** entirely:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api/webhooks(.*)",
  "/ping",
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Playwright health check - must return 200
  if (pathname === "/ping") {
    return new Response("pong", { status: 200 });
  }

  // Protect all non-public routes
  // No guest redirect - users MUST sign in
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Key changes**:
- ✅ No guest user redirect logic
- ✅ Uses `auth.protect()` to enforce authentication
- ✅ Keeps `/ping` for Playwright tests
- ✅ Public routes: login, register, webhooks only

---

## Phase 3: Update API Routes & Server Components

### 3.1 Update All API Routes (7 files)

**Pattern to apply**:

```typescript
// BEFORE (NextAuth)
import { auth } from "@/app/(auth)/auth";

const session = await auth();

if (!session?.user) {
  return new Response("Unauthorized", { status: 401 });
}

const userId = session.user.id;
const userType = session.user.type;

// AFTER (Clerk)
import { getAuthUser } from "@/lib/auth/clerk-helpers";

const user = await getAuthUser();

if (!user) {
  return new Response("Unauthorized", { status: 401 });
}

const userId = user.id;
const userType = user.type; // Always "regular" now
```

**Files to update**:
1. ✅ `app/(chat)/api/chat/route.ts`
2. ✅ `app/(chat)/api/chat/[id]/stream/route.ts`
3. ✅ `app/(chat)/api/files/upload/route.ts`
4. ✅ `app/(chat)/api/document/route.ts`
5. ✅ `app/(chat)/api/history/route.ts`
6. ✅ `app/(chat)/api/suggestions/route.ts`
7. ✅ `app/(chat)/api/vote/route.ts`

**Search and replace**:
- `import { auth } from "@/app/(auth)/auth"` → `import { getAuthUser } from "@/lib/auth/clerk-helpers"`
- `const session = await auth()` → `const user = await getAuthUser()`
- `session?.user` → `user`
- `session.user.id` → `user.id`
- `session.user.type` → `user.type`

### 3.2 Update Server Components (2 files)

**Pattern for `app/(chat)/page.tsx`**:

```typescript
// BEFORE
import { auth } from "../(auth)/auth";

const session = await auth();

if (!session) {
  redirect("/api/auth/guest"); // Guest redirect removed
}

// AFTER
import { getAuthUser } from "@/lib/auth/clerk-helpers";

const user = await getAuthUser();

if (!user) {
  redirect("/login"); // Require sign in
}
```

**Files to update**:
1. ✅ `app/(chat)/page.tsx`
2. ✅ `app/(chat)/chat/[id]/page.tsx`

### 3.3 Update Chat Layout

**Update `app/(chat)/layout.tsx`**:

```typescript
import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth/clerk-helpers"; // NEW

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([
    getAuthUser(), // Changed from auth()
    cookies(),
  ]);

  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={user} /> {/* Pass AuthUser instead of Session */}
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
```

### 3.4 Update Tool Files (4 files)

**Pattern**:

```typescript
// BEFORE
import type { Session } from "next-auth";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    execute: async ({ title, kind }) => {
      // ... uses session.user.id
    },
  });

// AFTER
import type { AuthUser } from "@/lib/types/auth";

type CreateDocumentProps = {
  user: AuthUser;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createDocument = ({ user, dataStream }: CreateDocumentProps) =>
  tool({
    execute: async ({ title, kind }) => {
      // ... uses user.id
    },
  });
```

**Files to update**:
1. ✅ `lib/ai/tools/create-document.ts`
2. ✅ `lib/ai/tools/update-document.ts`
3. ✅ `lib/ai/tools/request-suggestions.ts`
4. ✅ `lib/artifacts/server.ts`

**In chat route**, update tool initialization:

```typescript
// In app/(chat)/api/chat/route.ts
const tools = {
  createDocument: createDocument({ user, dataStream }), // Changed from session
  updateDocument: updateDocument({ user, dataStream }),
  requestSuggestions: requestSuggestions({ user }),
};
```

---

## Phase 4: Update UI Components

### 4.1 Replace Login Page

**Replace `app/(auth)/login/page.tsx`** entirely:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background shadow-lg",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            formFieldInput: "bg-muted border-border",
            footerActionLink: "text-primary hover:underline",
          },
        }}
        routing="path"
        path="/login"
        signUpUrl="/register"
      />
    </div>
  );
}
```

### 4.2 Replace Register Page

**Replace `app/(auth)/register/page.tsx`** entirely:

```typescript
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background shadow-lg",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            formFieldInput: "bg-muted border-border",
            footerActionLink: "text-primary hover:underline",
          },
        }}
        routing="path"
        path="/register"
        signInUrl="/login"
      />
    </div>
  );
}
```

### 4.3 Update Sidebar User Navigation

**Replace `components/sidebar-user-nav.tsx`** entirely:

```typescript
"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

export function SidebarUserNav() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {!isLoaded ? (
              <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                <Image
                  alt={user?.emailAddresses[0]?.emailAddress ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={
                    user?.imageUrl ??
                    `https://avatar.vercel.sh/${user?.emailAddresses[0]?.emailAddress}`
                  }
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {user?.emailAddresses[0]?.emailAddress ?? "User"}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-settings"
              onSelect={() => {
                router.push("/settings");
              }}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                onClick={async () => {
                  if (!isLoaded) {
                    toast({
                      type: "error",
                      description:
                        "Checking authentication status, please try again!",
                    });
                    return;
                  }

                  await signOut();
                  router.push("/");
                }}
                type="button"
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

**Key changes**:
- ✅ No `user` prop - uses `useUser()` hook
- ✅ No guest user checks removed
- ✅ Always shows "Sign out" (no "Login to your account")
- ✅ Uses Clerk's `signOut()` method

### 4.4 Update AppSidebar

**Update `components/app-sidebar.tsx`** - Remove user prop:

```typescript
// Change from:
<SidebarUserNav user={user} />

// To:
<SidebarUserNav />
```

---

## Phase 5: Testing (Critical)

### 5.1 Development Testing

```bash
pnpm dev
```

**Test Checklist**:

**Authentication Flow**:
- [ ] Visit http://localhost:3000 → should redirect to /login
- [ ] Sign up with new account → should create user in database
- [ ] Check Drizzle Studio → user has clerkId populated
- [ ] Sign out → should redirect to home → then to login
- [ ] Sign in again → should work

**Existing User Migration**:
- [ ] Sign in with existing NextAuth email/password via Clerk
- [ ] Should auto-sync clerkId to database
- [ ] Check database → clerkSynced should be true
- [ ] Chats and documents should still belong to user

**API Routes**:
- [ ] Create new chat → should save with correct userId
- [ ] Send message → should work and track usage
- [ ] Upload file → should work
- [ ] Create document/artifact → should work
- [ ] All API calls return 401 when not authenticated

**UI Components**:
- [ ] Sidebar shows user email (not "Guest")
- [ ] Sign out button works
- [ ] Theme toggle works
- [ ] Settings link works

### 5.2 Playwright Tests

```bash
pnpm test
```

**Expected**:
- Some tests may fail due to auth changes
- Update test fixtures to use Clerk authentication
- Ensure /ping endpoint still returns 200

### 5.3 Database Verification

```bash
pnpm db:studio
```

**Check**:
- [ ] New users have clerkId populated
- [ ] Existing users get clerkId after first Clerk login
- [ ] clerkSynced is true for migrated users
- [ ] No guest users remain (email pattern `guest-*@example.com`)

---

## Phase 6: Cleanup Guest User Code

### 6.1 Remove Guest-Related Files

**Delete these files**:
```bash
rm app/\(auth\)/api/auth/guest/route.ts
```

### 6.2 Remove Guest Constants

**Update `lib/constants.ts`**:
```typescript
// Remove:
export const guestRegex = /^guest-\d+@example\.com$/;
```

### 6.3 Clean Up Database (Optional)

**Remove guest users from database** (if any exist):

```sql
-- Check for guest users
SELECT * FROM "User" WHERE email LIKE 'guest-%@example.com';

-- Delete guest users and their data (cascade)
DELETE FROM "User" WHERE email LIKE 'guest-%@example.com';
```

**Note**: Ensure foreign key constraints are set to CASCADE delete, or manually delete related records first.

---

## Phase 7: Remove NextAuth (After Verification)

**Only proceed after 1-2 weeks of stable Clerk operation**

### 7.1 Remove NextAuth Files

```bash
rm app/\(auth\)/auth.ts
rm app/\(auth\)/auth.config.ts
rm app/\(auth\)/actions.ts
rm app/\(auth\)/api/auth/\[...nextauth\]/route.ts
rm components/auth-form.tsx
rm components/sign-out-form.tsx
```

### 7.2 Remove NextAuth Dependencies

**Update `package.json`**:
```bash
pnpm remove next-auth bcrypt-ts
```

### 7.3 Remove Environment Variables

**Delete from `.env.local`**:
```bash
# Remove:
AUTH_SECRET=xxxxx
```

**Update `.env.example`**:
```bash
# Remove AUTH_SECRET line
```

### 7.4 Database Schema Final Cleanup

**Update `lib/db/schema.ts`** - Make clerkId required:

```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  // Remove: password: varchar("password", { length: 64 }),
  clerkId: varchar("clerkId", { length: 255 }).unique().notNull(), // NOW REQUIRED
  clerkSynced: boolean("clerkSynced").default(true).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

**Generate and apply migration**:
```bash
pnpm db:generate
pnpm db:migrate
```

### 7.5 Final Verification

```bash
pnpm build
pnpm lint
pnpm test
```

All should pass without errors.

---

## Phase 8: Production Deployment

### 8.1 Update Vercel Environment Variables

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`
3. Keep `AUTH_SECRET` temporarily for rollback
4. Deploy to production

### 8.2 Update Clerk Dashboard

1. Go to Clerk Dashboard → Your App → Domains
2. Add production domain: `your-app.vercel.app`
3. Update allowed redirect URLs
4. Test OAuth providers on production domain

### 8.3 Deploy

```bash
git add .
git commit -m "feat: migrate to Clerk authentication, remove guest users"
git push
```

Vercel will auto-deploy.

### 8.4 Monitor Production

**First 24 Hours**:
- [ ] Monitor error logs in Vercel
- [ ] Check Clerk dashboard for authentication events
- [ ] Verify user signups work
- [ ] Test existing user logins
- [ ] Monitor database connection pool

**Communication**:
- Send email to existing users: "We've upgraded authentication - please sign in with your email"
- Existing users with same email will auto-migrate

### 8.5 Rollback Plan (If Needed)

**If critical issues arise**:

1. Revert deployment:
```bash
git revert HEAD
git push
```

2. Re-enable NextAuth in Vercel env vars
3. Remove Clerk env vars temporarily
4. Redeploy previous version
5. Investigate issues in staging

---

## Advanced Features (Optional - After Migration)

### OAuth Providers

**In Clerk Dashboard**:
1. Go to User & Authentication → Social Connections
2. Enable Google, GitHub, etc.
3. Configure OAuth credentials
4. No code changes needed - Clerk handles it automatically

### Multi-Factor Authentication

**In Clerk Dashboard**:
1. Go to User & Authentication → Multi-factor
2. Enable SMS, TOTP, or Backup codes
3. Users can enable MFA in account settings

### Webhooks for User Sync

**Create `app/api/webhooks/clerk/route.ts`**:

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  // Verify webhook
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    // Delete user from database (cascade will delete chats, documents, etc.)
    await db.delete(user).where(eq(user.clerkId, id!));
  }

  return new Response("", { status: 200 });
}
```

---

## Migration Checklist

### Phase 1: Preparation
- [ ] Create Clerk account and get API keys
- [ ] Add Clerk environment variables to `.env.local`
- [ ] Update `.env.example`
- [ ] Install `@clerk/nextjs`
- [ ] Add clerkId, clerkSynced, createdAt to User table
- [ ] Generate and apply database migration
- [ ] Verify schema in Drizzle Studio

### Phase 2: Core Implementation
- [ ] Create `lib/types/auth.ts` with AuthUser and UserType
- [ ] Create `lib/auth/clerk-helpers.ts`
- [ ] Update `lib/ai/entitlements.ts` (remove guest)
- [ ] Update `app/layout.tsx` with ClerkProvider
- [ ] Replace `middleware.ts` with Clerk middleware

### Phase 3: Update Code
- [ ] Update 7 API routes (chat, stream, files, document, history, suggestions, vote)
- [ ] Update 2 server components (page.tsx, chat/[id]/page.tsx)
- [ ] Update `app/(chat)/layout.tsx`
- [ ] Update 4 tool files (create-document, update-document, request-suggestions, artifacts/server)

### Phase 4: UI Updates
- [ ] Replace `app/(auth)/login/page.tsx` with Clerk SignIn
- [ ] Replace `app/(auth)/register/page.tsx` with Clerk SignUp
- [ ] Replace `components/sidebar-user-nav.tsx` with Clerk version
- [ ] Update `components/app-sidebar.tsx` (remove user prop)

### Phase 5: Testing
- [ ] Test authentication flow in development
- [ ] Test existing user migration (auto-sync clerkId)
- [ ] Test all API routes with/without auth
- [ ] Verify UI components work
- [ ] Run Playwright tests
- [ ] Check database in Drizzle Studio

### Phase 6: Guest Cleanup
- [ ] Delete `app/(auth)/api/auth/guest/route.ts`
- [ ] Remove `guestRegex` from `lib/constants.ts`
- [ ] Remove guest users from database (if any)

### Phase 7: NextAuth Removal (After 1-2 weeks)
- [ ] Delete NextAuth files (auth.ts, auth.config.ts, actions.ts, etc.)
- [ ] Remove NextAuth dependencies (`pnpm remove next-auth bcrypt-ts`)
- [ ] Remove `AUTH_SECRET` from environment
- [ ] Make clerkId NOT NULL in schema
- [ ] Remove password column from User table
- [ ] Final build, lint, and test

### Phase 8: Production
- [ ] Update Vercel environment variables
- [ ] Update Clerk dashboard with production domain
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Communicate with users
- [ ] Remove AUTH_SECRET after confirmation

---

## Key Benefits After Migration

✅ **No Guest Users**: Simpler codebase, better analytics
✅ **Better UX**: Pre-built Clerk UI components
✅ **OAuth Ready**: Add Google/GitHub with one click
✅ **MFA Support**: Built-in multi-factor authentication
✅ **User Management**: Clerk dashboard for admin tasks
✅ **Session Security**: Automatic JWT refresh
✅ **Webhooks**: Real-time user event synchronization

---

## Support Resources

- **Clerk Docs**: https://clerk.com/docs
- **Next.js Integration**: https://clerk.com/docs/quickstarts/nextjs
- **Migration Support**: https://clerk.com/docs/upgrade-guides
- **Community**: https://discord.com/invite/clerk

---

**END OF MIGRATION PLAN**
