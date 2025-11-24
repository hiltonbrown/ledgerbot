import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  user: AuthUser;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
  chatId: string;
};

const inputSchema = z
  .object({
    action: z
      .enum(["create", "analyze"] as const)
      .default("create")
      .describe(
        "Choose `create` to draft a new document or `analyze` to answer questions about an existing spreadsheet."
      ),
    title: z
      .string()
      .min(1)
      .max(50)
      .describe(
        "Short, descriptive title (2-5 words) displayed in the UI. Examples: 'August Invoices', 'Customer Revenue Report', 'GST Calculator'"
      )
      .optional(),
    prompt: z
      .string()
      .describe(
        "Detailed generation instructions including any data needed. This is used to generate the artifact content and can be as long as necessary."
      )
      .optional(),
    kind: z
      .enum(artifactKinds)
      .describe("Type of document: text, code, or sheet")
      .optional(),
    documentId: z
      .string()
      .min(1)
      .describe("ID of the spreadsheet document to analyse.")
      .optional(),
    question: z
      .string()
      .min(1)
      .describe("Natural language question about the spreadsheet.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.action ?? "create") === "create") {
      if (!value.title) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "title is required when action is `create`",
          path: ["title"],
        });
      }

      if (!value.prompt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "prompt is required when action is `create`",
          path: ["prompt"],
        });
      }

      if (!value.kind) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "kind is required when action is `create`",
          path: ["kind"],
        });
      }
      return;
    }

    if (!value.documentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "documentId is required when action is `analyze`",
        path: ["documentId"],
      });
    }

    if (!value.question) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "question is required when action is `analyze`",
        path: ["question"],
      });
    }
  });

export const createDocument = ({
  user,
  dataStream,
  modelId,
  chatId,
}: CreateDocumentProps) =>
  tool({
    description:
      "Create a BRAND NEW document artifact when action=`create`, or analyse an existing spreadsheet when action=`analyze`. Only use the create flow for fresh content that is unrelated to existing documents.",
    inputSchema,
    execute: async (input) => {
      const action = input.action ?? "create";

      if (action === "analyze") {
        const { documentId, question } = input;

        if (!documentId || !question) {
          throw new Error(
            "Both documentId and question are required when analysing a spreadsheet."
          );
        }

        const document = await getDocumentById({ id: documentId });

        if (!document) {
          throw new Error("Spreadsheet document not found");
        }

        if (document.userId !== user.id) {
          throw new Error(
            "You do not have access to this spreadsheet document"
          );
        }

        if (document.kind !== "sheet") {
          throw new Error(
            "Only spreadsheet documents can be analysed with this tool"
          );
        }

        const csv = document.content ?? "";

        if (!csv.trim()) {
          return {
            action,
            documentId,
            question,
            answer: "The spreadsheet is empty.",
            reasoning:
              "No rows were detected in the uploaded CSV, so there is nothing to analyse.",
            highlights: [],
            followUpQuestions: [],
            sampledRows: [],
            numericSummary: {},
          } as const;
        }

        // CSV analysis functionality temporarily disabled
        return {
          action,
          documentId,
          question,
          answer:
            "CSV analysis is currently unavailable. Please try again later.",
          reasoning: "The CSV analysis feature is temporarily disabled.",
          highlights: [],
          followUpQuestions: [],
          sampledRows: [],
          numericSummary: {},
        } as const;
      }

      const title = input.title!;
      const prompt = input.prompt!;
      const kind = input.kind!;

      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        prompt,
        dataStream,
        user,
        modelId,
        chatId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        action,
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      } as const;
    },
  });
