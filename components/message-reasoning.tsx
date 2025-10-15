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
};

export function MessageReasoning({
  isLoading,
  reasoning,
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
      defaultOpen={true}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
