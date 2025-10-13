/**
 * Shared authentication types for the application
 * Used by both Clerk helpers and entitlements system
 */

export type UserType = "regular"; // Guest removed

export type AuthUser = {
  id: string; // Database UUID
  email: string;
  clerkId: string; // Clerk user ID
  type: UserType;
};
