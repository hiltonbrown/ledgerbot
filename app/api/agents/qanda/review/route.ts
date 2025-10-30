import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { qaReviewRequest } from "@/lib/db/schema";

/**
 * POST /api/agents/qanda/review
 * Creates a new review request for a Q&A response
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`📝 Review request from user ${user.id}`);

    // Parse request body
    const body = await request.json();
    const { messageId, query, response, confidence, citations } = body;

    // Validate required fields
    if (!messageId || !query || !response || confidence === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`  Message ID: ${messageId}`);
    console.log(`  Confidence: ${confidence}`);
    console.log(`  Citations: ${citations?.length ?? 0}`);

    // Insert review request
    const [reviewRequest] = await db
      .insert(qaReviewRequest)
      .values({
        userId: user.id,
        messageId,
        query,
        response,
        confidence: Math.round(confidence * 100), // Store as integer percentage
        citations,
        status: "pending",
      })
      .returning();

    console.log(`✅ Created review request: ${reviewRequest.id}`);

    // TODO: Send notification to compliance team
    // await notifyComplianceTeam({
    //   requestId: reviewRequest.id,
    //   userId: user.id,
    //   query,
    //   confidence,
    // });

    return NextResponse.json({
      success: true,
      requestId: reviewRequest.id,
    });
  } catch (error) {
    console.error("❌ Error creating review request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/qanda/review
 * Returns review requests for the authenticated user
 */
export async function GET() {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`📋 Fetching review requests for user ${user.id}`);

    // Query review requests
    const requests = await db
      .select()
      .from(qaReviewRequest)
      .where(eq(qaReviewRequest.userId, user.id))
      .orderBy(desc(qaReviewRequest.createdAt))
      .limit(20);

    console.log(`✅ Found ${requests.length} review requests`);

    return NextResponse.json({
      requests,
    });
  } catch (error) {
    console.error("❌ Error fetching review requests:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
