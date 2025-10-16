import type { XeroConnection } from "@/lib/db/schema";

export type { XeroConnection };

export interface XeroTokenSet {
	access_token: string;
	refresh_token: string;
	expires_at: Date;
}

export interface XeroTenant {
	tenantId: string;
	tenantName?: string;
	tenantType?: string;
}

export interface DecryptedXeroConnection extends Omit<XeroConnection, "accessToken" | "refreshToken"> {
	accessToken: string;
	refreshToken: string;
}
