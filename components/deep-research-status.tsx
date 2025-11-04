"use client";

import { memo, useMemo } from "react";
import type { DeepResearchMessageMetadata } from "@/lib/types";
import { Badge } from "./ui/badge";
import { GlobeIcon } from "./icons";

const STATUS_COPY: Record<
  DeepResearchMessageMetadata["status"],
  { label: string; helper: string }
> = {
  "needs-details": {
    label: "Needs detailed question",
    helper: "Share a focused research question with context to begin the investigation.",
  },
  "awaiting-approval": {
    label: "Awaiting approval",
    helper: "Review the findings and approve to generate the final report or request a deeper dive.",
  },
  "report-generated": {
    label: "Report delivered",
    helper: "A full markdown report has been generated for this session.",
  },
  error: {
    label: "Workflow error",
    helper: "The workflow encountered an error. Adjust the request or retry shortly.",
  },
};

function formatConfidence(confidence?: number) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return undefined;
  }

  const bounded = Math.max(0, Math.min(1, confidence));
  return `${Math.round(bounded * 100)}%`;
}

type DeepResearchStatusProps = {
  metadata: DeepResearchMessageMetadata;
};

function PureDeepResearchStatus({ metadata }: DeepResearchStatusProps) {
  const copy = STATUS_COPY[metadata.status];
  const confidenceLabel = formatConfidence(metadata.confidence);
  const planCount = metadata.plan?.length ?? 0;
  const sourceCount = metadata.sources?.length ?? 0;
  const sessionSnippet = useMemo(() => metadata.sessionId.slice(0, 8), [
    metadata.sessionId,
  ]);
  const parentSnippet = useMemo(
    () => metadata.parentSessionId?.slice(0, 8),
    [metadata.parentSessionId]
  );

  return (
    <div className="mb-2 flex flex-col gap-1.5 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2 text-foreground">
        <Badge variant="outline" className="gap-1 bg-background/80">
          <GlobeIcon size={12} />
          <span className="font-semibold uppercase tracking-wide">Deep Research</span>
        </Badge>
        <span className="font-medium">{copy.label}</span>
        {confidenceLabel ? (
          <span className="text-muted-foreground">Confidence {confidenceLabel}</span>
        ) : null}
        {planCount > 0 ? (
          <span className="text-muted-foreground">
            {planCount} step{planCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {sourceCount > 0 ? (
          <span className="text-muted-foreground">
            {sourceCount} source{sourceCount === 1 ? "" : "s"}
          </span>
        ) : null}
        <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">
          Session {sessionSnippet}…
        </span>
      </div>
      <p className="leading-relaxed text-muted-foreground">{copy.helper}</p>
      {metadata.parentSessionId && parentSnippet ? (
        <p className="text-muted-foreground/80">
          Follow-up to {parentSnippet}…
        </p>
      ) : null}
    </div>
  );
}

export const DeepResearchStatus = memo(PureDeepResearchStatus);
