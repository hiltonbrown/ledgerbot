import "server-only";

import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getContextFilesByUserId, getUserStorageUsage } from "@/lib/db/queries";

export type FileRecord = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  owner: string;
  status: "synced" | "processing" | "failed";
};

export type FileSummary = {
  usage: {
    used: number;
    capacity: number;
    fileCount: number;
  };
  files: FileRecord[];
};

export async function getFileSummary(): Promise<FileSummary> {
  try {
    const user = await getAuthUser();

    if (!user) {
      return {
        usage: {
          used: 0,
          capacity: 10,
          fileCount: 0,
        },
        files: [],
      };
    }

    const [files, storageUsage] = await Promise.all([
      getContextFilesByUserId({ userId: user.id }),
      getUserStorageUsage(user.id),
    ]);

    const maxStorage = entitlementsByUserType[user.type].maxStorageBytes;
    const usedBytes = storageUsage?.totalSize ?? 0;
    const usedGb = usedBytes / (1024 * 1024 * 1024);
    const capacityGb = maxStorage / (1024 * 1024 * 1024);

    // Format files for display
    const formattedFiles: FileRecord[] = files.slice(0, 5).map((file) => {
      const sizeInMb = file.fileSize / (1024 * 1024);
      const sizeStr = sizeInMb >= 1
        ? `${sizeInMb.toFixed(1)} MB`
        : `${(file.fileSize / 1024).toFixed(0)} KB`;

      // Determine file type from filename
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type = "Document";
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        type = "Image";
      } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        type = "Spreadsheet";
      } else if (['pdf'].includes(ext)) {
        type = "PDF";
      } else if (['docx', 'doc'].includes(ext)) {
        type = "Document";
      } else if (['txt', 'md'].includes(ext)) {
        type = "Text";
      }

      return {
        id: file.id,
        name: file.name,
        type,
        size: sizeStr,
        uploadedAt: file.createdAt.toISOString(),
        owner: user.email || "",
        status: file.status === "ready" ? "synced" : file.status === "processing" ? "processing" : "failed",
      };
    });

    return {
      usage: {
        used: Number.parseFloat(usedGb.toFixed(2)),
        capacity: Number.parseFloat(capacityGb.toFixed(0)),
        fileCount: files.length,
      },
      files: formattedFiles,
    };
  } catch (error) {
    console.error("Error fetching file summary:", error);
    return {
      usage: {
        used: 0,
        capacity: 10,
        fileCount: 0,
      },
      files: [],
    };
  }
}

