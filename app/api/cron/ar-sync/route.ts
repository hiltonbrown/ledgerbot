import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";
import { arCustomerHistory, arJobRun } from "@/lib/db/schema/ar";
import { syncXeroData } from "@/lib/ingestion/xero";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[AR Sync Cron] Starting scheduled AR data sync");

  try {
    // Get all users with active Xero connections
    const connections = await db
      .select({ userId: xeroConnection.userId })
      .from(xeroConnection)
      .where(eq(xeroConnection.status, "active"));

    const uniqueUserIds = [...new Set(connections.map((c) => c.userId))];
    console.log(
      `[AR Sync Cron] Found ${uniqueUserIds.length} users to process`
    );

    const results = await Promise.allSettled(
      uniqueUserIds.map((userId) => processUserARData(userId))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[AR Sync Cron] Completed. Success: ${successful}, Failed: ${failed}`
    );

    return NextResponse.json({
      success: true,
      processed: uniqueUserIds.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("[AR Sync Cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processUserARData(userId: string) {
  const startTime = Date.now();
  const jobId = crypto.randomUUID();

  console.log(`[AR Sync] Starting job ${jobId} for user ${userId}`);

  // Create job run record
  const [jobRun] = await db
    .insert(arJobRun)
    .values({
      userId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  const errors: Array<{ message: string; customerId?: string }> = [];

  try {
    // Step 1: Sync Xero data
    console.log(`[AR Sync] Syncing Xero data for user ${userId}`);
    await syncXeroData(userId);

    // Step 2: Fetch all customer history records
    const customerHistories = await db
      .select()
      .from(arCustomerHistory)
      .where(eq(arCustomerHistory.userId, userId));

    console.log(
      `[AR Sync] Processing ${customerHistories.length} customers for user ${userId}`
    );

    // Step 3: Calculate summary statistics
    const highRiskCustomers = customerHistories.filter(
      (c) => (c.riskScore || 0) > 0.7
    );
    const over90DaysCustomers = customerHistories.filter(
      (c) => c.percentInvoices90Plus && c.percentInvoices90Plus > 0
    );

    // Calculate DSO (Days Sales Outstanding)
    // DSO = (Total AR / Total Revenue) * Number of Days
    // Simplified: Average days late weighted by outstanding amount
    const totalOutstanding = customerHistories.reduce(
      (sum, c) => sum + Number(c.totalOutstanding || 0),
      0
    );
    const weightedDaysLate = customerHistories.reduce(
      (sum, c) => sum + c.avgDaysLate * Number(c.totalOutstanding || 0),
      0
    );
    const dso = totalOutstanding > 0 ? weightedDaysLate / totalOutstanding : 0;

    const riskDistribution = {
      low: customerHistories.filter((c) => (c.riskScore || 0) <= 0.3).length,
      medium: customerHistories.filter(
        (c) => (c.riskScore || 0) > 0.3 && (c.riskScore || 0) <= 0.7
      ).length,
      high: highRiskCustomers.length,
    };

    const percentOver90Days =
      customerHistories.length > 0
        ? (over90DaysCustomers.length / customerHistories.length) * 100
        : 0;

    // Step 4: Update job run with results
    await db
      .update(arJobRun)
      .set({
        status: "success",
        completedAt: new Date(),
        customersProcessed: customerHistories.length,
        highRiskFlagged: highRiskCustomers.length,
        errors: errors.length > 0 ? errors : null,
        stats: {
          dso,
          percentOver90Days,
          riskDistribution,
        },
      })
      .where(eq(arJobRun.id, jobRun.id));

    const duration = Date.now() - startTime;
    console.log(
      `[AR Sync] Completed job ${jobId} for user ${userId} in ${duration}ms`
    );
    console.log(
      `[AR Sync] Stats - DSO: ${dso.toFixed(1)} days, >90 days: ${percentOver90Days.toFixed(1)}%, High Risk: ${highRiskCustomers.length}`
    );

    // Log high-risk alerts
    if (highRiskCustomers.length > 0) {
      console.warn(
        `[AR Alert] ${highRiskCustomers.length} high-risk customers for user ${userId}`
      );
    }
  } catch (error) {
    console.error(`[AR Sync] Error processing user ${userId}:`, error);
    errors.push({
      message: error instanceof Error ? error.message : "Unknown error",
    });

    await db
      .update(arJobRun)
      .set({
        status: "failed",
        completedAt: new Date(),
        errors,
      })
      .where(eq(arJobRun.id, jobRun.id));

    throw error;
  }
}
