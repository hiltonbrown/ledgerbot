import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnections,
  getChatXeroContextForUser,
  getPrimaryXeroConnection,
  getXeroIntegrationSettings,
} from "@/lib/db/queries";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    const connections = await getActiveXeroConnections(user.id);
    const primary = await getPrimaryXeroConnection(user.id);
    const settings = await getXeroIntegrationSettings(user.id);

    const organisations = connections.map((connection) => ({
      tenantId: connection.tenantId,
      tenantName: connection.tenantName,
      tenantType: connection.tenantType,
      isPrimary: connection.isPrimary,
      expiresAt: connection.expiresAt,
    }));

    let context = null;

    if (chatId) {
      context = await getChatXeroContextForUser(user.id, chatId);
    }

    const activeTenantIds =
      (context?.activeTenantIds?.length ?? 0) > 0
        ? context?.activeTenantIds ?? []
        : [];

    const selectedTenantId =
      activeTenantIds[0] ??
      settings.defaultTenantId ??
      primary?.tenantId ??
      organisations[0]?.tenantId ??
      null;

    return NextResponse.json({
      organisations,
      primary: primary
        ? {
            tenantId: primary.tenantId,
            tenantName: primary.tenantName,
          }
        : null,
      settings,
      context: context
        ? {
            activeTenantIds,
            multiOrgEnabled: context.multiOrgEnabled,
          }
        : null,
      selectedTenantId,
    });
  } catch (error) {
    console.error("Failed to fetch Xero organisations", error);
    return NextResponse.json(
      { error: "Failed to fetch organisations" },
      { status: 500 }
    );
  }
}
