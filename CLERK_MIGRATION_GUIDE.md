# Clerk Authentication Migration Guide

## Overview

This guide will walk you through migrating from NextAuth.js v5 to Clerk authentication in your AI chatbot application. Clerk is a modern authentication platform that provides a complete user management system with built-in UI components, session management, and extensive security features.

**Current System:**
- NextAuth.js v5 (beta)
- Custom email/password authentication
- Guest user system
- Password stored with bcrypt
- Manual session management

**Target System:**
- Clerk authentication
- Pre-built UI components
- Built-in user management
- OAuth providers ready
- Guest user mode via Clerk

---

## Part 1: Understanding Current Authentication

### Current Architecture

**Authentication Files:**
```
app/(auth)/
├── auth.ts                           # NextAuth configuration
├── auth.config.ts                    # Auth config
├── actions.ts                        # Login/register server actions
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts   # NextAuth API route
│       └── guest/route.ts           # Guest user creation
├── login/page.tsx                   # Login page
└── register/page.tsx                # Register page

components/
├── auth-form.tsx                    # Shared login/register form
├── sidebar-user-nav.tsx             # User menu with sign out
└── sign-out-form.tsx                # Sign out form

middleware.ts                         # Auth middleware
```

**Key Features:**
1. **Dual Credential Providers:**
   - Regular users: email + password
   - Guest users: auto-created without password

2. **User Types:**
   - `regular` - Full account users
   - `guest` - Temporary users (email: `guest-{timestamp}@example.com`)

3. **Session Structure:**
   ```typescript
   session.user = {
     id: string,
     email: string,
     type: "guest" | "regular"
   }
   ```

4. **Database Schema:**
   - User table: id, email, password (nullable for guests)
   - Foreign keys: Chat.userId, Document.userId, etc.

### Potential Migration Issues

**Issue 1: Guest User System**
- Current: Custom guest credential provider
- Challenge: Clerk doesn't have built-in guest mode
- **Solution:** Use Clerk's anonymous sessions or create custom guest flow

**Issue 2: User ID References**
- Current: UUIDs stored in database
- Challenge: Clerk uses its own user IDs (format: `user_xxxxx`)
- **Solution:** Either migrate user IDs or add Clerk ID mapping

**Issue 3: Password Migration**
- Current: bcrypt hashed passwords in database
- Challenge: Can't export/import hashes to Clerk
- **Solution:** Users must reset passwords or use Clerk's import API

**Issue 4: Session Management**
- Current: NextAuth sessions with JWT
- Challenge: Different session structure
- **Solution:** Update all `auth()` calls to Clerk's `auth()`

**Issue 5: Middleware**
- Current: Custom NextAuth middleware with guest redirect
- Challenge: Different middleware pattern
- **Solution:** Use Clerk's middleware with custom logic

---

## Part 2: Installation and Setup

### Step 1: Create Clerk Account

1. Go to https://clerk.com
2. Sign up for a free account
3. Create new application
4. Choose authentication methods:
   - ✅ Email/Password
   - ✅ Google (optional)
   - ✅ GitHub (optional)

**Copy these from Clerk Dashboard:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Step 2: Install Clerk

**Commands to run:**

```bash
pnpm add @clerk/nextjs
```

### Step 3: Add Environment Variables

**File to edit:** `.env.local`

**Add these variables:**

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Clerk URLs (customize these)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Keep these for migration period
# AUTH_SECRET=xxxxx  # Can remove after migration
```

**Update `.env.example`:**

Add the same variables with placeholder values.

---

## Part 3: Database Schema Updates

### Step 1: Add Clerk ID to User Table

We need to map Clerk user IDs to our existing user records.

**File to edit:** `lib/db/schema.ts`

**Modify the user table (around line 16-20):**

```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }), // Keep for migration period
  clerkId: varchar("clerkId", { length: 255 }).unique(), // ADD THIS
  clerkSynced: boolean("clerkSynced").default(false),    // ADD THIS
  createdAt: timestamp("createdAt").notNull().defaultNow(), // ADD THIS
});
```

### Step 2: Generate Migration

**Commands to run:**

```bash
pnpm db:generate
```

Review the generated migration file in `lib/db/migrations/`.

### Step 3: Apply Migration

**Command to run:**

```bash
pnpm db:migrate
```

### Step 4: Verify Migration

```bash
pnpm db:studio
```

Check that `clerkId`, `clerkSynced`, and `createdAt` columns exist in User table.

---

## Part 4: Update Root Layout with Clerk Provider

### Step 1: Wrap App with ClerkProvider

**File to edit:** `app/layout.tsx`

**Find the current structure:**

```typescript
import type { Metadata } from "next";
// ... other imports

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* current content */}
      </body>
    </html>
  );
}
```

**Replace with:**

```typescript
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
// ... other imports

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* current content */}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Important:** The `ClerkProvider` must wrap the entire `<html>` tag.

---

## Part 5: Update Middleware

### Step 1: Replace NextAuth Middleware with Clerk

**File to edit:** `middleware.ts`

**Replace entire content with:**

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api/auth(.*)",
  "/ping",
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Ping endpoint for Playwright tests
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Get auth state
  const { userId } = await auth();

  // If not authenticated and not on public route, redirect to login
  if (!userId && !isPublicRoute(request)) {
    // Redirect to login with callback
    const signInUrl = new URL("/login", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If authenticated and trying to access login/register, redirect to home
  if (userId && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
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

**What this does:**
- Uses Clerk's middleware instead of NextAuth
- Maintains similar redirect logic
- Protects routes requiring authentication
- Preserves ping endpoint for tests

---

## Part 6: Update Authentication Helpers

### Step 1: Create Clerk Auth Wrapper

**File to create:** `lib/auth/clerk-helpers.ts`

**Content:**

```typescript
import "server-only";

import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { getUser, createUser } from "@/lib/db/queries";

export type UserType = "guest" | "regular";

export type AppUser = {
  id: string;
  email: string;
  clerkId: string;
  type: UserType;
};

/**
 * Get authenticated user with database sync
 * This ensures the Clerk user exists in our database
 */
export async function getAuthUser(): Promise<AppUser | null> {
  const { userId: clerkUserId } = await clerkAuth();

  if (!clerkUserId) {
    return null;
  }

  const clerkUser = await currentUser();

  if (!clerkUser || !clerkUser.emailAddresses[0]) {
    return null;
  }

  const email = clerkUser.emailAddresses[0].emailAddress;

  // Check if user exists in our database
  const [dbUser] = await getUser(email);

  if (dbUser) {
    // User exists, ensure clerkId is synced
    if (!dbUser.clerkId || dbUser.clerkId !== clerkUserId) {
      await syncClerkIdToDatabase(dbUser.id, clerkUserId);
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      clerkId: clerkUserId,
      type: "regular", // All Clerk users are "regular"
    };
  }

  // User doesn't exist in database, create it
  await createUserFromClerk(clerkUserId, email);

  const [newDbUser] = await getUser(email);

  if (!newDbUser) {
    throw new Error("Failed to create user in database");
  }

  return {
    id: newDbUser.id,
    email: newDbUser.email,
    clerkId: clerkUserId,
    type: "regular",
  };
}

/**
 * Sync Clerk ID to existing database user
 */
async function syncClerkIdToDatabase(
  userId: string,
  clerkId: string
): Promise<void> {
  const { db } = await import("@/lib/db/queries");
  const { user } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(user)
    .set({ clerkId, clerkSynced: true })
    .where(eq(user.id, userId));
}

/**
 * Create user in database from Clerk user
 */
async function createUserFromClerk(
  clerkId: string,
  email: string
): Promise<void> {
  const { db } = await import("@/lib/db/queries");
  const { user } = await import("@/lib/db/schema");

  await db.insert(user).values({
    email,
    clerkId,
    clerkSynced: true,
    password: null, // No password needed with Clerk
  });
}

/**
 * Check if current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await clerkAuth();
  return !!userId;
}
```

### Step 2: Update Database Queries

**File to edit:** `lib/db/queries.ts`

**Add new functions at the bottom:**

```typescript
export async function getUserByClerkId({ clerkId }: { clerkId: string }) {
  try {
    const [selectedUser] = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, clerkId));
    return selectedUser;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get user by Clerk ID");
  }
}

export async function syncUserClerkId({
  userId,
  clerkId,
}: {
  userId: string;
  clerkId: string;
}) {
  try {
    return await db
      .update(user)
      .set({ clerkId, clerkSynced: true })
      .where(eq(user.id, userId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to sync Clerk ID"
    );
  }
}
```

---

## Part 7: Replace NextAuth Calls with Clerk

### Step 1: Update API Routes

**Pattern to find and replace:**

**OLD (NextAuth):**
```typescript
import { auth } from "@/app/(auth)/auth";

const session = await auth();

if (!session?.user) {
  return new Response("Unauthorized", { status: 401 });
}

const userId = session.user.id;
const userEmail = session.user.email;
const userType = session.user.type;
```

**NEW (Clerk):**
```typescript
import { getAuthUser } from "@/lib/auth/clerk-helpers";

const user = await getAuthUser();

if (!user) {
  return new Response("Unauthorized", { status: 401 });
}

const userId = user.id;
const userEmail = user.email;
const userType = user.type; // Always "regular" with Clerk
```

### Step 2: Update All API Routes

**Files to update:**

1. **`app/(chat)/api/chat/route.ts`**

   Find (around line 110):
   ```typescript
   const session = await auth();

   if (!session?.user) {
     return new ChatSDKError("unauthorized:chat").toResponse();
   }

   const userType: UserType = session.user.type;
   ```

   Replace with:
   ```typescript
   const user = await getAuthUser();

   if (!user) {
     return new ChatSDKError("unauthorized:chat").toResponse();
   }

   const userType: UserType = user.type;
   ```

   Then find all `session.user.id` and replace with `user.id`.

2. **`app/(chat)/api/files/upload/route.ts`**

   Find:
   ```typescript
   const session = await auth();

   if (!session) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

   Replace with:
   ```typescript
   const user = await getAuthUser();

   if (!user) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

3. **`app/(chat)/api/document/route.ts`**

   Apply same pattern as above.

4. **`app/(chat)/api/history/route.ts`**

   Apply same pattern.

5. **`app/(chat)/api/suggestions/route.ts`**

   Apply same pattern.

6. **`app/(chat)/api/vote/route.ts`**

   Apply same pattern.

7. **`app/(chat)/api/chat/[id]/stream/route.ts`**

   Apply same pattern.

### Step 3: Update Server Components

**Files to update:**

1. **`app/(chat)/page.tsx`**

   Find:
   ```typescript
   import { auth } from "@/app/(auth)/auth";

   const session = await auth();
   ```

   Replace with:
   ```typescript
   import { getAuthUser } from "@/lib/auth/clerk-helpers";

   const user = await getAuthUser();
   ```

2. **`app/(chat)/chat/[id]/page.tsx`**

   Apply same pattern.

3. **`app/(chat)/layout.tsx`**

   Apply same pattern.

### Step 4: Update Tool Files

**Files to update:**

1. **`lib/ai/tools/create-document.ts`**
2. **`lib/ai/tools/update-document.ts`**
3. **`lib/ai/tools/request-suggestions.ts`**
4. **`lib/artifacts/server.ts`**

**Pattern:**

Find:
```typescript
import type { Session } from "next-auth";

type Props = {
  session: Session;
  // ...
};
```

Replace with:
```typescript
import type { AppUser } from "@/lib/auth/clerk-helpers";

type Props = {
  user: AppUser;
  // ...
};
```

Then update all references from `session.user.id` to `user.id`.

---

## Part 8: Replace Auth UI Components

### Step 1: Update Login Page

**File to edit:** `app/(auth)/login/page.tsx`

**Replace entire content with:**

```typescript
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            card: "shadow-none",
            headerTitle: "text-xl font-semibold",
            headerSubtitle: "text-sm text-gray-500",
            formFieldInput:
              "bg-muted border-border text-sm rounded-md",
            footerActionLink: "text-primary hover:underline",
          },
        }}
        redirectUrl="/"
        signUpUrl="/register"
      />
    </div>
  );
}
```

### Step 2: Update Register Page

**File to edit:** `app/(auth)/register/page.tsx`

**Replace entire content with:**

```typescript
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            card: "shadow-none",
            headerTitle: "text-xl font-semibold",
            headerSubtitle: "text-sm text-gray-500",
            formFieldInput:
              "bg-muted border-border text-sm rounded-md",
            footerActionLink: "text-primary hover:underline",
          },
        }}
        redirectUrl="/"
        signInUrl="/login"
      />
    </div>
  );
}
```

### Step 3: Update User Navigation

**File to edit:** `components/sidebar-user-nav.tsx`

**Replace entire content with:**

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
                  src={user?.imageUrl ?? `https://avatar.vercel.sh/${user?.emailAddresses[0]?.emailAddress}`}
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

**Important:** Remove the `user` prop from the component signature since Clerk provides it via hooks.

**Update usage in `app/(chat)/layout.tsx`:**

Find:
```typescript
<SidebarUserNav user={session.user} />
```

Replace with:
```typescript
<SidebarUserNav />
```

---

## Part 9: Handle Guest Users (Optional)

If you want to keep the guest user functionality, you have two options:

### Option 1: Remove Guest Users (Recommended)

Simply require all users to sign up with Clerk. This is simpler and more secure.

**What to do:**
1. Remove guest-related code from middleware
2. Remove guest check from components
3. Update entitlements to remove "guest" type

**File to edit:** `lib/ai/entitlements.ts`

```typescript
export const entitlementsByUserType: Record<UserType, Entitlements> = {
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
```

### Option 2: Implement Custom Guest Mode

Keep a custom guest system alongside Clerk.

**File to create:** `lib/auth/guest.ts`

```typescript
import { cookies } from "next/headers";
import { generateUUID } from "@/lib/utils";
import { createGuestUser } from "@/lib/db/queries";

const GUEST_COOKIE_NAME = "guest_session";

export async function getOrCreateGuestSession() {
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    // Create new guest user
    const [guest] = await createGuestUser();
    guestId = guest.id;

    // Set cookie
    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  return guestId;
}
```

Then update middleware to check for guest session if no Clerk auth.

---

## Part 10: Clean Up Old NextAuth Code

### Step 1: Remove NextAuth Files

**Files to delete:**

```bash
rm app/\(auth\)/auth.ts
rm app/\(auth\)/auth.config.ts
rm app/\(auth\)/actions.ts
rm app/\(auth\)/api/auth/\[...nextauth\]/route.ts
rm app/\(auth\)/api/auth/guest/route.ts
rm components/auth-form.tsx
rm components/sign-out-form.tsx
```

### Step 2: Remove NextAuth Dependencies

**File to edit:** `package.json`

**Remove these lines:**

```json
"next-auth": "5.0.0-beta.25",
"bcrypt-ts": "^5.0.2",
```

**Run:**

```bash
pnpm install
```

### Step 3: Remove Environment Variables

**File to edit:** `.env.local`

**Remove:**

```bash
AUTH_SECRET=xxxxx
```

### Step 4: Update Database Schema (Optional)

If you're confident the migration is complete, you can remove the password field:

**File to edit:** `lib/db/schema.ts`

```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  // password: varchar("password", { length: 64 }), // REMOVE THIS
  clerkId: varchar("clerkId", { length: 255 }).unique().notNull(),
  clerkSynced: boolean("clerkSynced").default(true).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

Generate and apply migration:

```bash
pnpm db:generate
pnpm db:migrate
```

---

## Part 11: Testing the Migration

### Step 1: Test Development Server

```bash
pnpm dev
```

### Step 2: Test Authentication Flow

1. **Go to:** http://localhost:3000
2. **Expected:** Redirected to `/login`
3. **Sign up:** Create new account
4. **Verify:** Redirected to home page
5. **Check database:** User should have `clerkId` populated

### Step 3: Test Protected Routes

**Test API endpoints:**

```bash
# Without auth - should fail
curl http://localhost:3000/api/history

# With auth - get session cookie from browser and test
curl http://localhost:3000/api/history \
  -H "Cookie: __session=xxxxx"
```

### Step 4: Test Sign Out

1. Click user menu in sidebar
2. Click "Sign out"
3. Should redirect to home
4. Should be redirected to login

### Step 5: Test Chat Functionality

1. Sign in
2. Start new chat
3. Send message
4. Verify chat is saved with your user ID
5. Check database: Chat.userId should match User.id (not clerkId)

### Step 6: Verify Database Sync

```bash
pnpm db:studio
```

Check User table:
- `clerkId` should be populated for new users
- `clerkSynced` should be true
- Old users (migrated) should have `clerkId` after first login

---

## Part 12: User Migration Strategy

### For Existing Users

**Option 1: Require Password Reset**

1. Users visit login page
2. Click "Forgot Password"
3. Clerk sends reset email
4. User sets new password
5. On first login, `clerkId` is synced to database

**Option 2: Import Users via Clerk API**

Clerk provides a user import API, but password hashes must match their format.

**File to create:** `scripts/migrate-users-to-clerk.ts`

```typescript
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function migrateUsers() {
  const users = await db.select().from(user).where(eq(user.clerkSynced, false));

  for (const dbUser of users) {
    try {
      // Check if user exists in Clerk by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [dbUser.email],
      });

      let clerkUserId: string;

      if (clerkUsers.data.length > 0) {
        // User exists in Clerk
        clerkUserId = clerkUsers.data[0].id;
      } else {
        // Create user in Clerk
        // Note: Can't import password hash, user must reset
        const newClerkUser = await clerkClient.users.createUser({
          emailAddress: [dbUser.email],
          skipPasswordRequirement: true, // User will need to set password
        });

        clerkUserId = newClerkUser.id;

        // Send password reset email
        await clerkClient.users.sendPasswordResetEmail({
          userId: clerkUserId,
        });
      }

      // Sync Clerk ID to database
      await db
        .update(user)
        .set({ clerkId: clerkUserId, clerkSynced: true })
        .where(eq(user.id, dbUser.id));

      console.log(`✓ Migrated user: ${dbUser.email}`);
    } catch (error) {
      console.error(`✗ Failed to migrate user ${dbUser.email}:`, error);
    }
  }

  console.log("Migration complete!");
}

migrateUsers();
```

**Run:**

```bash
npx tsx scripts/migrate-users-to-clerk.ts
```

---

## Part 13: Production Deployment

### Step 1: Update Environment Variables on Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`
3. Remove:
   - `AUTH_SECRET`

### Step 2: Update Clerk Dashboard

1. Go to Clerk Dashboard → Your App → Domains
2. Add production domain: `your-app.vercel.app`
3. Update redirect URLs to include production domain

### Step 3: Deploy

```bash
git add .
git commit -m "Migrate to Clerk authentication"
git push
```

Vercel will automatically deploy.

### Step 4: Test Production

1. Visit production URL
2. Sign up new account
3. Test all authentication flows
4. Monitor Clerk dashboard for activity

---

## Part 14: Troubleshooting

### Issue: "Clerk: Missing publishable key"

**Solution:**
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- Restart dev server
- Check `.env.local` file exists

### Issue: Users not syncing to database

**Solution:**
- Check `getAuthUser()` is being called in API routes
- Verify database connection
- Check for errors in server logs
- Ensure `createUser` function works

### Issue: Infinite redirect loop

**Solution:**
- Check middleware matcher patterns
- Verify `isPublicRoute` includes login/register
- Clear browser cookies
- Check Clerk redirect URLs match your routes

### Issue: "TypeError: Cannot read properties of null"

**Solution:**
- User object is null, check authentication
- Add null checks: `if (!user) return`
- Verify middleware is protecting routes

### Issue: Old NextAuth sessions interfere

**Solution:**
- Clear browser cookies
- Delete `__Secure-next-auth.session-token` cookie
- Sign out from all sessions
- Clear local storage

### Issue: Guest users can't access app

**Solution:**
- Implement guest mode (Part 9, Option 2)
- Or require all users to sign up
- Update entitlements to handle missing "guest" type

---

## Part 15: Advanced Features

### Feature 1: Add OAuth Providers

**In Clerk Dashboard:**
1. Go to User & Authentication → Social Connections
2. Enable Google, GitHub, etc.
3. Configure OAuth credentials

**In your app:**
- Clerk automatically handles OAuth buttons
- No code changes needed!

### Feature 2: Add Multi-Factor Authentication

**In Clerk Dashboard:**
1. Go to User & Authentication → Multi-factor
2. Enable SMS, TOTP, or Backup codes

**In your app:**
- Users can enable MFA in account settings
- Clerk handles all MFA flows

### Feature 3: Customize Clerk Components

**File to edit:** `app/(auth)/login/page.tsx`

```typescript
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <SignIn
      appearance={{
        layout: {
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "iconButton",
        },
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90",
          card: "shadow-lg",
          headerTitle: "text-2xl font-bold",
          socialButtonsBlockButton: "border-2 border-primary",
        },
        variables: {
          colorPrimary: "#000",
          borderRadius: "8px",
        },
      }}
    />
  );
}
```

### Feature 4: Add User Profile Page

**File to create:** `app/(chat)/profile/page.tsx`

```typescript
import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <UserProfile
        appearance={{
          elements: {
            card: "shadow-none",
          },
        }}
      />
    </div>
  );
}
```

**Add to sidebar navigation:**

```typescript
<Link href="/profile">My Profile</Link>
```

### Feature 5: Webhooks for User Events

Set up webhooks to sync user events (create, update, delete) to your database.

**In Clerk Dashboard:**
1. Go to Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`

**File to create:** `app/api/webhooks/clerk/route.ts`

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

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
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

  // Handle events
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (email) {
      await db.insert(user).values({
        email,
        clerkId: id,
        clerkSynced: true,
      });
    }
  } else if (eventType === "user.deleted") {
    const { id } = evt.data;

    await db.delete(user).where(eq(user.clerkId, id!));
  }

  return new Response("", { status: 200 });
}
```

---

## Summary Checklist

- [ ] Part 1: Understand current auth system
- [ ] Part 2: Installation
  - [ ] Create Clerk account
  - [ ] Install @clerk/nextjs
  - [ ] Add environment variables
- [ ] Part 3: Database updates
  - [ ] Add clerkId column
  - [ ] Generate migration
  - [ ] Apply migration
- [ ] Part 4: Update layout
  - [ ] Wrap app with ClerkProvider
- [ ] Part 5: Update middleware
  - [ ] Replace NextAuth middleware with Clerk
- [ ] Part 6: Auth helpers
  - [ ] Create clerk-helpers.ts
  - [ ] Add database sync functions
- [ ] Part 7: Replace auth calls
  - [ ] Update all API routes (8 files)
  - [ ] Update server components (3 files)
  - [ ] Update tool files (4 files)
- [ ] Part 8: UI components
  - [ ] Update login page
  - [ ] Update register page
  - [ ] Update sidebar user nav
- [ ] Part 9: Guest users
  - [ ] Decide on approach (remove or keep)
  - [ ] Implement chosen solution
- [ ] Part 10: Clean up
  - [ ] Delete NextAuth files
  - [ ] Remove dependencies
  - [ ] Remove old env vars
- [ ] Part 11: Testing
  - [ ] Test auth flow
  - [ ] Test protected routes
  - [ ] Test chat functionality
  - [ ] Verify database sync
- [ ] Part 12: User migration
  - [ ] Choose migration strategy
  - [ ] Run migration script
  - [ ] Notify existing users
- [ ] Part 13: Production
  - [ ] Update Vercel env vars
  - [ ] Update Clerk dashboard
  - [ ] Deploy and test
- [ ] Part 14: Troubleshooting (if needed)
- [ ] Part 15: Advanced features (optional)

---

## Key Differences Summary

| Feature | NextAuth | Clerk |
|---------|----------|-------|
| **Setup** | Manual configuration | Pre-built UI components |
| **User Management** | Custom database | Built-in dashboard |
| **Session** | JWT or database | JWT with automatic refresh |
| **OAuth** | Manual provider setup | Click to enable |
| **UI** | Custom forms | Customizable components |
| **MFA** | Manual implementation | Built-in support |
| **User ID** | Custom UUID | Clerk format (`user_xxxxx`) |
| **Webhooks** | Not included | Built-in user events |
| **Cost** | Free (self-hosted) | Free tier: 10k MAU |

---

## Additional Resources

- **Clerk Documentation:** https://clerk.com/docs
- **Clerk Next.js Quickstart:** https://clerk.com/docs/quickstarts/nextjs
- **Clerk Components:** https://clerk.com/docs/components/overview
- **Clerk Webhooks:** https://clerk.com/docs/integrations/webhooks
- **Migration Support:** https://clerk.com/docs/upgrade-guides

This migration provides a more robust, feature-rich authentication system with less code to maintain!
