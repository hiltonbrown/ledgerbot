"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useContext, useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Response } from "./response";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  autoCloseOnFinish?: boolean;
};

const AUTO_CLOSE_DELAY = 500;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    autoCloseOnFinish = true,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: 0,
    });

    const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.round((Date.now() - startTime) / MS_IN_S));
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (
        autoCloseOnFinish &&
        defaultOpen &&
        !isStreaming &&
        isOpen &&
        !hasAutoClosedRef
      ) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosedRef(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [
      autoCloseOnFinish,
      isStreaming,
      isOpen,
      defaultOpen,
      setIsOpen,
      hasAutoClosedRef,
    ]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn("not-prose", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2 text-purple-900 text-sm font-medium transition-all hover:border-purple-300 hover:bg-purple-100/50 dark:border-purple-800/50 dark:bg-purple-950/30 dark:text-purple-100 dark:hover:border-purple-700 dark:hover:bg-purple-900/40",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <div className="flex flex-1 items-center gap-2">
              {isStreaming || duration === 0 ? (
                <span className="flex items-center gap-1.5">
                  Thinking
                  <span className="flex gap-0.5">
                    <span className="animate-bounce [animation-delay:0ms]">.</span>
                    <span className="animate-bounce [animation-delay:150ms]">.</span>
                    <span className="animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                </span>
              ) : (
                <span>Thought for {duration}s</span>
              )}
            </div>
            <ChevronDownIcon
              className={cn(
                "size-4 shrink-0 text-purple-600 transition-transform dark:text-purple-400",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-3 rounded-lg border border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-blue-50/30 p-4 shadow-sm dark:border-purple-800/30 dark:from-purple-950/20 dark:to-blue-950/10",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <div className="relative">
        <div className="absolute -left-2 top-0 h-full w-1 rounded-full bg-gradient-to-b from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600" />
        <Response className="ml-2 grid gap-2 text-purple-900/90 text-sm leading-relaxed dark:text-purple-100/90">
          {children}
        </Response>
      </div>
    </CollapsibleContent>
  )
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
