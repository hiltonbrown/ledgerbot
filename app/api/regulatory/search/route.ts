import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth/clerk-helpers";
import {
  type SearchFilters,
  searchRegulatoryDocuments,
} from "../../../../lib/regulatory/search";

/**
 * @swagger
 * /api/regulatory/search:
 *   get:
 *     summary: Search for regulatory documents
 *     description: Requires authentication. Performs a full-text search across regulatory documents.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query.
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: ISO 3166-1 alpha-2 country code to filter by.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories to filter by.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The maximum number of results to return.
 *     responses:
 *       200:
 *         description: Search results.
 *       400:
 *         description: Missing required query parameter 'q'.
 *       401:
 *         description: Not authenticated.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    await getAuthUser(); // Authentication check

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Missing required query parameter 'q'" },
        { status: 400 }
      );
    }

    const filters: SearchFilters = {};
    const country = searchParams.get("country");
    if (country) {
      filters.country = country;
    }

    const category = searchParams.get("category");
    if (category) {
      filters.category = category.split(",");
    }

    const limit = searchParams.get("limit");
    if (limit) {
      filters.limit = Number.parseInt(limit, 10);
    }

    console.log(`[API] Searching for: "${query}" with filters:`, filters);

    const results = await searchRegulatoryDocuments(query, filters);

    return NextResponse.json({
      query,
      filters,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("[API] Error in regulatory search:", error);
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return new NextResponse("Not authenticated", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
