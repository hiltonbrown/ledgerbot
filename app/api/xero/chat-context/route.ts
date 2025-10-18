import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getChatXeroContextForUser,
  getXeroConnectionByTenantId,
  upsertChatXeroContextForUser,
} from "@/lib/db/queries";

const requestSchema = z.object({
  chatId: z.string().uuid("chatId must be a valid UUID"),
  tenantId: z.string().optional(),
  tenantIds: z.array(z.string()).optional(),
  multiOrgEnabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { chatId, tenantId, tenantIds, multiOrgEnabled } = parsed.data;
    const activeTenantIds = tenantIds ?? (tenantId ? [tenantId] : []);

    if (activeTenantIds.length === 0) {
      return NextResponse.json(
        { error: "At least one tenantId must be provided" },
        { status: 400 }
      );
    }

    for (const id of activeTenantIds) {
      const connection = await getXeroConnectionByTenantId(user.id, id);
      if (!connection) {
        return NextResponse.json(
          { error: `Tenant ${id} not found` },
          { status: 404 }
        );
      }
    }

    await upsertChatXeroContextForUser({
      userId: user.id,
      chatId,
      tenantIds: activeTenantIds,
      multiOrgEnabled,
    });

    const context = await getChatXeroContextForUser(user.id, chatId);

    return NextResponse.json({
      success: true,
      context,
    });
  } catch (error) {
    console.error("Failed to update chat tenant context", error);
    return NextResponse.json(
      { error: "Failed to update chat tenant context" },
      { status: 500 }
    );
  }
}
