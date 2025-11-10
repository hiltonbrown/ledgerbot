import "server-only";

import { Agent } from "@mastra/core/agent";
import { myProvider } from "@/lib/ai/providers";
import { createQandaXeroTools, regulatorySearchTool } from "./tools";

const SYSTEM_INSTRUCTIONS = `You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

Your role is to:
1. Answer questions about Australian Fair Work awards, minimum wages, and employment conditions
2. Provide guidance on ATO tax rulings, PAYG withholding, and superannuation obligations
3. Explain state-specific payroll tax requirements
4. Reference official government sources and provide citations

When answering:
- Always cite specific regulatory documents using the regulatorySearch tool
- Provide direct links to Fair Work, ATO, or state revenue office sources
- Explain obligations clearly with practical examples
- Indicate when professional advice is recommended for complex situations
- If user has Xero connected, reference their actual business data when relevant

Important:
- Only provide information for Australia (AU) unless explicitly asked about other countries
- Be specific about which state/territory regulations apply when discussing payroll tax
- Always indicate the effective date of regulatory information
- Distinguish between mandatory requirements and best practices`;

/**
 * Q&A Advisory Agent
 *
 * Provides regulatory-aware assistance for Australian tax law, employment law,
 * and compliance obligations with citations and confidence scoring.
 */
export const qandaAgent = new Agent({
  name: "qanda-agent",
  instructions: SYSTEM_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    regulatorySearch: regulatorySearchTool,
  },
});

/**
 * Create a Q&A agent instance with Xero tools for a specific user
 */
export function createQandaAgentWithXero(userId: string, modelId?: string) {
  const xeroTools = createQandaXeroTools(userId);

  return new Agent({
    name: "qanda-agent-with-xero",
    instructions: SYSTEM_INSTRUCTIONS,
    model: myProvider.languageModel(modelId || "anthropic-claude-sonnet-4-5"),
    tools: {
      regulatorySearch: regulatorySearchTool,
      ...xeroTools,
    },
  });
}
