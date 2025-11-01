import { streamText } from "ai";
import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth/clerk-helpers";
import { getModel } from "../../../../lib/ai/providers";
import { regulatoryTools } from "../../../../lib/ai/tools/regulatory-tools";
import { createXeroTools } from "../../../../lib/ai/tools/xero-tools";
import { getActiveXeroConnection } from "../../../../lib/db/queries";
import { calculateConfidence, extractCitations, requiresHumanReview } from "../../../../lib/regulatory/confidence";

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

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse('Not authenticated', { status: 401 });
    }

    const { messages, settings } = await req.json();

    const xeroConnection = await getActiveXeroConnection(user.id);
    const tools: any = { ...regulatoryTools };
    if (xeroConnection) {
      console.log("[Q&A Agent] Xero connection found, adding Xero tools.");
      const xeroTools = createXeroTools(user.id);
      Object.assign(tools, xeroTools);
    }

    const model = getModel(settings?.model || "anthropic-claude-sonnet-4-5");

    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      onFinish: async (result) => {
        const { text, toolCalls, usage } = result;
        const confidence = calculateConfidence(toolCalls, text);
        const citations = extractCitations(toolCalls);
        const needsReview = requiresHumanReview(confidence);

        console.log("[Q&A Agent] Finished processing response:", {
          userId: user.id,
          confidence: confidence.toFixed(3),
          citationCount: citations.length,
          needsReview,
          usage,
        });

        // TODO: Save message, confidence score, and citations to the database

        if (needsReview) {
          // TODO: Trigger a notification or create a task for human review
          console.warn(`[Q&A Agent] Response for user ${user.id} requires human review (Confidence: ${confidence.toFixed(3)})`);
        }
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("[Q&A Agent] Error handling chat request:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}