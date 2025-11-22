import type { ArtifactKind } from "@/components/artifact";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse();
  }

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  if (document.userId !== user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  const {
    content,
    title,
    kind,
    chatId,
  }: { content: string; title: string; kind: ArtifactKind; chatId?: string } =
    await request.json();

  const documents = await getDocumentsById({ id });

  if (documents.length === 0) {
    // Create new document - chatId will be updated later when message is sent
    try {
      const document = await saveDocument({
        id,
        content,
        title,
        kind,
        userId: user.id,
        chatId, // May be undefined, that's ok
      });

      return Response.json(document, { status: 200 });
    } catch (error) {
      console.error("Failed to create document:", {
        id,
        title,
        kind,
        userId: user.id,
        chatId,
        contentLength: content?.length,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Update existing document
  const [doc] = documents;

  if (doc.userId !== user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const document = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: user.id,
    chatId: doc.chatId || undefined,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter timestamp is required."
    ).toResponse();
  }

  const user = await getAuthUser();

  if (!user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
