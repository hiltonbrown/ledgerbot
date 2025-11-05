// Tool IDs that are always available to the AI
export type ToolId =
  | "getWeather"
  | "createDocument"
  | "updateDocument"
  | "requestSuggestions";

// All tools are always enabled
export const defaultSelectedTools: ToolId[] = [
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];
