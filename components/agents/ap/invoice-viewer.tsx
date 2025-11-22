"use client";

import { Download, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type InvoiceViewerProps = {
  fileUrl: string | null;
  fileName: string | null;
  fileType: "pdf" | "image" | null;
};

export function InvoiceViewer({
  fileUrl,
  fileName,
  fileType,
}: InvoiceViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleDownload = () => {
    if (!fileUrl) {
      return;
    }
    window.open(fileUrl, "_blank");
  };

  if (!fileUrl || !fileType) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-[600px] flex-col items-center justify-center p-8">
          <div className="rounded-full bg-muted p-6">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium text-muted-foreground">
            No invoice selected
          </p>
          <p className="text-muted-foreground text-sm">
            Upload an invoice to view it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {fileName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              disabled={zoom <= 50}
              onClick={handleZoomOut}
              size="sm"
              variant="outline"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center text-muted-foreground text-sm">
              {zoom}%
            </span>
            <Button
              disabled={zoom >= 200}
              onClick={handleZoomIn}
              size="sm"
              variant="outline"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Download invoice"
              onClick={handleDownload}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="flex items-start justify-center bg-muted/30 p-4">
            {fileType === "pdf" ? (
              <iframe
                className={cn(
                  "border-0 bg-white shadow-lg transition-all",
                  "min-h-[800px]"
                )}
                sandbox="allow-same-origin"
                src={fileUrl}
                style={{
                  width: `${zoom}%`,
                  height: `${(zoom / 100) * 800}px`,
                }}
                title="Invoice PDF"
              />
            ) : (
              <img
                alt={fileName || "Invoice"}
                className="shadow-lg transition-all"
                src={fileUrl}
                style={{
                  width: `${zoom}%`,
                  height: "auto",
                }}
              />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
