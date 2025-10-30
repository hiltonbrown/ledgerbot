import { streamText } from "ai";
import { NextResponse } from "next/server";
import { myProvider } from "@/lib/ai/providers";
import { regulatoryTools } from "@/lib/ai/tools/regulatory-tools";
import { createXeroTools } from "@/lib/ai/tools/xero-tools";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import {
  calculateConfidence,
  extractCitations,
  requiresHumanReview,
} from "@/lib/regulatory/confidence";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

Your role is to:
1. Answer questions about Australian Fair Work awards, minimum wages, and employment conditions
2. Provide guidance on ATO tax rulings, PAYG withholding, and superannuation obligations
3. Explain state-specific payroll tax requirements
4. Reference official government sources and provide citations

When answering:
- Always cite specific regulatory documents using the regulatorySearch tool
- Provide direct links to Fair Work, ATO, or state revenue office sources
- Explain obligations clearly with practical examples
- Indicate when professional advice is recommended for complex situations
- If user has Xero connected, reference their actual business data when relevant

Important:
- Only provide information for Australia (AU) unless explicitly asked about other countries
- Be specific about which state/territory regulations apply when discussing payroll tax
- Always indicate the effective date of regulatory information
- Distinguish between mandatory requirements and best practices`;

/**
 * POST /api/agents/qanda
 * Handles Q&A agent chat requests with regulatory and Xero tools
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🤖 Q&A agent request from user ${user.id}`);

    // Parse request body
    const body = await request.json();
    const { messages, settings } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Check for Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const hasXero = !!xeroConnection;

    console.log(`🔗 Xero connection: ${hasXero ? "active" : "not connected"}`);

    // Build tools object
    const tools = {
      ...regulatoryTools,
    };

    // Add Xero tools if connected
    if (hasXero) {
      const xeroTools = createXeroTools(user.id);
      Object.assign(tools, xeroTools);
      console.log(`✅ Added ${Object.keys(xeroTools).length} Xero tools`);
    }

    console.log(`🔧 Total tools available: ${Object.keys(tools).length}`);

    // Get model
    const modelId = settings?.model || "anthropic-claude-sonnet-4-5";
    const model = myProvider.languageModel(modelId);

    console.log(`🤖 Using model: ${modelId}`);

    // Stream response
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      onFinish: ({ text, toolCalls, usage }) => {
        console.log("\n📊 Response finished");

        // Calculate confidence score
        const confidence = calculateConfidence(toolCalls || [], text);
        console.log(`  Confidence: ${confidence.toFixed(3)}`);

        // Extract citations
        const citations = extractCitations(toolCalls || []);
        console.log(`  Citations: ${citations.length}`);

        // Check if review required
        const needsReview = requiresHumanReview(confidence);
        console.log(`  Needs review: ${needsReview}`);

        // Log usage
        console.log("  Usage:", usage);

        // Log summary
        console.log("\n📋 Response Summary:", {
          userId: user.id,
          confidence: confidence.toFixed(3),
          citationCount: citations.length,
          needsReview,
          usage,
        });

        // TODO: Save response metadata to database
        // - Store confidence score
        // - Store citations
        // - Store review status

        // TODO: Trigger review notification if needed
        // if (needsReview) {
        //   await notifyHumanReviewer({
        //     userId: user.id,
        //     confidence,
        //     citations,
        //     responseText: text,
        //   });
        // }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("❌ Error in Q&A agent:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
