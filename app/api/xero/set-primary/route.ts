import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getXeroConnectionByTenantId,
  setPrimaryXeroConnection,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const connection = await getXeroConnectionByTenantId(user.id, tenantId);

    if (!connection) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    await setPrimaryXeroConnection(user.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set primary organisation", error);
    return NextResponse.json(
      { error: "Failed to set primary organisation" },
      { status: 500 }
    );
  }
}
