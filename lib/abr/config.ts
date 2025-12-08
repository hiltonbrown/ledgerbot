export const abnLookupConfig = {
  get enabled() {
    return process.env.ABN_LOOKUP_ENABLED === "true";
  },
  get guid() {
    return process.env.ABN_LOOKUP_GUID;
  },
  get baseUrl() {
    return process.env.ABN_LOOKUP_BASE_URL ?? "https://abr.business.gov.au/json";
  },
};
