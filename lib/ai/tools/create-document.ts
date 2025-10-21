import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  user: AuthUser;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createDocument = ({ user, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a NEW document for writing or content creation activities. Use this ONLY when starting completely new content that is unrelated to existing documents in this conversation. DO NOT use if user wants to modify existing content - use updateDocument instead. This generates a new document ID and saves it separately.",
    inputSchema: z.object({
      title: z.string().describe("Title for the new document"),
      kind: z.enum(artifactKinds).describe("Type of document: text, code, or sheet"),
    }),
    execute: async ({ title, kind }) => {
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
        dataStream,
        user,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
