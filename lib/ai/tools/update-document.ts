import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";

type UpdateDocumentProps = {
  user: AuthUser;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

export const updateDocument = ({ user, dataStream, modelId }: UpdateDocumentProps) =>
  tool({
    description:
      "Modify an EXISTING document artifact that was previously created in this conversation. Use when user wants to change, improve, or revise content they've already seen. Requires a valid document ID from this conversation.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the existing document to update"),
      description: z
        .string()
        .describe("Description of the changes to make to the document"),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        user,
        modelId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
