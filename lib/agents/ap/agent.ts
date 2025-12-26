import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAPTools, createAPXeroTools } from "./tools";

// Load system prompt from markdown file
const SYSTEM_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "prompts/ap-system-prompt.md"),
  "utf-8"
);

/**
 * Get base AP agent tools (without Xero integration)
 * @param userId - User ID for context
 */
export function getAPAgentTools(userId: string) {
  return createAPTools(userId);
}

/**
 * Get AP agent tools with Xero integration for a specific user
 *
 * This variant includes additional Xero integration tools for users
 * with an active Xero connection, enabling real-time access to:
 * - Supplier bills (ACCPAY invoices)
 * - Supplier/vendor master data
 * - Chart of accounts for accurate coding
 * - GST/tax rates
 * - Payment history
 *
 * @param userId - User ID to fetch Xero connection for
 * @returns Tools object with Xero tools included
 */
export function getAPAgentToolsWithXero(userId: string) {
  return createAPXeroTools(userId);
}

/**
 * Get AP agent system prompt
 */
export function getAPAgentSystemPrompt(): string {
  return SYSTEM_INSTRUCTIONS;
}
