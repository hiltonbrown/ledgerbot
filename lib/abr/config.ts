export const abnLookupConfig = {
  enabled: process.env.ABN_LOOKUP_ENABLED === "true",
  guid: process.env.ABN_LOOKUP_GUID,
  baseUrl: process.env.ABN_LOOKUP_BASE_URL ?? "https://abr.business.gov.au/json",
};
