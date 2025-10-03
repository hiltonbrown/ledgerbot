import { NextResponse } from "next/server";

import { getFileSummary } from "./data";

export function GET() {
  return NextResponse.json(getFileSummary());
}
