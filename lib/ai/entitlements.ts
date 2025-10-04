import type { UserType } from "@/lib/types/auth";
import { chatModelIds } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
  },

  /*
   * TODO: For users with an account and a paid membership
   * premium: {
   *   maxMessagesPerDay: 1000,
   *   availableChatModelIds: chatModelIds,
   * },
   */
};
