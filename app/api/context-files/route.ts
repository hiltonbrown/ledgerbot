import { put } from "@vercel/blob";
import { after, NextResponse } from "next/server";

import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  createContextFile,
  getContextFilesByUserId,
  getUserStorageUsage,
} from "@/lib/db/queries";
import { processContextFile } from "@/lib/files/context-processor";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "processing"
    | "ready"
    | "failed"
    | null;

  const files = await getContextFilesByUserId({
    userId: user.id,
    status: status ?? undefined,
  });

  const usage = await getUserStorageUsage(user.id);
  const maxStorage = entitlementsByUserType[user.type].maxStorageBytes;

  return NextResponse.json({
    files,
    usage: {
      used: usage?.totalSize ?? 0,
      fileCount: usage?.fileCount ?? 0,
      capacity: maxStorage,
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlement = entitlementsByUserType[user.type];
  const usage = await getUserStorageUsage(user.id);
  const currentUsage = usage?.totalSize ?? 0;
  const maxStorage = entitlement.maxStorageBytes;
  const fileCount = Number(usage?.fileCount ?? 0);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 }
      );
    }

    if (fileCount >= entitlement.maxContextFiles) {
      return NextResponse.json(
        { error: "Context file limit reached" },
        { status: 409 }
      );
    }

    if (currentUsage + file.size > maxStorage) {
      return NextResponse.json(
        { error: "Storage quota exceeded" },
        { status: 413 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const blobPath = `context-files/${user.id}/${Date.now()}-${file.name}`;
    const blob = await put(blobPath, fileBuffer, { access: "public" });

    const [record] = await createContextFile({
      userId: user.id,
      name: blob.pathname,
      originalName: file.name,
      blobUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      description: description ?? undefined,
    });

    after(() => processContextFile(record.id, blob.url, file.type));

    return NextResponse.json(record);
  } catch (error) {
    console.error("Context file upload failed", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
