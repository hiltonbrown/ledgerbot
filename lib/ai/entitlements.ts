import type { UserType } from "@/lib/types/auth";
import { chatModelIds } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
  maxContextFiles: number;
  maxContextTokens: number;
  maxStorageBytes: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
    maxContextFiles: 50,
    maxContextTokens: 10_000,
    maxStorageBytes: 100 * 1024 * 1024,
  },

  /*
   * TODO: For users with an account and a paid membership
   * premium: {
   *   maxMessagesPerDay: 1000,
   *   availableChatModelIds: chatModelIds,
   * },
   */
};
