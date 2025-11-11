import { useMemo } from "react";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DiffView } from "@/components/diffview";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { Editor } from "@/components/text-editor";
import type { Suggestion } from "@/lib/db/schema";
import { getSuggestions } from "../actions";

type TextArtifactMetadata = {
  suggestions: Suggestion[];
};

const INSTRUCTION_PREFIXES = [
  "create ",
  "draft ",
  "write ",
  "generate ",
  "please ",
  "kindly ",
  "compose ",
];

const INSTRUCTION_HINTS = [
  "include ",
  "ensure ",
  "following ",
  "based on ",
  "using ",
  "provide ",
  "should ",
  "must ",
  "context",
  "requirements",
];

const isConversationRoleLine = (line: string) => {
  return /^(user|assistant|system)\s*:/i.test(line);
};

const sanitizeDocumentContent = (value: string) => {
  if (!value) {
    return value;
  }

  const lines = value.split("\n");

  let startIndex = 0;
  let removedInstructionBlock = false;

  while (startIndex < lines.length) {
    const line = lines[startIndex].trim();

    if (!line) {
      startIndex += 1;
      continue;
    }

    const lower = line.toLowerCase();
    const startsWithKeyword = INSTRUCTION_PREFIXES.some((prefix) =>
      lower.startsWith(prefix)
    );
    const hasInstructionHint =
      INSTRUCTION_HINTS.some((hint) => lower.includes(hint)) ||
      lower.endsWith(":");
    const isConversationLine =
      lower.startsWith("conversation") ||
      lower.startsWith("prompt") ||
      isConversationRoleLine(line);
    const isBulletInstruction =
      (line.startsWith("-") || line.startsWith("•")) &&
      (removedInstructionBlock || startsWithKeyword) &&
      INSTRUCTION_HINTS.some((hint) => lower.includes(hint));

    if (isConversationLine) {
      removedInstructionBlock = true;
      startIndex += 1;
      continue;
    }

    if (startsWithKeyword && hasInstructionHint) {
      removedInstructionBlock = true;
      startIndex += 1;
      continue;
    }

    if (removedInstructionBlock && isBulletInstruction) {
      startIndex += 1;
      continue;
    }

    break;
  }

  if (startIndex === 0) {
    return value;
  }

  return lines.slice(startIndex).join("\n").trimStart();
};

export const textArtifact = new Artifact<"text", TextArtifactMetadata>({
  kind: "text",
  description: "Useful for text content, like drafting essays and emails.",
  initialize: async ({ documentId, setMetadata }) => {
    const suggestions = await getSuggestions({ documentId });

    setMetadata({
      suggestions,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-suggestion") {
      setMetadata((metadata) => {
        return {
          suggestions: [...metadata.suggestions, streamPart.data],
        };
      });
    }

    if (streamPart.type === "data-textDelta") {
      setArtifact((draftArtifact) => {
        const newContentLength =
          draftArtifact.content.length + streamPart.data.length;
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === "streaming" && newContentLength > 400
              ? true
              : draftArtifact.isVisible,
          status: "streaming",
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    const sanitizedContent = useMemo(
      () => sanitizeDocumentContent(content),
      [content]
    );

    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === "diff") {
      const oldContent = sanitizeDocumentContent(
        getDocumentContentById(currentVersionIndex - 1)
      );
      const newContent = sanitizeDocumentContent(
        getDocumentContentById(currentVersionIndex)
      );

      return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    return (
      <div className="flex flex-row px-4 py-8 md:p-20">
        <Editor
          content={sanitizedContent}
          currentVersionIndex={currentVersionIndex}
          isCurrentVersion={isCurrentVersion}
          onSaveContent={onSaveContent}
          status={status}
          suggestions={metadata ? metadata.suggestions : []}
        />

        {metadata?.suggestions && metadata.suggestions.length > 0 ? (
          <div className="h-dvh w-12 shrink-0 md:hidden" />
        ) : null}
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(sanitizeDocumentContent(content));
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: "Add final polish",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.",
            },
          ],
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: "Request suggestions",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add suggestions you have that could improve the writing.",
            },
          ],
        });
      },
    },
  ],
});
