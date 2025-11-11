"use client";

import { useEffect, useState } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "./elements/chain-of-thought";
import { Response } from "./elements/response";

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

  // Parse reasoning into steps (split by double newlines or numbered lists)
  const parseReasoningSteps = (text: string): string[] => {
    if (!text.trim()) return [];

    // Try to split by numbered steps (1., 2., etc.)
    const numberedSteps = text.match(/(?:^|\n)(?:\d+\.|\*|-)\s+[^\n]+(?:\n(?!\d+\.|\*|-).*?)*/g);
    if (numberedSteps && numberedSteps.length > 1) {
      return numberedSteps.map(step => step.trim());
    }

    // Try to split by double newlines
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs;
    }

    // Return as single step
    return [text];
  };

  const steps = parseReasoningSteps(reasoning);

  return (
    <ChainOfThought
      data-testid="message-reasoning"
      defaultOpen={defaultOpen}
    >
      <ChainOfThoughtHeader>
        {isLoading ? "Thinking..." : "Chain of Thought"}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step, index) => (
          <ChainOfThoughtStep
            key={`step-${index}-${step.substring(0, 20)}`}
            label={index === 0 && steps.length === 1 ? "Reasoning" : `Step ${index + 1}`}
            status={isLoading && index === steps.length - 1 ? "active" : "complete"}
          >
            <Response className="text-sm">{step}</Response>
          </ChainOfThoughtStep>
        ))}
        {isLoading && steps.length === 0 && (
          <ChainOfThoughtStep
            label="Processing"
            status="active"
          >
            <Response className="text-sm">Analyzing your request...</Response>
          </ChainOfThoughtStep>
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
