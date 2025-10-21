"use client";

import { useEffect, useState } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./elements/reasoning";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
  defaultOpen?: boolean;
};

export function MessageReasoning({
  isLoading,
  reasoning,
  defaultOpen = true,
}: MessageReasoningProps) {
  const hasReasoningText = reasoning.trim().length > 0;
  const [hasBeenStreaming, setHasBeenStreaming] = useState(
    isLoading || hasReasoningText
  );

  useEffect(() => {
    if (isLoading) {
      setHasBeenStreaming(true);
    }
  }, [isLoading]);

  // Keep reasoning open by default, allow user to collapse if desired
  return (
    <Reasoning
      autoCloseOnFinish={false}
      data-testid="message-reasoning"
      defaultOpen={defaultOpen}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
