import { tool } from "ai";
import { z } from "zod";
import {
  getLatestVerification,
  getVerificationSummary, // Need to implement this query
  listContacts,
} from "@/lib/db/queries/datavalidation";
import { abrClient } from "@/lib/services/abr-client";
import { asicDatasetService } from "@/lib/services/asic-dataset-service";
import { verificationService } from "@/lib/services/verification-service";

export const dataValidationTools = {
  validateABN: tool({
    description: "Validate an ABN format and check its status in the ABR",
    inputSchema: z.object({
      abn: z.string().describe("The Australian Business Number to validate"),
    }),
    execute: async ({ abn }) => {
      const validation = abrClient.validateABNFormat(abn);
      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error,
        };
      }
      const record = await abrClient.lookupByABN(abn);
      return {
        valid: true,
        formatted: validation.formatted,
        record,
      };
    },
  }),

  validateACN: tool({
    description:
      "Validate an ACN format and check its status in ASIC Companies",
    inputSchema: z.object({
      acn: z.string().describe("The Australian Company Number to validate"),
    }),
    execute: async ({ acn }) => {
      const validation = abrClient.validateACNFormat(acn);
      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error,
        };
      }
      const record = await asicDatasetService.findCompanyByACN(acn);
      return {
        valid: true,
        formatted: validation.formatted,
        record,
      };
    },
  }),

  verifyContact: tool({
    description: "Run full verification for a Xero contact",
    inputSchema: z.object({
      contactId: z.string().describe("The Xero Contact ID to verify"),
    }),
    execute: async ({ contactId }) => {
      return { error: "Not implemented: requires DB fetch logic" };
    },
  }),

  searchBusinessByName: tool({
    description: "Search for a business name in the ASIC registry",
    inputSchema: z.object({
      name: z.string().describe("The business name to search for"),
    }),
    execute: async ({ name }) => {
      const abrResults = await abrClient.searchByName(name);
      return { results: abrResults };
    },
  }),

  checkGSTStatus: tool({
    description: "Check if a business is registered for GST",
    inputSchema: z.object({
      abn: z.string().describe("The ABN to check"),
    }),
    execute: async ({ abn }) => {
      const record = await abrClient.lookupByABN(abn);
      if (!record) return { found: false };
      return {
        found: true,
        gstRegistered: record.gstRegistered,
        gstRegistrationDate: record.gstRegistrationDate,
      };
    },
  }),

  getVerificationSummary: tool({
    description: "Get summary statistics of contact verifications",
    inputSchema: z.object({}),
    execute: async () => {
      return { error: "UserId context required" };
    },
  }),
};
