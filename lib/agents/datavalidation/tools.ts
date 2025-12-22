import { tool } from "ai";
import { z } from "zod";
import { abrService } from "@/lib/abr/service";
import {
  normaliseAbn,
  validateAbnChecksum,
  validateAcnChecksum,
} from "@/lib/abr/utils";
import { asicDatasetService } from "@/lib/services/asic-dataset-service";

export const dataValidationTools = {
  validateABN: tool({
    description: "Validate an ABN format and check its status in the ABR",
    inputSchema: z.object({
      abn: z.string().describe("The Australian Business Number to validate"),
    }),
    execute: async ({ abn }) => {
      const cleanAbn = normaliseAbn(abn);
      const validFormat = validateAbnChecksum(cleanAbn);

      if (!validFormat) {
        return {
          valid: false,
          error: "Invalid ABN checksum or format",
        };
      }

      const searchResult = await abrService.lookup(cleanAbn);

      if (searchResult.results.length === 0) {
        return {
          valid: true, // Format is valid
          formatted: cleanAbn,
          found: false,
          message: "ABN format is valid but not found in ABR",
        };
      }

      return {
        valid: true,
        formatted: cleanAbn,
        found: true,
        record: searchResult.results[0],
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
      const cleanAcn = normaliseAbn(acn);
      const validFormat = validateAcnChecksum(cleanAcn);

      if (!validFormat) {
        return {
          valid: false,
          error: "Invalid ACN checksum or format",
        };
      }
      const record = await asicDatasetService.findCompanyByACN(cleanAcn);
      return {
        valid: true,
        formatted: cleanAcn,
        record,
      };
    },
  }),

  verifyContact: tool({
    description: "Run full verification for a Xero contact",
    inputSchema: z.object({
      contactId: z.string().describe("The Xero Contact ID to verify"),
    }),
    execute: async ({ contactId }) => ({
      error: "Not implemented: requires DB fetch logic",
    }),
  }),

  searchBusinessByName: tool({
    description: "Search for a business name in the ABR/ASIC registry",
    inputSchema: z.object({
      name: z.string().describe("The business name to search for"),
    }),
    execute: async ({ name }) => {
      const searchResult = await abrService.lookup(name);
      return { results: searchResult.results };
    },
  }),

  checkGSTStatus: tool({
    description: "Check if a business is registered for GST",
    inputSchema: z.object({
      abn: z.string().describe("The ABN to check"),
    }),
    execute: async ({ abn }) => {
      const cleanAbn = normaliseAbn(abn);
      const searchResult = await abrService.lookup(cleanAbn);

      if (searchResult.results.length === 0) return { found: false };

      const record = searchResult.results[0];
      return {
        found: true,
        gstRegistered: record.gst.status === "Registered",
        gstRegistrationDate: record.gst.effectiveFrom,
      };
    },
  }),

  getVerificationSummary: tool({
    description: "Get summary statistics of contact verifications",
    inputSchema: z.object({}),
    execute: async () => ({ error: "UserId context required" }),
  }),
};
