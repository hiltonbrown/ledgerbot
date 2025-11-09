"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContextFile } from "@/lib/db/schema";
import { FILE_TYPE_LABELS } from "@/lib/types";

function formatStatus(status: ContextFile["status"]) {
  switch (status) {
    case "ready":
      return <Badge variant="secondary">Ready</Badge>;
    case "processing":
      return <Badge variant="outline">Processing…</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return null;
  }
}

export function ContextFileList({ files }: { files: ContextFile[] }) {
  const [fileList, setFileList] = useState(files);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this file?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/context-files/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Failed to delete file" }));
        toast.error(data.error ?? "Failed to delete file");
        return;
      }

      setFileList((previous) => previous.filter((file) => file.id !== id));
      toast.success("File deleted");
    } catch (error) {
      console.error("Failed to delete context file", error);
      toast.error("Failed to delete file");
    }
  };

  const handlePin = async (file: ContextFile) => {
    try {
      const response = await fetch(`/api/context-files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !file.isPinned }),
      });

      if (!response.ok) {
        toast.error("Failed to update file");
        return;
      }

      const updated = await response.json();
      setFileList((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(file.isPinned ? "File unpinned" : "File pinned");
    } catch (error) {
      console.error("Failed to update context file", error);
      toast.error("Failed to update file");
    }
  };

  if (fileList.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {fileList.map((file) => {
        const typeLabel = FILE_TYPE_LABELS[file.fileType] ?? file.fileType;
        const sizeKb = (file.fileSize / 1024).toFixed(1);

        return (
          <div
            className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            key={file.id}
          >
            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{file.originalName}</span>
                {file.isPinned ? <Badge variant="outline">Pinned</Badge> : null}
                {formatStatus(file.status)}
              </div>
              <div className="text-muted-foreground text-xs">
                {typeLabel} • {sizeKb} KB
                {file.tokenCount ? ` • ${file.tokenCount} tokens` : ""}
              </div>
              {file.description ? (
                <p className="text-muted-foreground text-xs italic">
                  {file.description}
                </p>
              ) : null}
              {file.errorMessage ? (
                <p className="text-destructive text-xs">
                  Error: {file.errorMessage}
                </p>
              ) : null}
              <p
                className="text-muted-foreground text-xs"
                suppressHydrationWarning
              >
                Uploaded {new Date(file.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handlePin(file)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {file.isPinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                onClick={() => window.open(file.blobUrl, "_blank")}
                size="sm"
                type="button"
                variant="ghost"
              >
                View
              </Button>
              <Button
                onClick={() => handleDelete(file.id)}
                size="sm"
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
