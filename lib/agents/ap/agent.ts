import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Agent } from "@mastra/core/agent";
import { myProvider } from "@/lib/ai/providers";
import {
  assessPaymentRiskTool,
  checkDuplicateBillsTool,
  createAPXeroTools,
  extractInvoiceDataTool,
  generateEmailDraftTool,
  generatePaymentProposalTool,
  matchVendorTool,
  suggestBillCodingTool,
  validateABNTool,
} from "./tools";

// Load system prompt from markdown file
const SYSTEM_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "prompts/ap-system-prompt.md"),
  "utf-8"
);

/**
 * Accounts Payable (AP) Agent
 *
 * Assists with supplier bill management, vendor validation, coding suggestions,
 * approval workflows, payment runs, and vendor communication for Australian businesses.
 *
 * Features:
 * - Vendor intake and ABN validation
 * - Bill extraction and GST-aware coding suggestions
 * - Approval workflow tracking and reminders
 * - Payment run proposals with risk assessment
 * - Email draft generation (no direct sending)
 * - Xero integration for real-time financial data (when connected)
 */
export const apAgent = new Agent({
  name: "ap-agent",
  instructions: SYSTEM_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    extractInvoiceData: extractInvoiceDataTool,
    matchVendor: matchVendorTool,
    validateABN: validateABNTool,
    suggestBillCoding: suggestBillCodingTool,
    checkDuplicateBills: checkDuplicateBillsTool,
    generatePaymentProposal: generatePaymentProposalTool,
    assessPaymentRisk: assessPaymentRiskTool,
    generateEmailDraft: generateEmailDraftTool,
  },
});

/**
 * Create an AP agent instance with Xero tools for a specific user
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
 * @param modelId - Optional model ID to use (defaults to Claude Sonnet 4.5)
 * @returns Agent instance with Xero tools included
 */
export function createAPAgentWithXero(userId: string, modelId?: string) {
  const xeroTools = createAPXeroTools(userId);

  return new Agent({
    name: "ap-agent-with-xero",
    instructions: SYSTEM_INSTRUCTIONS,
    model: myProvider.languageModel(modelId || "anthropic-claude-sonnet-4-5"),
    tools: {
      extractInvoiceData: extractInvoiceDataTool,
      matchVendor: matchVendorTool,
      validateABN: validateABNTool,
      suggestBillCoding: suggestBillCodingTool,
      checkDuplicateBills: checkDuplicateBillsTool,
      generatePaymentProposal: generatePaymentProposalTool,
      assessPaymentRisk: assessPaymentRiskTool,
      generateEmailDraft: generateEmailDraftTool,
      ...xeroTools,
    },
  });
}
