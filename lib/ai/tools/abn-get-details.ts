import { tool } from "ai";
import { z } from "zod";
import { AbnLookupClient } from "@/lib/abr/abnLookupClient";
import { ensureAbnLookupEnabled, mapAbrEntity } from "@/lib/abr/helpers";
import { isValidAbn, normaliseIdentifier } from "@/lib/abr/validate";

export const abn_get_details = tool({
  description: "Get entity details from ABR by ABN or ACN.",
  inputSchema: z.object({
    identifier: z.string().min(1, "Identifier is required"),
    kind: z.enum(["ABN", "ACN", "AUTO"]).optional().default("AUTO"),
  }),
  execute: async ({ identifier, kind }) => {
    ensureAbnLookupEnabled();
    const client = new AbnLookupClient();
    const { digits, kind: resolvedKind } = normaliseIdentifier(identifier);

    const targetKind = kind && kind !== "AUTO" ? kind : resolvedKind;
    const lookupKind: "ABN" | "ACN" | null =
      targetKind === "AUTO"
        ? digits.length === 11
          ? "ABN"
          : digits.length === 9
            ? "ACN"
            : null
        : targetKind === "UNKNOWN"
          ? null
          : targetKind;

    if (!lookupKind) {
      return {
        error: {
          code: "INVALID_IDENTIFIER",
          message: "Identifier must be a 9-digit ACN or 11-digit ABN.",
        },
      };
    }

    if (lookupKind === "ABN") {
      if (!isValidAbn(digits)) {
        return {
          error: {
            code: "INVALID_ABN",
            message: "Invalid ABN format or checksum.",
          },
        };
      }

      const entity = mapAbrEntity(await client.getByAbn(digits));
      return { entity };
    }

    if (digits.length !== 9) {
      return {
        error: {
          code: "INVALID_ACN",
          message: "ACN must contain exactly 9 digits.",
        },
      };
    }

    const entity = mapAbrEntity(await client.getByAcn(digits));
    return { entity };
  },
});
