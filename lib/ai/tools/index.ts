const TOOL_DEFINITIONS = [
  {
    id: "getWeather",
    name: "Weather",
    description: "Get current weather information",
  },
  {
    id: "createDocument",
    name: "Create Document",
    description:
      "Create new documents or analyse existing spreadsheets with Mastra",
  },
  {
    id: "updateDocument",
    name: "Update Document",
    description: "Update existing documents",
  },
  {
    id: "requestSuggestions",
    name: "Request Suggestions",
    description: "Request suggestions from the AI",
  },
] as const;

export type Tool = (typeof TOOL_DEFINITIONS)[number];
export type ToolId = Tool["id"];

export const availableTools: Tool[] = [...TOOL_DEFINITIONS];

export const toolIds: ToolId[] = availableTools.map((tool) => tool.id);

export const defaultSelectedTools: ToolId[] = [
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];
