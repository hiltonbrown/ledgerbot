export type Tool = {
  id: string;
  name: string;
  description: string;
  icon?: string;
};

export const availableTools: Tool[] = [
  {
    id: "getWeather",
    name: "Weather",
    description: "Get current weather information",
  },
  {
    id: "createDocument",
    name: "Create Document",
    description: "Create and manage documents",
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
];

export const defaultSelectedTools = [
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];

export const toolIds = availableTools.map((tool) => tool.id);
