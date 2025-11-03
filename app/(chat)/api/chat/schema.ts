import { z } from "zod";
import { chatModelIds } from "@/lib/ai/models";
import { type ToolId, toolIds } from "@/lib/ai/tools";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.literal("file"),
  mediaType: z.enum([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ] as const),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  extractedText: z.string().max(50_000).optional(),
  fileSize: z.number().int().nonnegative().optional(),
  processingError: z.string().optional(),
  documentId: z.string().uuid().optional(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum([...chatModelIds] as [string, ...string[]]),
  selectedVisibilityType: z.enum(["public", "private"]),
  selectedTools: z.array(z.enum(toolIds as [ToolId, ...ToolId[]])).optional(),
  streamReasoning: z.boolean().optional(),
  showReasoningPreference: z.boolean().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
