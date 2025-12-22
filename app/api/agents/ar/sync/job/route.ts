import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { cancelSyncJob, getSyncJob } from "@/lib/xero/sync-manager";

export const runtime = "nodejs";

/**
 * GET /api/agents/ar/sync/job?jobId=...
 * Poll sync job status
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) return new NextResponse("Missing jobId", { status: 400 });

    const job = getSyncJob(jobId);
    if (!job) return new NextResponse("Job not found", { status: 404 });

    // Ensure user can only see their own jobs
    if (job.userId !== user.id)
      return new NextResponse("Unauthorized", { status: 403 });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        error: job.error,
        result: job.result,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/ar/sync/job?jobId=...
 * Cancel a sync job
 */
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) return new NextResponse("Missing jobId", { status: 400 });

    const job = getSyncJob(jobId);
    if (!job) return new NextResponse("Job not found", { status: 404 });
    if (job.userId !== user.id)
      return new NextResponse("Unauthorized", { status: 403 });

    const cancelled = cancelSyncJob(jobId);

    return NextResponse.json({
      success: cancelled,
      message: cancelled
        ? "Sync cancelled"
        : "Could not cancel sync (maybe already finished)",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
