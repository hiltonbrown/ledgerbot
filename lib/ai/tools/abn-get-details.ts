import { tool } from "ai";
import { z } from "zod";
import { abrService } from "@/lib/abr/service";
import { classifyAbrQuery, normaliseAbn } from "@/lib/abr/utils";

export const abn_get_details = tool({
  description: "Get entity details from ABR by ABN or ACN.",
  inputSchema: z.object({
    identifier: z.string().min(1, "Identifier is required"),
    kind: z.enum(["ABN", "ACN", "AUTO"]).optional().default("AUTO"),
  }),
  execute: async ({ identifier, kind }) => {
    // We treat "AUTO" as just "let classify figure it out"
    const query = normaliseAbn(identifier);
    const classification = classifyAbrQuery(query);
    
    // Override classification if kind is forced (though classification is usually reliable for digits)
    const effectiveKind = (kind === "AUTO" || kind === classification.kind) ? classification.kind : kind;

    if (effectiveKind === "ACN") {
         return {
            error: {
                code: "ACN_NOT_SUPPORTED",
                message: "Direct ACN lookup via ABR not fully supported. Please search by name or ABN."
            }
         };
    }

    if (effectiveKind !== "ABN") {
        return {
            error: {
                code: "INVALID_IDENTIFIER",
                message: "Identifier must be a valid 11-digit ABN."
            }
        };
    }

    try {
        const result = await abrService.lookup(query);
        if (result.results.length === 0) {
             return { error: { code: "NOT_FOUND", message: "No entity found for this ABN" } };
        }
        return { entity: result.results[0] };
    } catch (e) {
        return { error: { code: "LOOKUP_FAILED", message: String(e) } };
    }
  },
});