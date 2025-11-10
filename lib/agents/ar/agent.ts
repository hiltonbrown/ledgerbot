import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Agent } from "@mastra/core/agent";
import { myProvider } from "@/lib/ai/providers";
import {
  buildEmailReminderTool,
  buildSmsReminderTool,
  getInvoicesDueTool,
  postNoteTool,
  predictLateRiskTool,
  reconcilePaymentTool,
  syncXeroTool,
} from "@/lib/tools/ar/messaging";

// Load system prompt from markdown file
const SYSTEM_PROMPT_PATH = join(process.cwd(), "prompts", "ar", "system.md");
const SYSTEM_INSTRUCTIONS = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");

/**
 * AR (Accounts Receivable) Agent
 *
 * Helps bookkeepers and small businesses manage receivables, reduce DSO,
 * and generate copy-ready payment reminders. Does NOT send communications—
 * only generates artefacts for user to copy-paste.
 */
export const arAgent = new Agent({
  name: "ar-agent",
  instructions: SYSTEM_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    getInvoicesDue: getInvoicesDueTool,
    predictLateRisk: predictLateRiskTool,
    buildEmailReminder: buildEmailReminderTool,
    buildSmsReminder: buildSmsReminderTool,
    reconcilePayment: reconcilePaymentTool,
    postNote: postNoteTool,
    syncXero: syncXeroTool,
  },
});

/**
 * Create an AR agent instance with custom model
 * Useful for user preference overrides
 */
export function createArAgentWithModel(modelId?: string) {
  return new Agent({
    name: "ar-agent-custom",
    instructions: SYSTEM_INSTRUCTIONS,
    model: myProvider.languageModel(modelId || "anthropic-claude-sonnet-4-5"),
    tools: {
      getInvoicesDue: getInvoicesDueTool,
      predictLateRisk: predictLateRiskTool,
      buildEmailReminder: buildEmailReminderTool,
      buildSmsReminder: buildSmsReminderTool,
      reconcilePayment: reconcilePaymentTool,
      postNote: postNoteTool,
      syncXero: syncXeroTool,
    },
  });
}
