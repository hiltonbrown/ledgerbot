import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  type SearchFilters,
  searchRegulatoryDocuments,
} from "@/lib/regulatory/search";

/**
 * GET /api/regulatory/search
 * Searches regulatory documents using full-text search
 *
 * Query parameters:
 * - q: string (required) - search query
 * - country: string (optional) - filter by country code
 * - category: string (optional) - comma-separated categories
 * - limit: number (optional) - max results (default: 10)
 *
 * Example: /api/regulatory/search?q=minimum%20wage&country=AU&category=award,tax_ruling&limit=5
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const country = searchParams.get("country");
    const categoryParam = searchParams.get("category");
    const limitParam = searchParams.get("limit");

    // Validate required parameters
    if (!query) {
      return NextResponse.json(
        { error: "Missing required parameter: q" },
        { status: 400 }
      );
    }

    console.log(`🔍 Search request from user ${user.id}`);
    console.log(`📝 Query: "${query}"`);

    // Build filters
    const filters: SearchFilters = {};

    if (country) {
      filters.country = country;
      console.log(`🌍 Country filter: ${country}`);
    }

    if (categoryParam) {
      filters.category = categoryParam.split(",").map((c) => c.trim());
      console.log(`📂 Category filter: ${filters.category.join(", ")}`);
    }

    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        filters.limit = parsedLimit;
      }
    }

    if (!filters.limit) {
      filters.limit = 10;
    }

    console.log(`📊 Limit: ${filters.limit}`);

    // Execute search
    const results = await searchRegulatoryDocuments(query, filters);

    console.log(`✅ Search complete: ${results.length} results found`);

    return NextResponse.json({
      query,
      filters,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("❌ Error in regulatory search:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
