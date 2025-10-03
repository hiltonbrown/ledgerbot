import { NextResponse } from "next/server";

import { getUsageSummary } from "./data";

export function GET() {
  return NextResponse.json(getUsageSummary());
}
