"use client";

import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InvoiceUploadZoneProps {
  onFileUploaded: (fileData: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    mimeType: string;
  }) => void;
  disabled?: boolean;
}

export function InvoiceUploadZone({
  onFileUploaded,
  disabled = false,
}: InvoiceUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/agents/ap/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      setUploadStatus("success");
      setUploadedFileName(file.name);
      onFileUploaded({
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        mimeType: data.mimeType,
      });
    } catch (error) {
      setUploadStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      await uploadFile(file);
    },
    [disabled, uploadFile]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFile(file);

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-all",
          isDragging && "border-primary bg-primary/5 shadow-lg",
          disabled && "cursor-not-allowed opacity-50",
          uploadStatus === "success" && "border-green-500",
          uploadStatus === "error" && "border-red-500"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          {isUploading ? (
            <>
              <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
              <p className="font-medium text-lg">Uploading invoice...</p>
              <p className="text-muted-foreground text-sm">
                Please wait while we process your file
              </p>
            </>
          ) : uploadStatus === "success" ? (
            <>
              <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
              <p className="font-medium text-lg">Upload successful!</p>
              <p className="text-muted-foreground text-sm">{uploadedFileName}</p>
              <p className="mt-4 text-muted-foreground text-xs">
                Drop another file to replace
              </p>
            </>
          ) : uploadStatus === "error" ? (
            <>
              <XCircle className="mb-4 h-16 w-16 text-red-500" />
              <p className="font-medium text-lg">Upload failed</p>
              <p className="text-red-500 text-sm">{errorMessage}</p>
              <p className="mt-4 text-muted-foreground text-xs">
                Try again or select a different file
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-full bg-primary/10 p-6">
                {isDragging ? (
                  <Upload className="h-12 w-12 text-primary" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <p className="mb-2 font-semibold text-lg">
                {isDragging
                  ? "Drop your invoice here"
                  : "Drag & drop invoice"}
              </p>
              <p className="mb-4 text-muted-foreground text-sm">
                or click to browse files
              </p>
              <input
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                disabled={disabled}
                id="invoice-upload"
                onChange={handleFileSelect}
                type="file"
              />
              <label
                className={cn(
                  "cursor-pointer rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90",
                  disabled && "pointer-events-none opacity-50"
                )}
                htmlFor="invoice-upload"
              >
                Select File
              </label>
              <p className="mt-4 text-muted-foreground text-xs">
                Supported: PDF, JPG, PNG (max 10MB)
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload History / Recent Uploads */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Processing Steps</h3>
        <ol className="space-y-1.5 text-muted-foreground text-xs">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Extract invoice data (OCR/AI)
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Match or create vendor
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Validate ABN and check duplicates
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Suggest GL coding and tax codes
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Create draft bill in Xero
          </li>
        </ol>
      </div>
    </div>
  );
}
