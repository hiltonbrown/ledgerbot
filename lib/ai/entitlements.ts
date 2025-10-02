import type { UserType } from "@/app/(auth)/auth";
import { chatModelIds } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: string[];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: chatModelIds,
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModelIds,
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
