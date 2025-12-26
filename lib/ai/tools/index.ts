// Tool IDs that are always available to the AI
export type ToolId =
  | "getWeather"
  | "createDocument"
  | "updateDocument"
  | "requestSuggestions"
  | "abn_search_entity"
  | "abn_get_details"
  | "abn_validate_xero_contact"
  | "abn_verify_xero_invoice";

// All tools are always enabled
export const defaultSelectedTools: ToolId[] = [
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "abn_search_entity",
  "abn_get_details",
  "abn_validate_xero_contact",
  "abn_verify_xero_invoice",
];
