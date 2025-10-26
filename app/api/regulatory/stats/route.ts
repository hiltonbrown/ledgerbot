import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth/clerk-helpers";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Replace with actual database queries when regulatory tables are created
  // This is a placeholder response for the UI to display
  const stats = {
    awards: 0, // Count from regulatoryDocument table where category = 'award'
    taxRulings: 0, // Count from regulatoryDocument table where category = 'tax_ruling'
    payrollTax: 0, // Count from regulatoryDocument table where category = 'payroll_tax'
    lastUpdated: null, // Max(scrapedAt) from regulatoryDocument table
    totalDocuments: 0, // Total count from regulatoryDocument table
  };

  return NextResponse.json(stats);
}
