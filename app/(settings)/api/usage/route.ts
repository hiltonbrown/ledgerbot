import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { ChatSDKError } from "@/lib/errors";
import { getTokenUsageSummary, getUsageSummary } from "./data";

// Legacy endpoint for backward compatibility
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  // New token usage endpoint
  if (type === "tokens") {
    try {
      const user = await getAuthUser();

      if (!user) {
        return new ChatSDKError("unauthorized:chat").toResponse();
      }

      const period = (searchParams.get("period") ?? "30d") as
        | "7d"
        | "30d"
        | "90d"
        | "all";

      // Validate period parameter
      if (!["7d", "30d", "90d", "all"].includes(period)) {
        return Response.json(
          { error: "Invalid period parameter" },
          { status: 400 }
        );
      }

      const summary = await getTokenUsageSummary(user.id, period);

      return Response.json(summary, { status: 200 });
    } catch (error) {
      console.error("Error in token usage API:", error);

      if (error instanceof ChatSDKError) {
        return error.toResponse();
      }

      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // Legacy endpoint (default)
  return Response.json(getUsageSummary());
}
