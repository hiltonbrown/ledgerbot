"use client";

import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Pin,
  PinOff,
  Sheet,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContextFile } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (fileType.includes("pdf")) {
    return <FileText className="h-4 w-4" />;
  }
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
    return <Sheet className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function FileManager() {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{
    files: ContextFile[];
    usage: {
      used: number;
      fileCount: number;
      capacity: number;
    };
  }>("/api/context-files", fetcher);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    setDeletingId(fileId);
    try {
      const response = await fetch(`/api/context-files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      await mutate();
      router.refresh();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (fileId: string, currentPinned: boolean) => {
    setTogglingPinId(fileId);
    try {
      const response = await fetch(`/api/context-files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });

      if (!response.ok) {
        throw new Error("Failed to update pin status");
      }

      await mutate();
      router.refresh();
    } catch (error) {
      console.error("Error toggling pin:", error);
      alert("Failed to update pin status. Please try again.");
    } finally {
      setTogglingPinId(null);
    }
  };

  const handleDownload = (file: ContextFile) => {
    window.open(file.blobUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Failed to load files. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const files = data?.files ?? [];
  const usage = data?.usage;

  return (
    <div className="space-y-6">
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storage Usage</CardTitle>
            <CardDescription>
              {usage.fileCount} files • {formatFileSize(usage.used)} of{" "}
              {formatFileSize(usage.capacity)} used
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Files</CardTitle>
          <CardDescription>
            Manage your uploaded context files. Pinned files will be included in
            all chat conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">No files uploaded</h3>
              <p className="text-muted-foreground text-sm">
                Upload files from the chat interface to see them here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Chat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{getFileIcon(file.fileType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{file.originalName}</span>
                        {file.isPinned && (
                          <Badge variant="secondary" className="text-xs">
                            <Pin className="mr-1 h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      {file.description && (
                        <p className="text-muted-foreground text-xs">
                          {file.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.status === "ready" && (
                        <Badge variant="default" className="bg-green-500">
                          Ready
                        </Badge>
                      )}
                      {file.status === "processing" && (
                        <Badge variant="secondary">Processing</Badge>
                      )}
                      {file.status === "failed" && (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                    <TableCell>{formatDate(file.createdAt)}</TableCell>
                    <TableCell>
                      {file.chatId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          asChild
                        >
                          <Link href={`/chat/${file.chatId}`}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            View Chat
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleTogglePin(file.id, file.isPinned ?? false)
                          }
                          disabled={togglingPinId === file.id}
                          title={
                            file.isPinned ? "Unpin from all chats" : "Pin to all chats"
                          }
                        >
                          {togglingPinId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : file.isPinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          title="Delete file"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
