import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnections,
  getXeroConnectionByTenantId,
  getXeroIntegrationSettings,
  updateXeroIntegrationSettings,
} from "@/lib/db/queries";

const patchSchema = z.object({
  multiOrgMode: z.boolean().optional(),
  defaultTenantId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getXeroIntegrationSettings(user.id);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to load Xero settings", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = patchSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { multiOrgMode, defaultTenantId } = parsed.data;

    if (multiOrgMode) {
      const connections = await getActiveXeroConnections(user.id);
      if (connections.length < 2) {
        return NextResponse.json(
          { error: "Connect at least two organisations before enabling multi-org mode" },
          { status: 400 }
        );
      }
    }

    if (defaultTenantId !== undefined && defaultTenantId !== null) {
      const connection = await getXeroConnectionByTenantId(
        user.id,
        defaultTenantId
      );

      if (!connection) {
        return NextResponse.json(
          { error: "Default tenant not found" },
          { status: 404 }
        );
      }
    }

    const updates: {
      multiOrgMode?: boolean;
      defaultTenantId?: string | null;
    } = {};

    if (multiOrgMode !== undefined) {
      updates.multiOrgMode = multiOrgMode;
    }

    if (defaultTenantId !== undefined) {
      updates.defaultTenantId = defaultTenantId;
    }

    await updateXeroIntegrationSettings(user.id, updates);

    const settings = await getXeroIntegrationSettings(user.id);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update Xero settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
