import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/queries"; // REUSE existing connection
import { user as userTable } from "@/lib/db/schema";
import type { AuthUser } from "@/lib/types/auth";

/**
 * Get authenticated user from Clerk and sync with database
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

    // Step 2: Try to find by email (existing user)
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

/**
 * Check if current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}
