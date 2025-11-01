import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../../lib/auth/clerk-helpers";
import { db } from "../../../../../lib/db/queries";
import { qaReviewRequest } from "../../../../../lib/db/schema";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messageId, query, response, confidence, citations } =
      await req.json();

    const [newRequest] = await db
      .insert(qaReviewRequest)
      .values({
        userId: user.id,
        messageId,
        query,
        response,
        confidence,
        citations,
        status: "pending",
      })
      .returning();

    // TODO: Send notification to compliance team

    return NextResponse.json({ success: true, requestId: newRequest.id });
  } catch (error) {
    console.error("[API] Error creating Q&A review request:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new NextResponse("Not authenticated", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const requests = await db
      .select()
      .from(qaReviewRequest)
      .where(eq(qaReviewRequest.userId, user.id))
      .orderBy(desc(qaReviewRequest.createdAt))
      .limit(20);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[API] Error fetching Q&A review requests:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new NextResponse("Not authenticated", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
