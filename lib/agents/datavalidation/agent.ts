import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { dataValidationTools } from "@/lib/agents/datavalidation/tools";
import { getRobustXeroClient } from "@/lib/xero/client-helpers";
import { syncContacts } from "@/lib/xero/sync-manager";

// Load system prompt from markdown file
const SYSTEM_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "prompts/datavalidation-system-prompt.md"),
  "utf-8"
);

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
  return {
    ...dataValidationTools,
    syncXeroContacts: tool({
      description: "Trigger synchronization of Xero contacts for validation.",
      inputSchema: z.object({
        tenantId: z.string().describe("The Xero tenant ID to sync"),
      }),
      execute: async ({ tenantId }) => {
        const { client } = await getRobustXeroClient(userId, tenantId);
        const count = await syncContacts(client, tenantId);

        return {
          success: true,
          message: `Synchronized ${count} contacts from Xero.`,
          syncedCount: count,
        };
      },
    }),
  };
}

export function getDataValidationAgentSystemPrompt() {
  return SYSTEM_INSTRUCTIONS;
}
