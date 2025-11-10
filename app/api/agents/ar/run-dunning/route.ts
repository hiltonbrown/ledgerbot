import { NextResponse } from "next/server";
import { z } from "zod";
import { arDunningWorkflow } from "@/lib/agents/ar/workflow";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { asOfOrToday } from "@/lib/util/dates";

export const maxDuration = 60;

const requestSchema = z.object({
  asOf: z.string().optional(),
  minDaysOverdue: z.number().int().nonnegative().default(0),
  tone: z.enum(["polite", "firm", "final"]).default("polite"),
  autoConfirm: z.boolean().default(false),
});

/**
 * Run batch dunning cycle
 * POST /api/agents/ar/run-dunning
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const body = await req.json();
    const validated = requestSchema.parse(body);

    console.log("[AR Dunning] Starting batch cycle", {
      userId: user.id,
      ...validated,
    });

    // Prepare workflow input
    const workflowInput = {
      userId: user.id,
      asOf: validated.asOf || asOfOrToday().toISOString(),
      minDaysOverdue: validated.minDaysOverdue,
      tone: validated.tone,
      autoConfirm: validated.autoConfirm,
    };

    // Create a readable stream to send progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "progress", state: "triage", message: "Validating inputs..." })}\n\n`
            )
          );

          // Execute workflow
          const run = await arDunningWorkflow.createRunAsync();
          const startResult = await run.start({ inputData: workflowInput });

          // Get final result
          const result =
            startResult.status === "success" ? startResult.result : null;

          // Build final response
          const finalData = {
            type: "complete",
            asOf: workflowInput.asOf,
            autoConfirm: workflowInput.autoConfirm,
            commsEnabled: false,
            summary: result?.summary || "Dunning cycle complete",
            artefactsCreated: result?.artefactsCreated || 0,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("[AR Dunning] Workflow error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AR Dunning] Error:", error);

    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid request", details: error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
