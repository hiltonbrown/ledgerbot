"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
} from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { chatModels } from "@/lib/ai/models";
import type { AuthUser } from "@/lib/types/auth";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";

export function ModelSelector({
  user,
  selectedModelId,
  className,
  onModelChange,
  ...buttonProps
}: {
  user: AuthUser;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
} & React.ComponentProps<typeof Button>) {
  const { disabled: buttonDisabled, ...restButtonProps } = buttonProps;
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const userType = user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id)
  );

  const fallbackChatModel = availableChatModels[0] ?? null;

  useEffect(() => {
    if (!fallbackChatModel) {
      return;
    }

    const isSelectionEntitled = availableChatModelIds.includes(selectedModelId);

    if (!isSelectionEntitled && selectedModelId !== fallbackChatModel.id) {
      startTransition(() => {
        setOptimisticModelId(fallbackChatModel.id);
        void saveChatModelAsCookie(fallbackChatModel.id);
      });
      onModelChange?.(fallbackChatModel.id);
    }
  }, [
    availableChatModelIds,
    fallbackChatModel,
    onModelChange,
    selectedModelId,
    setOptimisticModelId,
  ]);

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId
      ) ?? fallbackChatModel,
    [availableChatModels, fallbackChatModel, optimisticModelId]
  );

  const hasAvailableModels = availableChatModels.length > 0;

  const handleModelSelection = (id: string) => {
    setOpen(false);

    if (id === optimisticModelId) {
      return;
    }

    startTransition(() => {
      setOptimisticModelId(id);
      void saveChatModelAsCookie(id);
    });

    onModelChange?.(id);
  };

  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        if (hasAvailableModels) {
          setOpen(nextOpen);
        }
      }}
      open={hasAvailableModels ? open : false}
    >
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button
          {...restButtonProps}
          className="md:h-[34px] md:px-2"
          data-testid="model-selector"
          disabled={buttonDisabled || !hasAvailableModels}
          aria-label="Select a chat model"
          variant="outline"
        >
          {selectedChatModel?.name ?? "Select a model"}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[280px] max-w-[90vw] sm:min-w-[300px]"
      >
        {hasAvailableModels ? (
          availableChatModels.map((chatModel) => {
            const { id } = chatModel;

            return (
              <DropdownMenuItem
                asChild
                data-active={id === optimisticModelId}
                data-testid={`model-selector-item-${id}`}
                key={id}
                onSelect={() => handleModelSelection(id)}
              >
                <button
                  className="group/item flex w-full flex-row items-center justify-between gap-2 sm:gap-4"
                  type="button"
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="text-sm sm:text-base">{chatModel.name}</div>
                    <div className="line-clamp-2 text-muted-foreground text-xs">
                      {chatModel.description}
                    </div>
                  </div>

                  <div className="shrink-0 text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No chat models available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
