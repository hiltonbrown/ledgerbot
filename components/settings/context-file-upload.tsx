"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ContextFileUpload({
  maxStorage,
  currentUsage,
}: {
  maxStorage: number;
  currentUsage: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    let usage = currentUsage;

    try {
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is larger than the 10MB limit.`);
          continue;
        }

        if (usage + file.size > maxStorage) {
          toast.error(
            `Uploading ${file.name} would exceed your storage quota.`
          );
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/context-files", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => ({ error: "Upload failed" }));
          toast.error(data.error ?? "Failed to upload file");
          continue;
        }

        toast.success(`${file.name} uploaded`);
        usage += file.size;
      }

      window.location.reload();
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-2">
      <input
        accept="image/*,.pdf,.docx,.xlsx"
        className="hidden"
        multiple
        onChange={handleUpload}
        ref={fileInputRef}
        type="file"
      />
      <Button
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <UploadIcon className="mr-2 size-4" />
        {isUploading ? "Uploading..." : "Upload files"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Supported formats: Images, PDF, DOCX, XLSX. Maximum 10MB per file.
      </p>
    </div>
  );
}
