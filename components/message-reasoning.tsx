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
  const [_hasBeenStreaming, setHasBeenStreaming] = useState(
    isLoading || hasReasoningText
  );

  useEffect(() => {
    if (isLoading) {
      setHasBeenStreaming(true);
    }
  }, [isLoading]);

  // Parse reasoning into steps (split by double newlines or numbered lists)
  const parseReasoningSteps = (text: string): string[] => {
    if (!text.trim()) {
      return [];
    }

    // Try to split by numbered steps (1., 2., etc.)
    const numberedSteps = text.match(
      /(?:^|\n)(\d+\.|\*|-)\s+[^\n]+(?:\n(?!(?:\d+\.|\*|-)\s).*?)*/g
    );
    if (numberedSteps && numberedSteps.length > 1) {
      return numberedSteps.map((step) => step.trim());
    }

    // Try to split by double newlines
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs;
    }

    // Return as single step
    return [text];
  };

  const steps = parseReasoningSteps(reasoning);

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreaming}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
