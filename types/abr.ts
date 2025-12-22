export type AbrQueryKind = "ABN" | "ACN" | "BusinessName" | "Unknown";

export type AbnStatus = "Active" | "Cancelled" | "Unknown";

export interface GstRegistration {
  status: "Registered" | "Not Registered" | "Unknown";
  effectiveFrom: string | null; // ISO Date YYYY-MM-DD
  effectiveTo: string | null; // ISO Date YYYY-MM-DD
}

export interface BusinessNameRecord {
  name: string;
  isTradingName: boolean; // True if Trading Name, False if Business Name
  effectiveFrom: string;
}

export interface BusinessLocation {
  state: string;
  postcode: string;
}

export interface DgrStatus {
  isDgr: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface AbrLookupResult {
  abn: string;
  abnStatus: AbnStatus;
  abnStatusEffectiveFrom: string; // ISO Date

  acn: string | null;

  entityName: string;
  entityType: string; // e.g., "Australian Private Company"
  entityTypeCode: string | null;

  gst: GstRegistration;
  dgr: DgrStatus;

  businessNames: BusinessNameRecord[];
  mainBusinessLocation: BusinessLocation;

  score?: number; // For name search relevance
}

export interface AbrSearchResult {
  query: string;
  kind: AbrQueryKind;
  results: AbrLookupResult[];
  error?: string;
}
