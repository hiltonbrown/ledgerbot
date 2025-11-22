import { streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  formatAnswerWithCitations,
  getDocManagementSystemPrompt,
  getDocManagementTools,
  loadDocumentForAgent,
  prepareDocAgentRun,
  respondWithCitations,
} from "@/lib/agents/docmanagement";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(z.string()).optional(),
});

const RequestSchema = z.object({
  mode: z.enum(["chat", "load"]).default("chat"),
  message: z.string().min(1, "A user message is required.").optional(),
  docId: z.string().optional(),
  contextFileId: z.string().optional(),
  fileUrl: z.string().url().optional(),
  history: z.array(MessageSchema).optional(),
  stream: z.boolean().optional(),
});

function createEventStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
  });

  const sendEvent = (event: string, data: unknown) => {
    if (!controller) {
      return;
    }
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  };

  const close = () => {
    controller?.close();
  };

  return { stream, sendEvent, close } as const;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join(" ")
        : "Invalid request payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (payload.mode === "load") {
      if (!payload.contextFileId && !payload.docId && !payload.fileUrl) {
        return NextResponse.json(
          {
            error: "Provide a contextFileId, docId, or fileUrl to load a PDF.",
          },
          { status: 400 }
        );
      }

      const doc = await loadDocumentForAgent({
        userId: user.id,
        contextFileId: payload.contextFileId,
        docId: payload.docId,
        fileUrl: payload.fileUrl,
      });

      return NextResponse.json({ doc });
    }

    if (!payload.message) {
      return NextResponse.json(
        { error: "A user message is required." },
        { status: 400 }
      );
    }

    if (payload.stream) {
      const { stream, sendEvent, close } = createEventStream();

      (async () => {
        try {
          const setup = await prepareDocAgentRun({
            userId: user.id,
            message: payload.message ?? "",
            docId: payload.docId,
            contextFileId: payload.contextFileId,
            history: payload.history,
          });

          const result = streamText({
            model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
            system: getDocManagementSystemPrompt(),
            messages: setup.messages,
            tools: getDocManagementTools(),
          });

          const reader = result.textStream.getReader();
          let rawAnswer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            if (value) {
              rawAnswer += value;
              sendEvent("delta", { text: value });
            }
          }

          const finalText = formatAnswerWithCitations(
            rawAnswer,
            setup.activeDoc
          );
          sendEvent("final", { text: finalText });
          sendEvent("done", {});
          close();
        } catch (streamError) {
          sendEvent("error", {
            message:
              streamError instanceof Error
                ? streamError.message
                : "Failed to stream the agent response.",
          });
          close();
        }
      })();

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const text = await respondWithCitations({
      message: payload.message,
      userId: user.id,
      docId: payload.docId,
      contextFileId: payload.contextFileId,
      history: payload.history,
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[docmanagement] Agent request failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run docmanagement agent.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
