import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { UNTITLED_CHAT_TITLE } from "@/lib/constants";
import { saveChat } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";

const createConversationSchema = z
  .object({
    visibility: z.enum(["private", "public"]).optional(),
  })
  .default({});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let visibility: VisibilityType = "private";

  try {
    const json: unknown = await request.json().catch(() => ({}));

    const parsedBody = createConversationSchema.parse(json ?? {});

    visibility = parsedBody.visibility ?? "private";
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const id = generateUUID();

  try {
    await saveChat({
      id,
      title: UNTITLED_CHAT_TITLE,
      userId: session.user.id,
      visibility,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    throw error;
  }

  return Response.json({ id }, { status: 201 });
}
