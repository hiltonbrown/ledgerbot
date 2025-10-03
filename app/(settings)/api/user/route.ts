import { NextResponse } from "next/server";

import { getUserSettings } from "./data";

export function GET() {
  return NextResponse.json(getUserSettings());
}
