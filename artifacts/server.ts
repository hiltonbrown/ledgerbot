import type { UIMessageStreamWriter } from "ai";
import { codeDocumentHandler } from "@/artifacts/code/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact";
import { saveDocument } from "@/lib/db/queries";
import type { Document } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import type { AuthUser } from "@/lib/types/auth";

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
};

export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  prompt: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user: AuthUser;
  modelId: string;
  chatId: string;
};

export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user: AuthUser;
  modelId: string;
};

export type DocumentHandler<T = ArtifactKind> = {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (
    params: CreateDocumentCallbackProps
  ) => Promise<string | { content: string; generatedTitle: string }>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const result = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        prompt: args.prompt,
        dataStream: args.dataStream,
        user: args.user,
        modelId: args.modelId,
        chatId: args.chatId,
      });

      // Handle both string and object return types
      const draftContent = typeof result === "string" ? result : result.content;
      const finalTitle =
        typeof result === "string" ? args.title : result.generatedTitle;

      if (args.user?.id) {
        await saveDocument({
          id: args.id,
          title: finalTitle,
          content: draftContent,
          kind: config.kind,
          userId: args.user.id,
          chatId: args.chatId,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        user: args.user,
        modelId: args.modelId,
      });

      if (args.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.user.id,
          chatId: args.document.chatId ?? undefined,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
];

export const artifactKinds = ["text", "code", "sheet"] as const;
