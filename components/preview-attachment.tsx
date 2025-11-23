import Image from "next/image";
import { useCallback } from "react";
import { useArtifact } from "@/hooks/use-artifact";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossSmallIcon, FileIcon, FileTextIcon, TableIcon } from "./icons";
import { Button } from "./ui/button";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType, processingError, documentId } = attachment;
  const { setArtifact } = useArtifact();

  const handleClick = useCallback(async () => {
    // Only handle spreadsheet attachments with documentId
    if (
      !documentId ||
      (!contentType?.includes("spreadsheetml") && contentType !== "text/csv")
    ) {
      return;
    }

    try {
      // Fetch the document to get its content
      const response = await fetch(`/api/document?id=${documentId}`);
      if (!response.ok) {
        console.error("Failed to fetch document");
        return;
      }

      const documents = await response.json();
      const document = documents[0];

      if (document) {
        setArtifact({
          documentId,
          title: document.title,
          kind: "sheet",
          content: document.content,
          isVisible: true,
          status: "idle",
          boundingBox: {
            top: 0,
            left: 0,
            width: 0,
            height: 0,
          },
        });
      }
    } catch (error) {
      console.error("Error opening spreadsheet:", error);
    }
  }, [documentId, contentType, setArtifact]);

  const renderPreview = () => {
    if (contentType?.startsWith("image")) {
      return (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      );
    }

    if (contentType === "application/pdf") {
      return <FileTextIcon className="size-8 text-red-500" />;
    }

    if (contentType?.includes("wordprocessingml")) {
      return <FileTextIcon className="size-8 text-blue-500" />;
    }

    if (contentType?.includes("spreadsheetml") || contentType === "text/csv") {
      return <TableIcon className="size-8 text-green-500" />;
    }

    return <FileIcon className="size-8 text-muted-foreground" />;
  };

  const isClickable =
    documentId &&
    (contentType?.includes("spreadsheetml") || contentType === "text/csv");

  return (
    <div
      className={`group relative size-16 overflow-hidden rounded-lg border bg-muted ${isClickable ? "cursor-pointer transition-colors hover:border-primary" : ""}`}
      data-testid="input-attachment-preview"
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex size-full items-center justify-center">
        {renderPreview()}
      </div>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader size={16} />
        </div>
      )}

      {processingError && !isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/80 px-1 text-center text-[10px] text-white">
          Failed to process
        </div>
      )}

      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {name}
      </div>
    </div>
  );
};
