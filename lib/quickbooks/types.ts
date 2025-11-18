import type { QuickBooksConnection } from "@/lib/db/schema";

export type { QuickBooksConnection };

export interface QuickBooksTokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export interface QuickBooksCompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: {
    City?: string;
    Country?: string;
    CountrySubDivisionCode?: string;
  };
  Country?: string;
  FiscalYearStartMonth?: string;
  CompanyCurrency?: {
    value: string;
    name: string;
  };
  SupportedLanguages?: string;
  Email?: {
    Address?: string;
  };
  WebAddr?: {
    URI?: string;
  };
  PrimaryPhone?: {
    FreeFormNumber?: string;
  };
}

export interface DecryptedQuickBooksConnection
  extends Omit<QuickBooksConnection, "accessToken" | "refreshToken"> {
  accessToken: string;
  refreshToken: string;
}

export interface QuickBooksOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
}

export interface QuickBooksAPIResponse<T> {
  QueryResponse?: {
    [key: string]: T[];
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
  time?: string;
  fault?: {
    error: Array<{
      message: string;
      detail: string;
      code: string;
    }>;
    type: string;
  };
}

export interface QuickBooksOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}
