export const DEFAULT_CHAT_MODEL: string = "anthropic-claude-sonnet-4-5";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  vercelId: string;
  isReasoning?: boolean;
};

export const chatModels: ChatModel[] = [
  {
    id: "anthropic-claude-sonnet-4-5",
    name: "Anthropic Claude Sonnet 4.5",
    description: "Balanced general-purpose model for high-quality responses",
    vercelId: "anthropic/claude-sonnet-4.5",
    isReasoning: true,
  },
  {
    id: "anthropic-claude-haiku-4-5",
    name: "Anthropic Claude Haiku 4.5",
    description: "Lightweight Claude model optimized for fast, cost-efficient replies",
    vercelId: "anthropic/claude-haiku-4.5",
  },
  {
    id: "openai-gpt-5",
    name: "OpenAI GPT-5",
    description: "Flagship OpenAI model for complex and creative tasks",
    vercelId: "openai/gpt-5",
    isReasoning: true,
  },
  {
    id: "openai-gpt-5-mini",
    name: "OpenAI GPT-5 Mini",
    description: "Fast, cost-efficient GPT-5 variant for everyday use",
    vercelId: "openai/gpt-5-mini",
    isReasoning: true,
  },
  {
    id: "google-gemini-2-5-flash",
    name: "Google Gemini 2.5 Flash",
    description: "Speed-optimized Gemini model with strong reasoning",
    vercelId: "google/gemini-2.5-flash",
    isReasoning: true,
  },
];

export const chatModelIds = chatModels.map((model) => model.id);

export const reasoningModelIds = chatModels
  .filter((model) => model.isReasoning)
  .map((model) => model.id);

export const isReasoningModelId = (modelId: string) =>
  reasoningModelIds.includes(modelId);
