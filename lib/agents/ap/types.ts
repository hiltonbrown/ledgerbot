import type { CoreMessage } from "ai";

/**
 * AP Agent specific types for tool execution and settings
 */

/**
 * Settings for AP agent operations
 */
export interface APAgentSettings {
  model?: string;
  autoApprovalThreshold?: number;
  requireABN?: boolean;
  gstValidation?: boolean;
  duplicateCheckDays?: number;
  defaultPaymentTerms?: string;
}

/**
 * Request format for AP agent API
 */
export interface APAgentRequest {
  messages: CoreMessage[];
  settings?: APAgentSettings;
}
