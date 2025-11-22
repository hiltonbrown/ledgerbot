import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
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
 * Accounts Payable (AP) Agent Tools
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

/**
 * Get base AP agent tools (without Xero integration)
 */
export function getAPAgentTools() {
  return {
    extractInvoiceData: extractInvoiceDataTool,
    matchVendor: matchVendorTool,
    validateABN: validateABNTool,
    suggestBillCoding: suggestBillCodingTool,
    checkDuplicateBills: checkDuplicateBillsTool,
    generatePaymentProposal: generatePaymentProposalTool,
    assessPaymentRisk: assessPaymentRiskTool,
    generateEmailDraft: generateEmailDraftTool,
  };
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
  const xeroTools = createAPXeroTools(userId);

  return {
    extractInvoiceData: extractInvoiceDataTool,
    matchVendor: matchVendorTool,
    validateABN: validateABNTool,
    suggestBillCoding: suggestBillCodingTool,
    checkDuplicateBills: checkDuplicateBillsTool,
    generatePaymentProposal: generatePaymentProposalTool,
    assessPaymentRisk: assessPaymentRiskTool,
    generateEmailDraft: generateEmailDraftTool,
    ...xeroTools,
  };
}

/**
 * Get AP agent system prompt
 */
export function getAPAgentSystemPrompt(): string {
  return SYSTEM_INSTRUCTIONS;
}
