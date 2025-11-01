import { and, count, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { regulatoryDocument } from "@/lib/db/schema";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Query count for awards (category = 'award', status = 'active')
    const [awardsResult] = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "award"),
          eq(regulatoryDocument.status, "active")
        )
      );

    // Query count for tax rulings (category = 'tax_ruling', status = 'active')
    const [taxRulingsResult] = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "tax_ruling"),
          eq(regulatoryDocument.status, "active")
        )
      );

    // Query count for payroll tax (category = 'payroll_tax', status = 'active')
    const [payrollTaxResult] = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(
        and(
          eq(regulatoryDocument.category, "payroll_tax"),
          eq(regulatoryDocument.status, "active")
        )
      );

    // Query max(scrapedAt) for lastUpdated
    const [lastUpdatedResult] = await db
      .select({ lastUpdated: max(regulatoryDocument.scrapedAt) })
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.status, "active"));

    // Query total count of active documents
    const [totalResult] = await db
      .select({ count: count() })
      .from(regulatoryDocument)
      .where(eq(regulatoryDocument.status, "active"));

    const stats = {
      awards: Number(awardsResult?.count ?? 0),
      taxRulings: Number(taxRulingsResult?.count ?? 0),
      payrollTax: Number(payrollTaxResult?.count ?? 0),
      lastUpdated: lastUpdatedResult?.lastUpdated?.toISOString() ?? null,
      totalDocuments: Number(totalResult?.count ?? 0),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching regulatory stats:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
