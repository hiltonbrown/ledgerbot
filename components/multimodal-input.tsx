"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { Trigger } from "@radix-ui/react-select";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  startTransition,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { SelectItem } from "@/components/ui/select";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { chatModels, isReasoningModelId } from "@/lib/ai/models";
import { myProvider } from "@/lib/ai/providers";
import type { VisibilityType } from "@/lib/chat/visibility";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn, generateUUID } from "@/lib/utils";
import { Context } from "./elements/context";
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CpuIcon,
  GlobeIcon,
  PaperclipIcon,
  StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  clearError,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  usage,
  isReasoningEnabled,
  onReasoningChange,
  isDeepResearchEnabled,
  onDeepResearchChange,
  suggestions,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  clearError: UseChatHelpers<ChatMessage>["clearError"];
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  usage?: AppUsage;
  isReasoningEnabled: boolean;
  onReasoningChange?: (enabled: boolean) => void;
  isDeepResearchEnabled: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  suggestions?: Array<{
    id: string;
    text: string;
    enabled: boolean;
    order: number;
  }>;
}) {
  const isAwaitingResponse = status === "submitted" || status === "streaming";

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const { setArtifact } = useArtifact();

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`);

    const parts: Array<
      | {
          type: "file";
          url: string;
          name: string;
          mediaType: string;
          extractedText?: string;
          fileSize?: number;
          processingError?: string;
          documentId?: string;
        }
      | {
          type: "text";
          text: string;
        }
    > = [
      ...attachments.map((attachment) => ({
        type: "file" as const,
        url: attachment.url,
        name: attachment.name,
        mediaType: attachment.contentType,
        extractedText: attachment.extractedText,
        fileSize: attachment.fileSize,
        processingError: attachment.processingError,
        documentId: attachment.documentId,
      })),
    ];

    // Only add text part if there's actual text content
    if (input.trim()) {
      parts.push({
        type: "text" as const,
        text: input,
      });
    }

    sendMessage({
      role: "user",
      parts,
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    resetHeight,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const {
          url,
          pathname,
          contentType,
          extractedText,
          fileSize,
          processingError,
        } = data;

        if (processingError) {
          toast.warning(
            `${file.name} uploaded, but could not be processed: ${processingError}`
          );
        }

        return {
          url,
          name: pathname,
          contentType,
          extractedText,
          fileSize,
          processingError,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const _modelResolver = useMemo(() => {
    return myProvider.languageModel(selectedModelId);
  }, [selectedModelId]);

  const contextProps = useMemo(
    () => ({
      usage,
      reasoningEnabled: isReasoningEnabled,
      deepResearchEnabled: isDeepResearchEnabled,
    }),
    [usage, isReasoningEnabled, isDeepResearchEnabled]
  );

  useEffect(() => {
    const spreadsheetAttachments = attachments.filter(
      (attachment) =>
        (attachment.contentType.includes("csv") ||
          attachment.contentType.includes("spreadsheetml")) &&
        attachment.extractedText &&
        !attachment.documentId &&
        !attachment.processingError
    );

    if (spreadsheetAttachments.length === 0) {
      return;
    }

    spreadsheetAttachments.forEach((attachment) => {
      const documentId = generateUUID();
      const baseName =
        attachment.name?.replace(/\.[^.]+$/, "") ?? "Imported Spreadsheet";
      const title =
        baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() ||
        "Imported Spreadsheet";

      void (async () => {
        try {
          const response = await fetch(`/api/document?id=${documentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              kind: "sheet",
              content: attachment.extractedText ?? "",
              chatId: undefined, // Chat doesn't exist yet - will be updated when message is sent
            }),
          });

          if (!response.ok) {
            let errorText = "";
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = "Could not read response body";
            }
            console.error("Document creation failed");
            console.error("Status:", response.status);
            console.error("StatusText:", response.statusText);
            console.error("Body:", errorText);
            console.error("URL:", response.url);
            console.error("OK:", response.ok);
            throw new Error(
              `Failed to persist spreadsheet (${response.status}): ${errorText}`
            );
          }

          setAttachments((currentAttachments) =>
            currentAttachments.map((item) =>
              item.url === attachment.url ? { ...item, documentId } : item
            )
          );

          setArtifact({
            ...initialArtifactData,
            documentId,
            title,
            kind: "sheet",
            content: attachment.extractedText ?? "",
            isVisible: true,
            status: "idle",
          });
        } catch (error) {
          console.error("Failed to import CSV attachment", error);
          toast.error(
            `Unable to open ${attachment.name ?? "spreadsheet"} in the editor. Please try again.`,
            { id: `csv-import-${documentId}` }
          );
        }
      })();
    });
  }, [attachments, setAttachments, setArtifact, chatId]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        void handleFileDrop(files);
      }
    },
    [handleFileDrop]
  );

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
            suggestions={suggestions}
          />
        )}

      <input
        accept="image/*,.pdf,.docx,.xlsx,.csv"
        className="-left-4 -top-4 fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <PromptInput
        className={cn(
          "rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50",
          isDraggingOver && "border-2 border-primary bg-accent/50"
        )}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onSubmit={(event) => {
          event.preventDefault();
          if (isAwaitingResponse) {
            toast.error("Please wait for the model to finish its response!");
          } else {
            if (status === "error") {
              clearError();
            }
            submitForm();
          }
        }}
        suppressHydrationWarning
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            autoFocus
            className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={200}
            minHeight={44}
            onChange={handleInput}
            placeholder="Send a message..."
            ref={textareaRef}
            rows={1}
            suppressHydrationWarning
            value={input}
          />{" "}
          <Context {...contextProps} />
        </div>
        <PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <AttachmentsButton
              fileInputRef={fileInputRef}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ModelSelectorCompact
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
            />
            <DeepResearchToggle
              disabled={isAwaitingResponse}
              isEnabled={isDeepResearchEnabled}
              onToggle={onDeepResearchChange}
            />
            <ReasoningToggle
              disabled={!isReasoningModelId(selectedModelId)}
              isEnabled={isReasoningEnabled}
              onToggle={onReasoningChange}
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              disabled={
                (attachments.length === 0 && !input.trim()) ||
                uploadQueue.length > 0
              }
              status={status}
            >
              <ArrowUpIcon size={14} />
            </PromptInputSubmit>
          )}
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.isReasoningEnabled !== nextProps.isReasoningEnabled) {
      return false;
    }
    if (prevProps.isDeepResearchEnabled !== nextProps.isDeepResearchEnabled) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const isAwaitingResponse = status === "submitted" || status === "streaming";

  return (
    <Button
      className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
      data-testid="attachments-button"
      disabled={isAwaitingResponse}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        fileInputRef.current?.click();
      }}
      type="button"
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);

  useEffect(() => {
    setOptimisticModelId(selectedModelId);
  }, [selectedModelId]);

  const selectedModel = chatModels.find(
    (model) => model.id === optimisticModelId
  );

  return (
    <PromptInputModelSelect
      onValueChange={(modelName) => {
        const model = chatModels.find((m) => m.name === modelName);
        if (model) {
          setOptimisticModelId(model.id);
          onModelChange?.(model.id);
          startTransition(() => {
            saveChatModelAsCookie(model.id);
          });
        }
      }}
      value={selectedModel?.name}
    >
      <Trigger
        className="flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none transition-colors hover:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        suppressHydrationWarning
        type="button"
      >
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block">
          {selectedModel?.name}
        </span>
        <ChevronDownIcon size={16} />
      </Trigger>
      <PromptInputModelSelectContent className="min-w-[260px] p-0">
        <div className="flex flex-col gap-px">
          {chatModels.map((model) => (
            <SelectItem key={model.id} value={model.name}>
              <div className="truncate font-medium text-xs">{model.name}</div>
              <div className="mt-px truncate text-[10px] text-muted-foreground leading-tight">
                {model.description}
              </div>
            </SelectItem>
          ))}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureDeepResearchToggle({
  isEnabled,
  onToggle,
  disabled,
}: {
  isEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const switchId = useId();

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg bg-background px-2 font-medium text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground opacity-60"
          : "text-foreground hover:bg-accent"
      )}
      data-disabled={disabled ? "" : undefined}
    >
      <GlobeIcon size={14} />
      <Label
        className={cn(
          "hidden font-medium text-xs sm:inline",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        htmlFor={switchId}
        suppressHydrationWarning
      >
        Deep Research
      </Label>
      <Switch
        aria-label="Toggle deep research"
        checked={isEnabled}
        data-testid="deep-research-toggle"
        disabled={disabled}
        id={switchId}
        onCheckedChange={(checked) => onToggle?.(checked)}
      />
    </div>
  );
}

const DeepResearchToggle = memo(PureDeepResearchToggle);

function PureReasoningToggle({
  isEnabled,
  onToggle,
  disabled,
}: {
  isEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const switchId = useId();

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg bg-background px-2 font-medium text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground opacity-60"
          : "text-foreground hover:bg-accent"
      )}
      data-disabled={disabled ? "" : undefined}
    >
      <Label
        className={cn(
          "hidden font-medium text-xs sm:inline",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        htmlFor={switchId}
        suppressHydrationWarning
      >
        Reasoning
      </Label>
      <Switch
        aria-label="Toggle reasoning"
        checked={isEnabled}
        data-testid="reasoning-toggle"
        disabled={disabled}
        id={switchId}
        onCheckedChange={(checked) => onToggle?.(checked)}
        suppressHydrationWarning
      />
    </div>
  );
}

const ReasoningToggle = memo(PureReasoningToggle);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
