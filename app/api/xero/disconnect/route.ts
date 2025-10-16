import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
	deactivateXeroConnection,
	getActiveXeroConnection,
} from "@/lib/db/queries";

export async function POST() {
	try {
		const user = await getAuthUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const connection = await getActiveXeroConnection(user.id);

		if (!connection) {
			return NextResponse.json(
				{ error: "No active Xero connection found" },
				{ status: 404 }
			);
		}

		await deactivateXeroConnection(connection.id);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Xero disconnect error:", error);
		return NextResponse.json(
			{ error: "Failed to disconnect Xero" },
			{ status: 500 }
		);
	}
}
