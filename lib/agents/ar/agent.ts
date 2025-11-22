import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCallScriptTool,
  buildEmailReminderTool,
  buildSmsReminderTool,
  getInvoicesDueTool,
  postNoteTool,
  predictLateRiskTool,
  reconcilePaymentTool,
  saveNoteToXeroTool,
  syncXeroTool,
} from "@/lib/tools/ar/messaging";

// Load system prompt from markdown file
const SYSTEM_PROMPT_PATH = join(
  process.cwd(),
  "prompts",
  "ar-system-prompt.md"
);
const SYSTEM_INSTRUCTIONS = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");

/**
 * AR (Accounts Receivable) Agent Tools
 *
 * Helps bookkeepers and small businesses manage receivables, reduce DSO,
 * and generate copy-ready payment reminders. Does NOT send communications—
 * only generates artefacts for user to copy-paste.
 */

/**
 * Get AR agent tools
 */
export function getARAgentTools() {
  return {
    getInvoicesDue: getInvoicesDueTool,
    predictLateRisk: predictLateRiskTool,
    buildEmailReminder: buildEmailReminderTool,
    buildSmsReminder: buildSmsReminderTool,
    buildCallScript: buildCallScriptTool,
    reconcilePayment: reconcilePaymentTool,
    postNote: postNoteTool,
    saveNoteToXero: saveNoteToXeroTool,
    syncXero: syncXeroTool,
  };
}

/**
 * Get AR agent system prompt
 */
export function getARAgentSystemPrompt(): string {
  return SYSTEM_INSTRUCTIONS;
}
