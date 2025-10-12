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

### Step 1.5: Update Root Layout

**Time estimate**: 15 minutes

**AI Prompt:**
```
Update app/layout.tsx to replace NextAuth's SessionProvider with Clerk's
ClerkProvider. 

Current code has:
- import { SessionProvider } from "next-auth/react"
- <SessionProvider>{children}</SessionProvider>

Replace with:
- import { ClerkProvider } from "@clerk/nextjs"
- Wrap the entire app in <ClerkProvider>

Keep all other providers (ThemeProvider, Analytics, etc.) exactly as they are.
```

**Expected changes:**
```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
+ import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
- import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
+   <ClerkProvider>
      <html
        className={`${geist.variable} ${geistMono.variable}`}
        lang="en"
        suppressHydrationWarning
      >
        <head>
          <script
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
-           <SessionProvider>{children}</SessionProvider>
+           {children}
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </body>
      </html>
+   </ClerkProvider>
  );
}
```

**Verify**:
- No TypeScript errors
- App compiles: `pnpm dev`

### Step 1.6: Update Middleware

**Time estimate**: 20 minutes

**AI Prompt:**
```
Replace my NextAuth middleware in middleware.ts with Clerk's clerkMiddleware.

Current middleware:
- Uses getToken() from next-auth/jwt
- Redirects unauthenticated users to /api/auth/guest
- Has special handling for /ping route (Playwright tests)

New requirements:
- Use clerkMiddleware from @clerk/nextjs/server
- Protect all routes except: /login, /register, /api/webhooks, /ping
- Keep the /ping route for Playwright health checks
- Use createRouteMatcher for public routes

File: middleware.ts
```

**Expected new middleware.ts:**
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api/webhooks(.*)",
  "/ping",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Playwright health check - must return 200
  if (pathname === "/ping") {
    return new Response("pong", { status: 200 });
  }

  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Key changes:**
- ✅ Removed `getToken()` imports
- ✅ Removed guest user auto-creation
- ✅ Added `clerkMiddleware` wrapper
- ✅ Protected routes via `auth.protect()`
- ✅ Kept same matcher config

**Verify:**
```bash
pnpm dev
# Visit http://localhost:3000
# Should redirect to /login (Clerk's default)
```

### Step 1.7: Create Clerk Auth Helper

**Time estimate**: 30 minutes

This is a critical step that bridges Clerk authentication with your existing database.

**AI Prompt:**
```
Create a new file lib/auth/clerk-helpers.ts that provides authentication
utilities for both Server Components and API Routes.

Requirements:
1. Export a getAuthUser() function that:
   - Gets the current Clerk user using auth() and currentUser()
   - Checks if user exists in our database by clerkId
   - If not found by clerkId, checks by email (for existing users)
   - If found by email, syncs the clerkId to database
   - If not found at all, creates new user in database
   - Returns user info matching the old NextAuth session format

2. Export an AuthUser interface with: id, email, clerkId, type
3. Export a requireAuth() function that throws if not authenticated
4. Use server-only to ensure it's only used server-side

Database access: Use drizzle with postgres from lib/db/schema.ts pattern
```

**Create `lib/auth/clerk-helpers.ts`:**
```typescript
import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user as userTable } from "@/lib/db/schema";

// Initialize database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export type UserType = "regular";

export interface AuthUser {
  id: string;
  email: string;
  clerkId: string;
  type: UserType;
}

/**
 * Get authenticated user from Clerk and sync with database
 * Use this in Server Components and API Routes instead of NextAuth's auth()
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
```

**What this does:**
1. **First login with Clerk**: Creates user in your database
2. **Existing NextAuth users**: Syncs Clerk ID when they first login
3. **Future logins**: Fast lookup by Clerk ID
4. **Type safety**: Returns same interface as old NextAuth session

**Verify:**
Create a test file to check the helper works:
```typescript
// test-auth.ts (temporary, delete after testing)
import { getAuthUser } from "@/lib/auth/clerk-helpers";

async function test() {
  const user = await getAuthUser();
  console.log("User:", user);
}

test();
```

### Step 1.8: Update API Routes

**Time estimate**: 1-2 hours (7 files to update)

Now update all API routes to use the new Clerk auth helper.

**AI Prompt (use for EACH route):**
```
Update app/(chat)/api/chat/route.ts to use Clerk authentication.

Current code (around line 19):
import { auth, type UserType } from "@/app/(auth)/auth";

And later (around line 97-115):
const session = await auth();
if (!session?.user) {
  return new ChatSDKError("unauthorized").toResponse();
}
// Uses: session.user.id, session.user.type

Replace with:
import { getAuthUser, type UserType } from "@/lib/auth/clerk-helpers";

const user = await getAuthUser();
if (!user) {
  return new ChatSDKError("unauthorized").toResponse();
}
// Uses: user.id, user.type

Update all references from session.user.* to user.*
```

**Files to update (repeat the AI prompt for each):**

1. ✅ `app/(chat)/api/chat/route.ts` (line 19, 97-115)
2. ✅ `app/(chat)/api/chat/[id]/stream/route.ts`
3. ✅ `app/(chat)/api/files/upload/route.ts`
4. ✅ `app/(chat)/api/document/route.ts`
5. ✅ `app/(chat)/api/history/route.ts`
6. ✅ `app/(chat)/api/suggestions/route.ts`
7. ✅ `app/(chat)/api/vote/route.ts`

**Example transformation:**
```typescript
// BEFORE
import { auth, type UserType } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  // ... request parsing ...

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized").toResponse();
  }

  const entitlements = entitlementsByUserType[session.user.type];
  const userId = session.user.id;

  // ... rest of code using session.user.id ...
}

// AFTER
import { getAuthUser, type UserType } from "@/lib/auth/clerk-helpers";

export async function POST(request: Request) {
  // ... request parsing ...

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized").toResponse();
  }

  const entitlements = entitlementsByUserType[user.type];
  const userId = user.id;

  // ... rest of code using user.id ...
}
```

**Verify each route:**
```bash
# Test with curl (will fail auth, but shouldn't crash)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"id":"test","message":"hello"}'

# Should return 401 Unauthorized
```

### Step 1.9: Update Server Components

**Time estimate**: 30 minutes

**AI Prompt:**
```
Update app/(chat)/page.tsx to use Clerk authentication.

Current code (around line 10):
import { auth } from "../(auth)/auth";

const session = await auth();
if (!session) {
  redirect("/api/auth/guest");
}

Replace with:
import { getAuthUser } from "@/lib/auth/clerk-helpers";

const user = await getAuthUser();
if (!user) {
  redirect("/login");
}

Note: We're removing guest user auto-creation. Users must now sign in.
```

**Files to update:**
1. `app/(chat)/page.tsx`
2. `app/(chat)/chat/[id]/page.tsx`

**Example:**
```typescript
// app/(chat)/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
- import { auth } from "../(auth)/auth";
+ import { getAuthUser } from "@/lib/auth/clerk-helpers";

export default async function Page() {
- const session = await auth();
+ const user = await getAuthUser();

- if (!session) {
-   redirect("/api/auth/guest");
- }
+ if (!user) {
+   redirect("/login");
+ }

  const id = generateUUID();

  // ... rest of component
}
```

**Verify:**
```bash
# Visit homepage while logged out
# Should redirect to Clerk's login page
```

### Step 1.10: Update Auth UI Pages

**Time estimate**: 20 minutes

Replace custom login/register forms with Clerk's pre-built components.

**AI Prompt for Login Page:**
```
Replace app/(auth)/login/page.tsx with Clerk's SignIn component.

Remove all existing code and use Clerk's <SignIn /> component.
Style it to match our app's design (center it, use our background color).

Use Clerk's appearance prop to customize styling.
```

**New `app/(auth)/login/page.tsx`:**
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
            formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          },
        }}
      />
    </div>
  );
}
```

**AI Prompt for Register Page:**
```
Replace app/(auth)/register/page.tsx with Clerk's SignUp component.
Use the same styling as the login page.
```

**New `app/(auth)/register/page.tsx`:**
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
            formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          },
        }}
      />
    </div>
  );
}
```

**What happened:**
- ✅ Removed custom form components
- ✅ Removed server actions (login, register)
- ✅ Clerk handles all auth logic
- ✅ Built-in validation, error handling, loading states

### Step 1.11: Update Sidebar User Navigation

**Time estimate**: 30 minutes

**AI Prompt:**
```
Update components/sidebar-user-nav.tsx to use Clerk hooks.

Current code uses:
- useSession() from next-auth/react
- signOut() from next-auth/react
- Guest user detection with guestRegex

Replace with:
- useUser() from @clerk/nextjs
- useClerk().signOut()
- Remove guest user logic

Keep all existing UI (theme toggle, settings link, dropdown menu).
```

**Updated `components/sidebar-user-nav.tsx`:**
```typescript
"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
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

export function SidebarUserNav() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { setTheme, resolvedTheme } = useTheme();

  const userEmail = user?.emailAddresses[0]?.emailAddress;

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
                    Loading user
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
                  alt={userEmail ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={user?.imageUrl ?? `https://avatar.vercel.sh/${userEmail}`}
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {userEmail}
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
                onClick={() => {
                  signOut(() => router.push("/"));
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

**Key changes:**
- ✅ Clerk's `useUser()` provides user data
- ✅ Clerk's `useClerk().signOut()` handles logout
- ✅ Clerk provides `user.imageUrl` (better than generated avatars)
- ✅ No more guest user detection

### Step 1.12: Update Type Definitions

**Time estimate**: 5 minutes

**AI Prompt:**
```
Update lib/ai/entitlements.ts to import UserType from the new location.

Change:
import type { UserType } from "@/app/(auth)/auth";

To:
import type { UserType } from "@/lib/auth/clerk-helpers";

Also, remove the "guest" type from entitlementsByUserType (we're not using
guest users anymore with Clerk).
```

**Updated `lib/ai/entitlements.ts`:**
```typescript
- import type { UserType } from "@/app/(auth)/auth";
+ import type { UserType } from "@/lib/auth/clerk-helpers";
import { chatModelIds } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
- guest: {
-   maxMessagesPerDay: 20,
-   availableChatModelIds: chatModelIds,
- },
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
  },
};
```

### Step 1.13: Clean Up Old Auth Files (Optional for now)

**⚠️ Don't delete these yet!** Keep them until Phase 1 testing is complete.

Files you can delete later:
- `app/(auth)/auth.ts`
- `app/(auth)/auth.config.ts`
- `app/(auth)/api/auth/[...nextauth]/route.ts`
- `app/(auth)/api/auth/guest/route.ts`
- `app/(auth)/actions.ts`
- `components/auth-form.tsx` (if only used for old auth)
- `components/submit-button.tsx` (if only used for old auth)

### Step 1.14: Testing Phase 1

**Time estimate**: 1-2 hours

**Comprehensive Testing Checklist:**

#### 1. Authentication Flow
- [ ] **Sign Up**: Create new account with email/password
  - Go to `/register`
  - Enter email and password
  - Verify email (check inbox)
  - Should redirect to home page
  
- [ ] **Sign In**: Login with existing account
  - Go to `/login`
  - Enter credentials
  - Should redirect to home page
  
- [ ] **Sign Out**: Logout works correctly
  - Click user menu → Sign out
  - Should redirect to home page
  - Should show login page when visiting protected routes

- [ ] **Protected Routes**: Unauthenticated access blocked
  - Visit `/` while logged out → redirects to `/login`
  - Visit `/chat/xxx` while logged out → redirects to `/login`

#### 2. Database Sync
- [ ] **New Users Created**:
  ```sql
  SELECT id, email, "clerkId", "clerkSynced" 
  FROM "User" 
  WHERE email = 'your-test-email@example.com';
  ```
  - Should show: clerkId populated, clerkSynced = true

- [ ] **Existing Users Synced**:
  - Login with an old NextAuth account
  - Check database - clerkId should now be populated

- [ ] **User Data Persists**:
  - Logout and login again
  - User data should still be there
  - Chat history should be preserved

#### 3. API Routes
Test each API endpoint:

```bash
# Get auth cookie from browser DevTools → Application → Cookies
# Copy the __session cookie value

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_COOKIE_VALUE" \
  -d '{"id":"test-123","message":"Hello","modelId":"anthropic-claude-sonnet-4-5"}'

# Should return streaming response (not 401)
```

- [ ] `/api/chat` - Chat creation works
- [ ] `/api/files/upload` - File upload works
- [ ] `/api/document` - Document CRUD works
- [ ] `/api/history` - History retrieval works
- [ ] `/api/vote` - Message voting works

- [ ] **Unauthorized Access Blocked**:
  ```bash
  # Without cookie - should return 401
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"id":"test","message":"hello"}'
  ```

#### 4. UI Components
- [ ] **Sidebar User Navigation**:
  - Shows user email
  - Shows user avatar (Clerk's image or generated)
  - Theme toggle works
  - Settings link works
  - Sign out button works

- [ ] **No Console Errors**:
  - Open browser DevTools → Console
  - Navigate around the app
  - Should see no errors

- [ ] **Loading States**:
  - Clerk components show loading spinners
  - No flash of unauthenticated content

#### 5. Automated Tests

```bash
# Run Playwright tests
pnpm test

# Most tests will fail - that's expected
# We'll fix them in the next step
```

**If Tests Fail:**
The existing tests use NextAuth and need updating. For now, note which tests fail and we'll update them later.

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "CLERK_SECRET_KEY not found" | Environment variable missing | Add to `.env.local`, restart dev server with `pnpm dev` |
| "User is null in API route" | Middleware not protecting route | Check middleware `matcher` includes the route |
| "Database user not created" | `getAuthUser()` error | Check server logs, verify database connection |
| "Redirect loop /login → /" | Incorrect Clerk redirect URLs | Set `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/` |
| "Session undefined" | Missing `await` on `auth()` | Always use `await auth()` |
| "Type error: UserType" | Import from wrong location | Import from `@/lib/auth/clerk-helpers` |

### Debugging Tips

**Enable Clerk debug mode:**
```typescript
// middleware.ts
export default clerkMiddleware(async (auth, request) => {
  // ...
}, {
  debug: process.env.NODE_ENV === "development"
});
```

**Add logging to getAuthUser:**
```typescript
export async function getAuthUser(): Promise<AuthUser | null> {
  console.log("🔍 getAuthUser called");
  
  const { userId: clerkUserId } = await auth();
  console.log("📝 Clerk userId:", clerkUserId);
  
  // ... rest of function with more logs
}
```

**Check Clerk Dashboard:**
- Go to Clerk Dashboard → Users
- Verify users are being created
- Check session activity

### Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [x] All dependencies installed
- [x] Environment variables configured
- [x] Database schema updated
- [x] All API routes updated
- [x] All server components updated
- [x] Auth UI pages using Clerk
- [x] Sidebar user nav updated
- [x] Manual testing passed
- [x] No console errors
- [x] Database sync working
- [x] Old auth files kept (don't delete yet)

**🎉 Congratulations!** Phase 1 is complete. Your app now uses Clerk for authentication.

**Next Steps:**
- Phase 2: Add onboarding workflow for new users
- Phase 3: Enable organizations for team collaboration
- Phase 4: Add multi-user permissions
- Phase 5: Integrate billing with Stripe

---

## Phase 2: Onboarding Workflows

**Duration**: 2-3 days  
**Goal**: Create a welcoming first-time user experience  
**Complexity**: ⭐⭐ (Easy-Moderate)

### Overview

When new users sign up, they should see a friendly onboarding flow that:
1. Welcomes them to the platform
2. Explains key features
3. Collects optional profile information
4. Guides them to create their first chat

This improves user activation and reduces churn.

### Step 2.1: Configure Clerk Redirect

**Time estimate**: 5 minutes

Update Clerk to redirect new users to onboarding after signup.

**In Clerk Dashboard:**
1. Go to "Paths" section
2. Update "After sign up URL" to `/onboarding`
3. Keep "After sign in URL" as `/`

**Or update `.env.local`:**
```bash
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Restart dev server:**
```bash
pnpm dev
```

### Step 2.2: Create Onboarding Route Structure

**Time estimate**: 15 minutes

**AI Prompt:**
```
Create a new route for onboarding:

1. Create app/(onboarding)/layout.tsx
   - Minimal layout (no sidebar, no nav)
   - Just centers the content
   - Meta title: "Welcome to Intellisync Chatbot"

2. Create app/(onboarding)/page.tsx
   - This will be a client component
   - Multi-step wizard UI
   - Will add full component in next step
```

**Create `app/(onboarding)/layout.tsx`:**
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Intellisync Chatbot",
  description: "Complete your profile setup",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
```

**What this does:**
- Creates isolated layout for onboarding
- Centers content vertically and horizontally
- No sidebar or navigation (focused experience)

### Step 2.3: Build Onboarding Flow Component

**Time estimate**: 2-3 hours

**AI Prompt:**
```
Create app/(onboarding)/page.tsx as a client component with a multi-step
onboarding wizard.

Requirements:
1. 4 steps total: Welcome → Info → Features → Complete
2. Progress bar showing current step
3. Back/Next navigation
4. "Skip setup" option
5. Use Clerk's useUser() hook to save completion status
6. Redirect to / if onboarding already complete
7. Save completion status in user.unsafeMetadata

Use shadcn/ui components: Card, Button, Progress
```

**Create `app/(onboarding)/page.tsx`:**
```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Check if onboarding is already complete
  useEffect(() => {
    if (isLoaded && user) {
      const onboardingComplete = user.unsafeMetadata?.onboardingComplete;
      if (onboardingComplete) {
        router.push("/");
      }
    }
  }, [user, isLoaded, router]);

  // Handle completing onboarding
  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
          onboardingCompletedAt: new Date().toISOString(),
        },
      });
      router.push("/");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsLoading(false);
    }
  };

  // Handle skipping onboarding
  const handleSkip = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
          onboardingSkipped: true,
          onboardingCompletedAt: new Date().toISOString(),
        },
      });
      router.push("/");
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
      setIsLoading(false);
    }
  };

  // Handle navigation
  const handleNext = () => {
    if (currentStep === TOTAL_STEPS) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="w-full max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-center text-muted-foreground text-sm">
          Step {currentStep} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step 1: Welcome */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Welcome to Intellisync Chatbot! 👋
            </CardTitle>
            <CardDescription>
              Your AI-powered workspace for intelligent conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 font-semibold text-lg">What you can do:</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-lg">💬</span>
                  <div>
                    <strong className="text-foreground">Chat with advanced AI</strong>
                    <p className="text-sm">Access Claude Sonnet, GPT-5, and Gemini models</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-lg">📝</span>
                  <div>
                    <strong className="text-foreground">Create artifacts</strong>
                    <p className="text-sm">Generate documents, code, and spreadsheets</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-lg">📎</span>
                  <div>
                    <strong className="text-foreground">Upload files</strong>
                    <p className="text-sm">Analyze documents, images, and data</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <strong className="text-foreground">Private by default</strong>
                    <p className="text-sm">Your chats are secure and never used for training</p>
                  </div>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
              Skip setup
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              Get started
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Account Info */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>You're all set!</CardTitle>
            <CardDescription>
              Your account has been created successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <p className="font-medium">Account Active</p>
                  <p className="text-muted-foreground text-sm">
                    Signed in as {user?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>You can customize your profile anytime in Settings.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Features Preview */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Powerful features at your fingertips</CardTitle>
            <CardDescription>
              Here's what makes Intellisync special
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">🎯 Model Switching</h4>
                <p className="text-muted-foreground text-sm">
                  Choose the best AI model for your task mid-conversation
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">💾 Auto-save</h4>
                <p className="text-muted-foreground text-sm">
                  Every chat is automatically saved and organized
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">🎨 Artifacts</h4>
                <p className="text-muted-foreground text-sm">
                  AI-generated content appears in a side panel for easy editing
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">⚡ Fast & Reliable</h4>
                <p className="text-muted-foreground text-sm">
                  Powered by Vercel's edge network for instant responses
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Ready to Go */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>You're ready to start! 🚀</CardTitle>
            <CardDescription>
              Everything is set up and ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-6">
              <h3 className="mb-3 font-semibold">Quick tips to get started:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span>💡</span>
                  <span>Switch models using the dropdown in the chat input</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📎</span>
                  <span>Click the attachment icon to upload files (images, PDFs, code)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>⚙️</span>
                  <span>Access settings and preferences from your user menu</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🔍</span>
                  <span>Use the sidebar to view and search your chat history</span>
                </li>
              </ul>
            </div>
            <div className="text-center text-muted-foreground text-sm">
              <p>Ready to have your first conversation?</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Start chatting"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
```

**What this component does:**
- ✅ 4-step wizard with smooth navigation
- ✅ Progress bar visualization
- ✅ Welcomes new users
- ✅ Explains key features
- ✅ Saves completion status to Clerk metadata
- ✅ Prevents repeat onboarding
- ✅ Option to skip

### Step 2.4: Testing Phase 2

**Manual Testing:**

1. **New User Flow**:
   - [ ] Create a new account at `/register`
   - [ ] Should auto-redirect to `/onboarding`
   - [ ] Navigate through all 4 steps
   - [ ] Click "Start chatting" on final step
   - [ ] Should redirect to `/` (home page)

2. **Skip Functionality**:
   - [ ] Create another test account
   - [ ] On step 1, click "Skip setup"
   - [ ] Should redirect to home page
   - [ ] Check metadata:
     ```javascript
     // Browser console on any page
     console.log(window.Clerk.user.unsafeMetadata);
     // Should show: { onboardingComplete: true, onboardingSkipped: true }
     ```

3. **Returning Users**:
   - [ ] Log out and log back in
   - [ ] Should go directly to `/` (not onboarding)
   - [ ] Try visiting `/onboarding` manually
   - [ ] Should auto-redirect to `/`

4. **Back Navigation**:
   - [ ] Create test account
   - [ ] Go to step 3
   - [ ] Click "Back" twice
   - [ ] Should return to step 1
   - [ ] Progress bar should update

**Check Clerk Metadata:**
```javascript
// In browser console after completing onboarding
const metadata = window.Clerk.user.unsafeMetadata;
console.log({
  complete: metadata.onboardingComplete, // true
  skipped: metadata.onboardingSkipped,   // true if skipped
  completedAt: metadata.onboardingCompletedAt, // ISO timestamp
});
```

### Phase 2 Completion Checklist

- [x] Onboarding route created
- [x] Multi-step wizard implemented
- [x] Progress bar working
- [x] Clerk metadata saving
- [x] Skip functionality working
- [x] Redirect logic working
- [x] All 4 steps display correctly
- [x] Manual testing passed

**🎉 Phase 2 Complete!** New users now get a welcoming onboarding experience.

---

## Phase 3: Organization Features

**Duration**: 5-7 days  
**Goal**: Enable team collaboration with organizations  
**Complexity**: ⭐⭐⭐⭐⭐ (High)

### Overview

Organizations allow teams to:
- Share chats and documents
- Invite team members
- Manage permissions
- Collaborate in real-time

This phase adds significant value for B2B customers.

### Step 3.1: Enable Organizations in Clerk

**Time estimate**: 10 minutes

1. **In Clerk Dashboard**:
   - Go to "Organizations" in left sidebar
   - Click "Enable organizations"
   - Configure settings:
     - ✅ Allow users to create organizations: ON
     - ✅ Allow users in multiple organizations: ON
     - Maximum members per organization: Unlimited (or set limit)
     - Default role for new members: Member

2. **Update Environment** (optional):
   ```bash
   # In .env.local
   NEXT_PUBLIC_CLERK_ALLOW_CREATE_ORGANIZATION=true
   ```

3. **Verify**:
   - Restart dev server
   - Check Clerk Dashboard shows "Organizations: Enabled"

### Step 3.2: Database Schema for Organizations

**Time estimate**: 30 minutes

**AI Prompt:**
```
Update lib/db/schema.ts to add organization support:

1. Create new Organization table:
   - id: varchar(255), primary key - Clerk organization ID
   - name: varchar(255), not null - Organization name
   - slug: varchar(255), unique, not null - URL-friendly name
   - clerkId: varchar(255), unique, not null - Same as id
   - createdAt: timestamp, default now()

2. Update Chat table:
   - Add organizationId: varchar(255), nullable, foreign key to Organization

3. Update Document table:
   - Add organizationId: varchar(255), nullable, foreign key to Organization

Nullable organizationId means:
- null = personal chat/document
- non-null = belongs to organization
```

**Add to `lib/db/schema.ts`:**
```typescript
// After user table definition
export const organization = pgTable("Organization", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk org ID
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  clerkId: varchar("clerkId", { length: 255 }).unique().notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Organization = InferSelectModel<typeof organization>;

// Update chat table (add organizationId)
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  organizationId: varchar("organizationId", { length: 255 })
    .references(() => organization.id), // NEW - nullable
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

// Update document table (add organizationId)
export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    organizationId: varchar("organizationId", { length: 255 })
      .references(() => organization.id), // NEW - nullable
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);
```

**Generate and run migration:**
```bash
pnpm db:generate
# Review migration in lib/db/migrations/
pnpm db:migrate
```

**Verify migration:**
```sql
-- Check Organization table exists
\d "Organization"

-- Check Chat has organizationId
\d "Chat"

-- Check Document has organizationId
\d "Document"
```

### Step 3.3: Update Auth Helper for Organizations

**Time estimate**: 20 minutes

**AI Prompt:**
```
Update lib/auth/clerk-helpers.ts to include organization context.

Add to AuthUser interface:
- orgId: string | null - Current organization ID
- orgSlug: string | null - Current organization slug
- orgRole: string | null - User's role in organization

Update getAuthUser() to extract org data from Clerk's auth():
const { userId, orgId, orgSlug, orgRole } = await auth();
```

**Updated `lib/auth/clerk-helpers.ts`:**
```typescript
export interface AuthUser {
  id: string;
  email: string;
  clerkId: string;
  type: UserType;
  // NEW: Organization context
  orgId: string | null;
  orgSlug: string | null;
  orgRole: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    // Get Clerk session WITH organization context
    const {
      userId: clerkUserId,
      orgId,
      orgSlug,
      orgRole,
    } = await auth();

    if (!clerkUserId) {
      return null;
    }

    // ... existing user lookup code ...

    return {
      id: dbUser.id,
      email: dbUser.email,
      clerkId: clerkUserId,
      type: "regular",
      // NEW: Include org context
      orgId: orgId || null,
      orgSlug: orgSlug || null,
      orgRole: orgRole || null,
    };
  } catch (error) {
    console.error("Error in getAuthUser:", error);
    return null;
  }
}
```

**What this enables:**
- API routes know which organization user is in
- Can filter chats/documents by organization
- Can enforce organization-specific permissions

### Step 3.4: Organization Database Queries

**Time estimate**: 30 minutes

**AI Prompt:**
```
Add organization-related queries to lib/db/queries.ts:

1. createOrganization(id, name, slug, clerkId)
2. getOrganizationByClerkId(clerkId)
3. Update saveChat to accept optional organizationId
4. Create getChatsByOrganizationId(orgId, limit)
```

**Add to `lib/db/queries.ts`:**
```typescript
import { organization } from "./schema";

// Create organization in database
export async function createOrganization({
  id,
  name,
  slug,
  clerkId,
}: {
  id: string;
  name: string;
  slug: string;
  clerkId: string;
}) {
  try {
    return await db
      .insert(organization)
      .values({ id, name, slug, clerkId })
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create organization"
    );
  }
}

// Get organization by Clerk ID
export async function getOrganizationByClerkId(clerkId: string) {
  try {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.clerkId, clerkId))
      .limit(1);

    return org || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get organization"
    );
  }
}

// Get chats for an organization
export async function getChatsByOrganizationId({
  organizationId,
  limit = 50,
}: {
  organizationId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.organizationId, organizationId))
      .orderBy(desc(chat.createdAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by organization"
    );
  }
}

// Update saveChat to support organizations
export async function saveChat({
  id,
  userId,
  title,
  visibility,
  organizationId, // NEW parameter
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  organizationId?: string | null; // Optional
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      organizationId: organizationId || null, // NEW field
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}
```

### Step 3.5: Organization Switcher Component

**Time estimate**: 30 minutes

**AI Prompt:**
```
Create components/organization/organization-switcher.tsx that uses Clerk's
OrganizationSwitcher component.

Requirements:
- Show personal account and organizations
- Allow creating new organizations
- Allow switching between organizations
- Style to match our app theme
- Show in sidebar
```

**Create `components/organization/organization-switcher.tsx`:**
```typescript
"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";

export function CustomOrganizationSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal={false}
      appearance={{
        elements: {
          rootBox: "flex items-center",
          organizationSwitcherTrigger:
            "border border-border bg-background px-3 py-2 rounded-md hover:bg-accent transition-colors",
          organizationSwitcherTriggerIcon: "text-muted-foreground",
          organizationPreviewAvatarBox: "size-6",
          organizationPreviewTextContainer: "text-sm",
          organizationPreviewMainIdentifier: "font-medium text-foreground",
          organizationSwitcherPopoverCard: "bg-background border shadow-lg",
          organizationSwitcherPopoverActionButton: "text-foreground hover:bg-accent",
        },
      }}
      createOrganizationMode="modal"
      afterCreateOrganizationUrl={(org) => `/orgs/${org.slug}`}
      afterSelectOrganizationUrl={(org) => `/orgs/${org.slug}`}
      afterSelectPersonalUrl="/"
    />
  );
}
```

**Add to sidebar layout:**

**AI Prompt:**
```
Add the OrganizationSwitcher to the app sidebar. It should appear above
the chat history list.

Find the sidebar component (likely in app/(chat)/layout.tsx or
components/sidebar.tsx) and add the switcher near the top.
```

**Typical placement:**
```typescript
// In your sidebar component
import { CustomOrganizationSwitcher } from "@/components/organization/organization-switcher";

<Sidebar>
  <SidebarHeader>
    <CustomOrganizationSwitcher />
  </SidebarHeader>
  
  {/* Rest of sidebar content */}
</Sidebar>
```

### Step 3.6: Update API Routes for Organizations

**Time estimate**: 1 hour

**AI Prompt:**
```
Update app/(chat)/api/chat/route.ts to support organization-scoped chats.

When creating a chat:
- Check if user is in an organization context (user.orgId)
- If yes, set chat.organizationId to user.orgId
- If no, leave organizationId as null (personal chat)

Update the saveChat call to include organizationId.
```

**Update `app/(chat)/api/chat/route.ts`:**
```typescript
export async function POST(request: Request) {
  // ... existing code ...

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized").toResponse();
  }

  // ... request parsing ...

  // When saving chat, include organization context
  await saveChat({
    id,
    userId: user.id,
    title,
    visibility,
    organizationId: user.orgId, // NEW - include org context
  });

  // ... rest of code ...
}
```

**What this does:**
- Chats created in organization context belong to that org
- Chats created in personal context belong to user only
- Organization members can see organization chats

### Step 3.7: Organization Routes (Optional)

**Time estimate**: 2-3 hours (optional)

Create dedicated organization pages:

**Create `app/(org)/orgs/[slug]/layout.tsx`:**
```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { orgSlug } = await auth();

  // Verify user has access to this organization
  if (!orgSlug || orgSlug !== params.slug) {
    redirect("/");
  }

  return <div className="flex h-screen">{children}</div>;
}
```

**Create `app/(org)/orgs/[slug]/page.tsx`:**
```typescript
"use client";

import { useOrganization } from "@clerk/nextjs";

export default function OrganizationDashboard() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return <div>Loading organization...</div>;
  }

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 font-bold text-3xl">{organization.name}</h1>
      <p className="text-muted-foreground">
        Organization dashboard - coming soon
      </p>
    </div>
  );
}
```

### Step 3.8: Testing Phase 3

**Manual Testing:**

1. **Create Organization**:
   - [ ] Click organization switcher in sidebar
   - [ ] Click "Create organization"
   - [ ] Enter name (e.g., "Acme Corp")
   - [ ] Organization created successfully

2. **Switch Organizations**:
   - [ ] Click organization switcher
   - [ ] See "Personal" and "Acme Corp"
   - [ ] Switch to "Acme Corp"
   - [ ] URL updates or context changes

3. **Organization Chats**:
   - [ ] While in organization context, create a chat
   - [ ] Check database:
     ```sql
     SELECT id, title, "userId", "organizationId" 
     FROM "Chat" 
     ORDER BY "createdAt" DESC 
     LIMIT 5;
     ```
   - [ ] Should show organizationId populated

4. **Personal vs Org Context**:
   - [ ] Switch to "Personal"
   - [ ] Create a chat
   - [ ] organizationId should be null
   - [ ] Switch back to organization
   - [ ] Should see organization chats

### Phase 3 Completion Checklist

- [x] Organizations enabled in Clerk
- [x] Database schema updated
- [x] Organization queries added
- [x] Auth helper includes org context
- [x] Organization switcher component
- [x] API routes support organizations
- [x] Database sync working
- [x] Manual testing passed

**🎉 Phase 3 Complete!** Users can now create organizations and collaborate.

---

## Phase 4: Multi-User Support

**Duration**: 3-4 days  
**Goal**: Enable team collaboration with roles and permissions  
**Complexity**: ⭐⭐⭐⭐ (High)

### Overview

Multi-user support adds:
- Member invitation system
- Role-based access control (Admin, Member)
- Permission checks for organization resources
- Member management UI

### Step 4.1: Create Permissions Helper

**Time estimate**: 45 minutes

**AI Prompt:**
```
Create lib/auth/permissions.ts with permission checking utilities:

1. hasOrgPermission(permission: string) - Check if user has permission
2. requireOrgAdmin() - Throw error if not admin
3. canAccessOrgChat(chatId: string) - Check chat access
4. canModifyOrgDocument(documentId: string) - Check document access

Use Clerk's auth() to get permissions.
Use database queries to check resource ownership.
```

**Create `lib/auth/permissions.ts`:**
```typescript
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ChatSDKError } from "@/lib/errors";
import { getChatById, getDocumentById } from "@/lib/db/queries";

/**
 * Check if user has a specific organization permission
 */
export async function hasOrgPermission(permission: string): Promise<boolean> {
  const { has } = await auth();
  return has ? has({ permission }) : false;
}

/**
 * Require user to be organization admin
 * Throws error if not admin
 */
export async function requireOrgAdmin() {
  const { orgRole } = await auth();

  if (orgRole !== "org:admin") {
    throw new ChatSDKError("forbidden", "Admin permissions required");
  }
}

/**
 * Check if user can access a specific chat
 * Returns true if:
 * - User owns the chat, OR
 * - Chat belongs to user's organization
 */
export async function canAccessOrgChat(chatId: string): Promise<boolean> {
  const { userId, orgId } = await auth();

  if (!userId) return false;

  const chat = await getChatById({ id: chatId });

  if (!chat) return false;

  // User owns the chat
  if (chat.userId === userId) return true;

  // Chat belongs to user's organization
  if (chat.organizationId && chat.organizationId === orgId) {
    return true;
  }

  return false;
}

/**
 * Check if user can modify a document
 * Returns true if:
 * - User owns the document, OR
 * - User is admin of organization that owns document
 */
export async function canModifyOrgDocument(
  documentId: string
): Promise<boolean> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) return false;

  const doc = await getDocumentById({ id: documentId });

  if (!doc) return false;

  // User owns the document
  if (doc.userId === userId) return true;

  // User is org admin and doc belongs to their org
  if (
    doc.organizationId &&
    doc.organizationId === orgId &&
    orgRole === "org:admin"
  ) {
    return true;
  }

  return false;
}
```

**Use in API routes:**
```typescript
// Example: app/(chat)/api/chat/[id]/route.ts
import { canAccessOrgChat } from "@/lib/auth/permissions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const hasAccess = await canAccessOrgChat(params.id);

  if (!hasAccess) {
    return new ChatSDKError(
      "forbidden",
      "You don't have access to this chat"
    ).toResponse();
  }

  // ... rest of route
}
```

### Step 4.2: Member Management Component

**Time estimate**: 2-3 hours

**AI Prompt:**
```
Create components/organization/member-management.tsx that shows:
1. List of current members with roles
2. Pending invitations
3. Form to invite new members
4. Admin-only remove member action

Use Clerk's useOrganization hook.
Use shadcn/ui components: Card, Button, Input, Avatar, Badge.
```

**Create `components/organization/member-management.tsx`:**
```typescript
"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail } from "lucide-react";

export function MemberManagement() {
  const { organization, memberships, invitations, isLoaded } = useOrganization({
    memberships: {
      pageSize: 50,
    },
    invitations: {
      pageSize: 50,
    },
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!organization || !inviteEmail) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      await organization.inviteMember({
        emailAddress: inviteEmail,
        role: "org:member",
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (error: any) {
      console.error("Failed to invite member:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Member Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Member
          </CardTitle>
          <CardDescription>
            Invite someone to join {organization?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInvite();
                }
              }}
            />
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Invite"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({memberships?.count || 0})</CardTitle>
          <CardDescription>
            People in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberships?.data?.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No members yet
              </p>
            ) : (
              memberships?.data?.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={membership.publicUserData.imageUrl} />
                      <AvatarFallback>
                        {membership.publicUserData.firstName?.[0] ||
                          membership.publicUserData.identifier?.[0] ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {membership.publicUserData.firstName}{" "}
                        {membership.publicUserData.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {membership.publicUserData.identifier}
                      </p>
                    </div>
                  </div>
                  <Badge variant={membership.role === "org:admin" ? "default" : "secondary"}>
                    {membership.role === "org:admin" ? "Admin" : "Member"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations && invitations.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({invitations.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.data.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm">{invitation.emailAddress}</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 4.3: Organization Settings Page

**Time estimate**: 1 hour

**AI Prompt:**
```
Create app/(settings)/settings/organization/page.tsx that shows:
1. Organization details (name, slug, created date)
2. Member management component
3. Organization-specific settings

Use the MemberManagement component we just created.
```

**Create `app/(settings)/settings/organization/page.tsx`:**
```typescript
"use client";

import { useOrganization } from "@clerk/nextjs";
import { MemberManagement } from "@/components/organization/member-management";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OrganizationSettingsPage() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No organization selected. Create or join an organization to access
              team settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and team members
        </p>
      </div>

      <div className="space-y-6">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="font-medium text-sm">Name</dt>
                <dd className="text-muted-foreground">{organization.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-sm">Slug</dt>
                <dd className="font-mono text-muted-foreground text-sm">
                  {organization.slug}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-sm">Created</dt>
                <dd className="text-muted-foreground">
                  {new Date(organization.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Member Management */}
        <MemberManagement />
      </div>
    </div>
  );
}
```

### Step 4.4: Update Queries for Organization Access

**Time estimate**: 1 hour

**AI Prompt:**
```
Create getAccessibleChats() in lib/db/queries.ts that returns:
1. User's personal chats (organizationId = null)
2. Organization chats (organizationId = user's current org)

Use OR condition in SQL to fetch both sets.
```

**Add to `lib/db/queries.ts`:**
```typescript
import { or, and, isNull } from "drizzle-orm";

/**
 * Get all chats accessible to user (personal + organization)
 */
export async function getAccessibleChats({
  userId,
  organizationId,
  limit = 50,
}: {
  userId: string;
  organizationId?: string | null;
  limit?: number;
}) {
  try {
    // Build WHERE conditions
    const conditions = [];

    // Personal chats (user owns + no organization)
    conditions.push(
      and(eq(chat.userId, userId), isNull(chat.organizationId))
    );

    // Organization chats (if user is in an org)
    if (organizationId) {
      conditions.push(eq(chat.organizationId, organizationId));
    }

    const chats = await db
      .select()
      .from(chat)
      .where(or(...conditions))
      .orderBy(desc(chat.createdAt))
      .limit(limit);

    return chats;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get accessible chats"
    );
  }
}
```

### Step 4.5: Testing Phase 4

**Manual Testing:**

1. **Invite Member**:
   - [ ] Go to organization settings
   - [ ] Enter email address
   - [ ] Click "Invite"
   - [ ] Check email inbox for invitation

2. **Accept Invitation**:
   - [ ] Open invitation email
   - [ ] Click accept link
   - [ ] Should join organization
   - [ ] Appears in members list

3. **Role Display**:
   - [ ] Admin shows "Admin" badge
   - [ ] Member shows "Member" badge
   - [ ] Avatars display correctly

4. **Permissions**:
   - [ ] Test as admin: can invite members
   - [ ] Test as member: can view members
   - [ ] Test accessing organization chats

### Phase 4 Completion Checklist

- [x] Permission helpers created
- [x] Member management UI built
- [x] Organization settings page created
- [x] Database queries support org access
- [x] Role badges display correctly
- [x] Invitation system works
- [x] Manual testing passed

**🎉 Phase 4 Complete!** Teams can now collaborate with proper permissions.

---

## Phase 5: Billing Integration

**Duration**: 4-6 days  
**Goal**: Monetize with subscription plans using Stripe  
**Complexity**: ⭐⭐⭐⭐⭐ (Very High)

### Overview

Billing integration enables:
- Subscription plans (Free, Premium, Enterprise)
- Usage tracking and limits
- Stripe payment processing
- Webhook handling for subscription events
- Billing portal for customers

### Step 5.1: Stripe Setup in Clerk

**Time estimate**: 30 minutes

1. **Connect Stripe**:
   - Go to Clerk Dashboard → Monetization → Stripe
   - Click "Connect with Stripe"
   - Follow OAuth flow to connect Stripe account
   - Choose Stripe account (or create new one)

2. **Create Products** in Stripe Dashboard:
   ```
   Product 1: "Free"
   - Price: $0/month
   - Description: "Get started with basic features"
   - Metadata: tier=free
   
   Product 2: "Premium"
   - Price: $20/month
   - Description: "Unlock advanced features and higher limits"
   - Metadata: tier=premium
   
   Product 3: "Enterprise"
   - Price: Contact sales
   - Description: "Custom solutions for teams"
   - Metadata: tier=enterprise
   ```

3. **Configure Clerk Billing**:
   - In Clerk: Monetization → Products
   - Link Stripe products to Clerk
   - Set up subscription tiers

### Step 5.2: Update Entitlements System

**Time estimate**: 30 minutes

**AI Prompt:**
```
Update lib/ai/entitlements.ts to support subscription tiers instead of
user types.

Create new types:
- SubscriptionTier: "free" | "premium" | "enterprise"
- Entitlements for each tier with different limits

Create getUserEntitlements(user) that:
1. Gets subscription tier from user metadata
2. Returns appropriate entitlements
```

**Updated `lib/ai/entitlements.ts`:**
```typescript
import type { AuthUser } from "@/lib/auth/clerk-helpers";
import { chatModelIds } from "./models";

export type SubscriptionTier = "free" | "premium" | "enterprise";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
  maxFileUploadSizeMB: number;
  prioritySupport: boolean;
  teamFeatures: boolean;
};

export const entitlementsByTier: Record<SubscriptionTier, Entitlements> = {
  free: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
    maxFileUploadSizeMB: 10,
    prioritySupport: false,
    teamFeatures: false,
  },
  premium: {
    maxMessagesPerDay: 1000,
    availableChatModelIds: chatModelIds,
    maxFileUploadSizeMB: 50,
    prioritySupport: true,
    teamFeatures: true,
  },
  enterprise: {
    maxMessagesPerDay: Number.POSITIVE_INFINITY,
    availableChatModelIds: chatModelIds,
    maxFileUploadSizeMB: 200,
    prioritySupport: true,
    teamFeatures: true,
  },
};

/**
 * Get entitlements for a user based on their subscription tier
 * Subscription tier is stored in Clerk user metadata
 */
export function getUserEntitlements(user: AuthUser): Entitlements {
  // Get tier from Clerk metadata (set by webhooks)
  const tier = (user.subscriptionTier as SubscriptionTier) || "free";
  return entitlementsByTier[tier];
}
```

### Step 5.3: Billing UI Components

**Time estimate**: 2-3 hours

**AI Prompt:**
```
Create components/settings/billing-section.tsx that shows:
1. Current subscription plan with badge
2. Usage stats (messages used vs limit) with progress bar
3. Plan features list
4. Upgrade button (if on free tier)
5. Manage subscription button (if on paid tier)

Get subscription info from Clerk user metadata.
Use shadcn/ui components.
```

**Create `components/settings/billing-section.tsx`:**
```typescript
"use client";

import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

const PLAN_FEATURES = {
  free: [
    "100 messages per day",
    "10MB file uploads",
    "All AI models",
    "Community support",
  ],
  premium: [
    "1,000 messages per day",
    "50MB file uploads",
    "All AI models",
    "Priority support",
    "Team collaboration",
  ],
  enterprise: [
    "Unlimited messages",
    "200MB file uploads",
    "All AI models",
    "Dedicated support",
    "Advanced team features",
    "Custom integrations",
  ],
};

export function BillingSection() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan =
    (user?.publicMetadata?.subscriptionTier as string) || "free";
  const messagesUsed = (user?.publicMetadata?.messagesUsedToday as number) || 0;
  const messageLimit =
    currentPlan === "free"
      ? 100
      : currentPlan === "premium"
        ? 1000
        : Number.POSITIVE_INFINITY;

  const usagePercent =
    messageLimit === Number.POSITIVE_INFINITY
      ? 0
      : (messagesUsed / messageLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge
              variant={currentPlan === "free" ? "secondary" : "default"}
              className="capitalize"
            >
              {currentPlan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Messages today</span>
              <span className="font-medium">
                {messagesUsed} /{" "}
                {messageLimit === Number.POSITIVE_INFINITY ? "∞" : messageLimit}
              </span>
            </div>
            {messageLimit !== Number.POSITIVE_INFINITY && (
              <Progress value={usagePercent} className="h-2" />
            )}
          </div>

          {/* Plan Features */}
          <div>
            <h4 className="mb-3 font-semibold text-sm">Plan includes:</h4>
            <ul className="space-y-2">
              {PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES]?.map(
                (feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Card (Free tier only) */}
      {currentPlan === "free" && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle>Upgrade to Premium</CardTitle>
            <CardDescription>
              Unlock more features and higher limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-4xl">$20</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                10x more messages per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                5x larger file uploads
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Team collaboration
              </li>
            </ul>
            <Button className="w-full" size="lg">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage Subscription (Paid tiers) */}
      {currentPlan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Update payment method or cancel subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 5.4: Webhook Handler

**Time estimate**: 2 hours

**AI Prompt:**
```
Create app/api/webhooks/clerk/route.ts to handle Clerk webhooks.

Handle these events:
1. user.created - Sync user to database
2. user.updated - Update subscription metadata
3. organization.created - Sync organization to database
4. session.created - Track logins (optional)

Use Svix to verify webhook signatures.
```

**Create `app/api/webhooks/clerk/route.ts`:**
```typescript
import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import {
  createUserWithClerk,
  syncClerkIdToUser,
  createOrganization,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  // Get headers
  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle events
  const eventType = evt.type;
  console.log(`📨 Webhook received: ${eventType}`);

  switch (eventType) {
    case "user.created": {
      const { id: clerkId, email_addresses } = evt.data;
      const email = email_addresses[0]?.email_address;

      if (email && clerkId) {
        try {
          await createUserWithClerk({ email, clerkId });
          console.log(`✅ Created user in DB: ${email}`);
        } catch (error) {
          console.error("Failed to create user:", error);
        }
      }
      break;
    }

    case "user.updated": {
      const { id: clerkId, public_metadata } = evt.data;

      console.log(`📝 User ${clerkId} updated:`, public_metadata);

      // Subscription metadata is automatically synced by Clerk
      // We just log it here for debugging
      break;
    }

    case "organization.created": {
      const { id, name, slug } = evt.data;

      try {
        await createOrganization({
          id,
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
          clerkId: id,
        });
        console.log(`✅ Created organization: ${name}`);
      } catch (error) {
        console.error("Failed to create organization:", error);
      }
      break;
    }

    case "organizationMembership.created": {
      console.log("👥 New organization member:", evt.data);
      // Track membership if needed
      break;
    }

    case "session.created": {
      // Optional: Track user logins
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${eventType}`);
  }

  return new Response("Webhook processed", { status: 200 });
}
```

### Step 5.5: Configure Webhooks in Clerk

**Time estimate**: 15 minutes

1. **In Clerk Dashboard**:
   - Go to "Webhooks" section
   - Click "Add Endpoint"
   - Endpoint URL: `https://yourdomain.com/api/webhooks/clerk`
   - Select events:
     - ✅ user.created
     - ✅ user.updated
     - ✅ organization.created
     - ✅ organizationMembership.created

2. **Get Webhook Secret**:
   - After creating endpoint, copy the "Signing Secret"
   - Add to `.env.local`:
     ```bash
     CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     ```

3. **For Local Development**:
   ```bash
   # Install ngrok
   brew install ngrok
   
   # Start tunnel
   ngrok http 3000
   
   # Use ngrok URL in Clerk webhook settings
   # https://xxxx.ngrok.io/api/webhooks/clerk
   ```

### Step 5.6: Update API Routes with Subscription Checks

**Time estimate**: 1 hour

**AI Prompt:**
```
Update app/(chat)/api/chat/route.ts to check subscription limits before
processing chat requests.

1. Get user entitlements using getUserEntitlements()
2. Check if user has exceeded daily message limit
3. Return appropriate error if limit exceeded
```

**Update `app/(chat)/api/chat/route.ts`:**
```typescript
import { getUserEntitlements } from "@/lib/ai/entitlements";

export async function POST(request: Request) {
  // ... existing code ...

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized").toResponse();
  }

  // Get entitlements based on subscription tier
  const entitlements = getUserEntitlements(user);

  // Check message limit
  const messageCount = await getMessageCountByUserId({
    id: user.id,
    differenceInHours: 24,
  });

  if (messageCount >= entitlements.maxMessagesPerDay) {
    return new ChatSDKError(
      "rate_limit_exceeded",
      `Daily message limit reached (${entitlements.maxMessagesPerDay} messages). Upgrade your plan for higher limits.`
    ).toResponse();
  }

  // ... rest of chat processing ...
}
```

### Step 5.7: Create Billing Settings Page

**Time estimate**: 30 minutes

**AI Prompt:**
```
Create app/(settings)/settings/billing/page.tsx that displays the
BillingSection component we created earlier.

Add authentication check and proper layout.
```

**Create `app/(settings)/settings/billing/page.tsx`:**
```typescript
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { redirect } from "next/navigation";
import { BillingSection } from "@/components/settings/billing-section";

export default async function BillingPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view usage statistics
        </p>
      </div>

      <BillingSection />
    </div>
  );
}
```

### Step 5.8: Testing Phase 5

**Manual Testing:**

1. **Webhook Delivery**:
   - [ ] Check Clerk Dashboard → Webhooks → Your Endpoint
   - [ ] View recent deliveries
   - [ ] All should show 200 status

2. **User Creation**:
   - [ ] Sign up new user
   - [ ] Check server logs for "Created user in DB"
   - [ ] Verify in database

3. **Billing Page**:
   - [ ] Navigate to /settings/billing
   - [ ] Shows current plan (free)
   - [ ] Shows usage stats
   - [ ] Shows upgrade button

4. **Rate Limiting**:
   - [ ] Make 100+ chat requests (free tier limit)
   - [ ] Should get rate limit error
   - [ ] Error message should suggest upgrade

**Test Webhooks Locally:**
```bash
# With ngrok running
# In Clerk Dashboard → Webhooks → Your Endpoint → Send Event
# Choose "user.created" event
# Check server logs for webhook processing
```

### Phase 5 Completion Checklist

- [x] Stripe connected to Clerk
- [x] Subscription products created
- [x] Entitlements system updated
- [x] Billing UI components created
- [x] Webhook handler implemented
- [x] Webhooks configured in Clerk
- [x] Rate limiting implemented
- [x] Billing page created
- [x] Manual testing passed

**🎉 Phase 5 Complete!** Your app now has subscription-based monetization.

---

## Phase 6: Migration & Deployment

**Duration**: 2-3 days  
**Goal**: Migrate existing users and deploy to production  
**Complexity**: ⭐⭐⭐⭐ (High)

### Overview

Final phase includes:
- User migration script for existing NextAuth users
- Comprehensive testing checklist
- Production deployment
- Post-deployment verification
- Cleanup of old code

### Step 6.1: Create User Migration Script

**Time estimate**: 1-2 hours

**AI Prompt:**
```
Create scripts/migrate-users-to-clerk.ts that:

1. Fetches all users from database without clerkId
2. Creates users in Clerk via Backend API
3. Sends password reset emails (users must set new password)
4. Updates database with clerkId and clerkSynced = true
5. Logs success/failure for each user

Use @clerk/backend for server-side user creation.
Handle errors gracefully.
```

**First, add Clerk Backend SDK:**
```bash
pnpm add @clerk/backend
```

**Create `scripts/migrate-users-to-clerk.ts`:**
```typescript
import { clerkClient } from "@clerk/backend";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNull } from "drizzle-orm";
import postgres from "postgres";
import { user as userTable } from "../lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function migrateUsers() {
  console.log("🚀 Starting user migration to Clerk...\n");

  try {
    // Get all users without Clerk ID
    const usersToMigrate = await db
      .select()
      .from(userTable)
      .where(isNull(userTable.clerkId));

    console.log(`📊 Found ${usersToMigrate.length} users to migrate\n`);

    if (usersToMigrate.length === 0) {
      console.log("✅ No users to migrate!");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const user of usersToMigrate) {
      try {
        console.log(`📝 Migrating: ${user.email}`);

        // Create user in Clerk
        const clerkUser = await clerkClient.users.createUser({
          emailAddress: [user.email],
          skipPasswordRequirement: true, // Will send password reset
          publicMetadata: {
            migratedFromNextAuth: true,
            originalUserId: user.id,
            subscriptionTier: "free", // Default tier
          },
        });

        // Send password reset email
        await clerkClient.users.sendPasswordResetEmail({
          userId: clerkUser.id,
          emailAddress: user.email,
        });

        // Update database
        await db
          .update(userTable)
          .set({
            clerkId: clerkUser.id,
            clerkSynced: true,
          })
          .where(eq(userTable.id, user.id));

        console.log(`✅ Success: ${user.email} → ${clerkUser.id}`);
        console.log(`📧 Password reset sent to ${user.email}\n`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed: ${user.email}`);
        console.error(`   Error: ${error.message}\n`);
        failCount++;
        errors.push({
          email: user.email,
          error: error.message,
        });
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total users:      ${usersToMigrate.length}`);
    console.log(`✅ Successful:    ${successCount}`);
    console.log(`❌ Failed:        ${failCount}`);
    console.log("=".repeat(50));

    if (errors.length > 0) {
      console.log("\n❌ ERRORS:");
      for (const err of errors) {
        console.log(`  ${err.email}: ${err.error}`);
      }
    }
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log("\n✨ Migration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
```

**Add to `package.json` scripts:**
```json
{
  "scripts": {
    "migrate:users": "tsx scripts/migrate-users-to-clerk.ts"
  }
}
```

**Run migration (after testing in dev):**
```bash
pnpm migrate:users
```

### Step 6.2: Comprehensive Testing Plan

**Pre-Deployment Checklist:**

#### Authentication & Sessions
- [ ] New user signup works
- [ ] User login works
- [ ] Password reset works
- [ ] OAuth providers work (if enabled)
- [ ] Session persists across page refreshes
- [ ] Logout works and clears session
- [ ] Protected routes redirect to /login

#### Database Sync
- [ ] New users created in DB with clerkId
- [ ] Existing users synced on first login
- [ ] No duplicate users created
- [ ] All foreign key relationships intact

#### API Routes
- [ ] `/api/chat` - Chat creation
- [ ] `/api/files/upload` - File uploads
- [ ] `/api/document` - Document CRUD
- [ ] `/api/history` - History retrieval
- [ ] `/api/suggestions` - Suggestions
- [ ] `/api/vote` - Message voting
- [ ] All return 401 when not authenticated

#### Organizations
- [ ] Can create organization
- [ ] Can switch organizations
- [ ] Organization chats scoped correctly
- [ ] Member invitations work
- [ ] Role permissions enforced
- [ ] Organization switcher in sidebar

#### Billing
- [ ] Billing page shows subscription
- [ ] Usage stats accurate
- [ ] Rate limiting enforced
- [ ] Upgrade button works (test mode)
- [ ] Webhooks delivered
- [ ] Subscription changes reflect in UI

#### UI/UX
- [ ] No console errors
- [ ] Loading states work
- [ ] Error messages clear
- [ ] Responsive on mobile
- [ ] Dark/light theme works
- [ ] Sidebar navigation works

#### Playwright E2E Tests
```bash
pnpm test
```
- [ ] All tests pass or updated
- [ ] New tests added for Clerk flows

### Step 6.3: Environment Variables Checklist

**Production `.env` must include:**

```bash
# Clerk (Production keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Database
POSTGRES_URL=postgresql://user:pass@host:5432/dbname

# AI Gateway
AI_GATEWAY_API_KEY=xxxxxxxxxxxxx
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com

# Vercel
BLOB_READ_WRITE_TOKEN=xxxxxxxxxxxxx

# Redis (optional)
REDIS_URL=redis://user:pass@host:6379

# Next.js
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Step 6.4: Deploy to Production

**Deployment Steps:**

1. **Backup Production Database**:
   ```bash
   pg_dump $PRODUCTION_POSTGRES_URL > backup_pre_clerk_$(date +%Y%m%d).sql
   ```

2. **Update Environment Variables** (if using Vercel):
   ```bash
   vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
   vercel env add CLERK_SECRET_KEY production
   vercel env add CLERK_WEBHOOK_SECRET production
   # ... add all other variables
   ```

3. **Deploy Application**:
   ```bash
   git push origin main
   # Or trigger manual deployment in Vercel dashboard
   ```

4. **Verify Build**:
   - Check build logs for errors
   - Migrations should run automatically (via `build` script)

5. **Update Clerk Webhook URL**:
   - In Clerk Dashboard → Webhooks
   - Update endpoint URL to production domain
   - Test webhook delivery

6. **Run User Migration** (if needed):
   ```bash
   # SSH into production or run locally with production DB
   NODE_ENV=production pnpm migrate:users
   ```

7. **Monitor Deployment**:
   - Check application logs
   - Monitor error tracking (Sentry, etc.)
   - Watch user sign-ups

### Step 6.5: Post-Deployment Verification

**Manual Checks:**

1. **Visit Production Site**:
   - [ ] Site loads without errors
   - [ ] Can access /login and /register
   - [ ] Clerk components load

2. **Test User Flows**:
   - [ ] Sign up new account
   - [ ] Verify email
   - [ ] Complete onboarding
   - [ ] Create first chat
   - [ ] Sign out and sign in

3. **Database Verification**:
   ```sql
   -- Check migrated users
   SELECT COUNT(*) FROM "User" WHERE "clerkSynced" = true;
   
   -- Check recent signups
   SELECT email, "clerkId", "createdAt"
   FROM "User"
   WHERE "createdAt" > NOW() - INTERVAL '1 hour'
   ORDER BY "createdAt" DESC;
   
   -- Check organizations
   SELECT * FROM "Organization";
   
   -- Check organization chats
   SELECT COUNT(*) FROM "Chat" WHERE "organizationId" IS NOT NULL;
   ```

4. **Webhook Verification**:
   - Clerk Dashboard → Webhooks → View Deliveries
   - All recent webhooks should show 200 status

5. **Error Monitoring**:
   - Check error tracking service
   - No new Clerk-related errors

### Step 6.6: Clean Up Old Code

**⚠️ Only after confirming everything works for 1-2 weeks**

**AI Prompt:**
```
Delete the following NextAuth-related files as they're no longer needed:

Files to delete:
- app/(auth)/auth.ts
- app/(auth)/auth.config.ts
- app/(auth)/api/auth/[...nextauth]/route.ts
- app/(auth)/api/auth/guest/route.ts
- app/(auth)/actions.ts
- components/auth-form.tsx
- components/submit-button.tsx (if only used for auth)
- lib/constants.ts (remove guest regex)

Create a final database migration to drop the password column from User table.
```

**Final database migration:**
```bash
pnpm db:generate
# Manually create migration to drop password column
```

```sql
-- In migration file
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
```

```bash
pnpm db:migrate
```

### Phase 6 Completion Checklist

- [x] User migration script created
- [x] Migration tested in dev/staging
- [x] Comprehensive testing plan executed
- [x] All tests passing
- [x] Environment variables configured
- [x] Deployed to production
- [x] Webhooks configured for production
- [x] User migration run successfully
- [x] Post-deployment verification complete
- [x] Monitoring in place
- [x] Old code cleaned up (after 1-2 weeks)

**🎉🎉 ALL PHASES COMPLETE! 🎉🎉**

Your application now has:
- ✅ Modern Clerk authentication
- ✅ Smooth onboarding experience
- ✅ Organization collaboration
- ✅ Multi-user permissions
- ✅ Subscription billing
- ✅ Production-ready deployment

---

## Testing Strategies

### Unit Testing

**Test database queries:**
```typescript
// tests/unit/queries.test.ts
import { describe, test, expect } from "vitest";
import { createUserWithClerk, getUserByClerkId } from "@/lib/db/queries";

describe("User Queries", () => {
  test("should create user with Clerk ID", async () => {
    const user = await createUserWithClerk({
      email: "test@example.com",
      clerkId: "user_test123",
    });

    expect(user.clerkId).toBe("user_test123");
    expect(user.clerkSynced).toBe(true);
  });

  test("should find user by Clerk ID", async () => {
    const user = await getUserByClerkId("user_test123");
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });
});
```

### Integration Testing

**Test API routes with Clerk auth:**
```typescript
// tests/integration/api-chat.test.ts
import { describe, test, expect } from "vitest";
import { POST } from "@/app/(chat)/api/chat/route";

describe("POST /api/chat", () => {
  test("should require authentication", async () => {
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ id: "test", message: "hello" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  // Add test with mocked Clerk auth
});
```

### E2E Testing with Playwright

**Update Playwright tests for Clerk:**
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication with Clerk", () => {
  test("should sign up new user", async ({ page }) => {
    await page.goto("/register");
    
    // Fill Clerk signup form
    await page.fill('input[name="emailAddress"]', "test@example.com");
    await page.fill('input[name="password"]', "SecurePassword123!");
    await page.click('button[type="submit"]');
    
    // Should redirect to onboarding
    await expect(page).toHaveURL("/onboarding");
  });

  test("should complete onboarding", async ({ page }) => {
    // Login first (helper function)
    await loginWithClerk(page, "test@example.com", "SecurePassword123!");
    
    // Complete onboarding
    await page.goto("/onboarding");
    await page.click('button:has-text("Get started")');
    // ... navigate through steps
    await page.click('button:has-text("Start chatting")');
    
    // Should redirect to home
    await expect(page).toHaveURL("/");
  });
});
```

---

## Troubleshooting Guide

### Common Issues

#### "CLERK_SECRET_KEY not found"

**Cause**: Environment variable missing or not loaded

**Solution**:
1. Check `.env.local` has the variable
2. Restart dev server: `pnpm dev`
3. Verify variable name (no typos)
4. Check it's prefixed correctly (no `NEXT_PUBLIC_` for secret key)

#### "User is null in API route"

**Cause**: Middleware not protecting route or `auth()` returns null

**Solution**:
1. Check middleware `matcher` includes the route
2. Ensure route is not in public routes list
3. Add logging to `getAuthUser()`:
   ```typescript
   console.log("Clerk userId:", userId);
   ```
4. Check browser has `__session` cookie

#### "Database user not created"

**Cause**: Error in `getAuthUser()` or database connection issue

**Solution**:
1. Check server logs for errors
2. Verify database connection: `SELECT 1;`
3. Add try-catch with detailed logging
4. Check user table has `clerkId` column

#### "Redirect loop /login → /"

**Cause**: Incorrect Clerk redirect URLs

**Solution**:
1. Check `.env.local`:
   ```bash
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   ```
2. Not `/login`!
3. Restart dev server

#### "Type error: UserType"

**Cause**: Importing from wrong location

**Solution**:
```typescript
// Correct
import type { UserType } from "@/lib/auth/clerk-helpers";

// Incorrect
import type { UserType } from "@/app/(auth)/auth"; // File deleted
```

#### "Organization not syncing to database"

**Cause**: Webhook not firing or webhook handler error

**Solution**:
1. Check Clerk Dashboard → Webhooks → Deliveries
2. Look for failed deliveries
3. Check webhook handler logs
4. Verify `CLERK_WEBHOOK_SECRET` is correct

#### "Subscription tier not updating"

**Cause**: Webhook not processing subscription events

**Solution**:
1. Check webhook includes `user.updated` event
2. Verify Stripe is connected to Clerk
3. Test subscription change in Stripe dashboard
4. Check user metadata in Clerk Dashboard

---

## AI Assistant Prompts Reference

### Phase 1 Prompts

```
Install Clerk and update my root layout to use ClerkProvider instead of
SessionProvider. Current layout file: app/layout.tsx
```

```
Convert this API route from NextAuth to Clerk. Replace auth() calls with
getAuthUser() helper. Route file: app/(chat)/api/chat/route.ts
```

```
Update middleware.ts to use clerkMiddleware. Protect all routes except
/login, /register, /api/webhooks, /ping. Keep Playwright /ping handler.
```

### Phase 2 Prompts

```
Create a 4-step onboarding flow in app/(onboarding)/page.tsx. Use Clerk's
useUser hook to save completion status. Include progress bar and skip option.
```

### Phase 3 Prompts

```
Add Organization table to lib/db/schema.ts. Include id, name, slug, clerkId.
Add nullable organizationId to Chat and Document tables.
```

```
Update lib/auth/clerk-helpers.ts to include orgId, orgSlug, orgRole in
AuthUser interface. Extract from Clerk's auth() call.
```

### Phase 4 Prompts

```
Create lib/auth/permissions.ts with permission helpers: hasOrgPermission,
requireOrgAdmin, canAccessOrgChat, canModifyOrgDocument.
```

```
Create components/organization/member-management.tsx with member list,
invitation form, and role badges. Use Clerk's useOrganization hook.
```

### Phase 5 Prompts

```
Update lib/ai/entitlements.ts to support subscription tiers (free, premium,
enterprise) instead of user types. Include different limits for each tier.
```

```
Create app/api/webhooks/clerk/route.ts to handle Clerk webhooks. Process
user.created, user.updated, organization.created events. Use Svix for
verification.
```

### Phase 6 Prompts

```
Create scripts/migrate-users-to-clerk.ts to migrate existing NextAuth users
to Clerk. Use Clerk Backend SDK to create users and send password resets.
```

---

## Additional Resources

### Documentation
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
- [Clerk Billing (Stripe)](https://clerk.com/docs/monetization/stripe)
- [Drizzle ORM](https://orm.drizzle.team)
- [Vercel Deployment](https://vercel.com/docs)

### Example Projects
- [Clerk Next.js App Router Example](https://github.com/clerk/clerk-nextjs-app-router-example)
- [Clerk Organizations Demo](https://github.com/clerk/organizations-demo)
- [Clerk SaaS Starter](https://github.com/clerk/saas-starter)

### Video Tutorials
- [Clerk + Next.js Setup](https://www.youtube.com/clerk)
- [Building SaaS with Organizations](https://www.youtube.com/clerk)
- [Stripe Billing Integration](https://www.youtube.com/stripe)

### Support
- [Clerk Discord](https://clerk.com/discord) - Active community support
- [Clerk Support](mailto:support@clerk.com) - Direct support
- [GitHub Issues](https://github.com/clerk/javascript/issues) - Bug reports

### Tools
- [Clerk CLI](https://clerk.com/docs/references/cli) - Command-line tools
- [ngrok](https://ngrok.com) - Local webhook testing
- [Stripe CLI](https://stripe.com/docs/stripe-cli) - Stripe testing

---

## Conclusion

**Congratulations!** 🎉

You've successfully migrated from NextAuth.js to Clerk while adding powerful new features:

✅ **Modern Authentication**: Clerk handles all auth complexities  
✅ **Smooth Onboarding**: New users get a welcoming experience  
✅ **Team Collaboration**: Organizations enable team workflows  
✅ **Role-Based Access**: Proper permissions for team members  
✅ **Subscription Billing**: Monetize with Stripe integration  
✅ **Production Ready**: Deployed and tested thoroughly  

### Key Achievements

- **Migration Completed**: All users synced to Clerk
- **Database Updated**: Schema supports organizations and billing
- **API Routes Protected**: Proper authentication on all endpoints
- **UI Modernized**: Clerk components replace custom auth forms
- **Features Added**: Onboarding, organizations, billing
- **Tests Passing**: Comprehensive testing validates functionality

### What's Next?

**Immediate (Week 1-2):**
- Monitor production for issues
- Gather user feedback
- Track subscription conversions

**Short-term (Month 1):**
- Add more onboarding steps if needed
- Enhance organization features
- Optimize billing flows

**Long-term:**
- Add more subscription tiers
- Build team collaboration features
- Implement advanced permissions
- Add organization analytics

### Best Practices Going Forward

1. **Keep Clerk Updated**: Regularly update `@clerk/nextjs`
2. **Monitor Webhooks**: Check Clerk Dashboard for failed deliveries
3. **Track Usage**: Use analytics to understand user behavior
4. **Test Changes**: Always test in staging before production
5. **Backup Data**: Regular database backups are critical

### Timeline Recap

- **Phase 1**: 3-5 days - Core Clerk migration ✅
- **Phase 2**: 2-3 days - Onboarding workflows ✅
- **Phase 3**: 5-7 days - Organization features ✅
- **Phase 4**: 3-4 days - Multi-user support ✅
- **Phase 5**: 4-6 days - Billing integration ✅
- **Phase 6**: 2-3 days - Migration & deployment ✅

**Total**: 19-28 days for a junior developer with AI assistance

### Final Notes

- **AI Assistants**: Used throughout to accelerate development
- **Incremental Progress**: Each phase builds on the previous
- **Testing**: Comprehensive testing at each phase
- **Documentation**: This guide is your reference

**You did it!** 🚀

Your AI chatbot now has enterprise-grade authentication, collaboration, and monetization features. Users can sign up, create teams, and subscribe - all powered by Clerk and Stripe.

---

**Need Help?**

- Review the [Troubleshooting Guide](#troubleshooting-guide)
- Check [Clerk Documentation](https://clerk.com/docs)
- Ask in [Clerk Discord](https://clerk.com/discord)
- Use AI assistants with prompts from this guide

**Happy coding!** 💻✨

GUIDE_EOF

wc -l /home/hilton/Documents/ledgerbot/CLERK_MIGRATION_GUIDE.md
