// import { getRobustXeroClient } from "@/lib/xero/client"; // Use for Xero tools if needed
import { tool } from "ai";
import { z } from "zod";
import { dataValidationTools } from "@/lib/agents/datavalidation/tools";

export const dataValidationAgentConfig = {
  name: "Data Validation Agent",
  description:
    "Validates customer and supplier data against Australian business registries",
  capabilities: [
    "ABN validation",
    "ACN validation",
    "GST status check",
    "Registry matching",
  ],
  dataSources: ["Xero", "ASIC Companies", "ASIC Business Names", "ABR"],
};

export function getDataValidationAgentTools() {
  return dataValidationTools;
}

export async function getDataValidationAgentToolsWithXero(userId: string) {
  // If we had user-specific tools (like syncXero), we'd inject context here
  return {
    ...dataValidationTools,
    // Add user-specific tools here
    syncXeroContacts: tool({
      description: "Trigger synchronization of Xero contacts",
      inputSchema: z.object({
        tenantId: z.string().describe("The Xero tenant ID to sync"),
      }),
      execute: async ({ tenantId }) => {
        // Placeholder: This would trigger the sync logic
        // await syncManager.syncContacts(userId, tenantId);
        return {
          message: "Sync started",
          jobId: "job_" + Date.now(),
        };
      },
    }),
  };
}

export function getDataValidationAgentSystemPrompt() {
  // Return a placeholder or read from a file.
  // In this architecture, it seems we read from markdown files in `prompts/`.
  // We will return the filename or the content if we load it here.
  // For now, let's assume the UI/Chat handler checks `prompts/datavalidation-system-prompt.md`
  return "You are the Data Validation Agent.";
}
