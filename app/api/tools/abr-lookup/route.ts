import { type NextRequest, NextResponse } from "next/server";
import { abrService } from "@/lib/abr/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, includeHistorical } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string is required" },
        { status: 400 }
      );
    }

    const result = await abrService.lookup(query, !!includeHistorical);
    return NextResponse.json(result);
  } catch (error) {
    console.error("ABR Lookup Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
