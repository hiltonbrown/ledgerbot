import type { XeroConnection } from "@/lib/db/schema";

export type { XeroConnection };

export type XeroTokenSet = {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
};

export type XeroTenant = {
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
};

export interface DecryptedXeroConnection
  extends Omit<XeroConnection, "accessToken" | "refreshToken"> {
  accessToken: string;
  refreshToken: string;
}

export type XeroConnectionInfo = {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: "ORGANISATION" | "PRACTICEMANAGER" | "PRACTICE";
  tenantName: string | null;
  createdDateUtc: string;
  updatedDateUtc: string;
};
