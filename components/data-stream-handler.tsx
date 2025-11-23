"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const _lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      // First, update artifact state to ensure kind is set
      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            // If a new artifact is being created while a sheet is visible,
            // keep the sheet visible (don't auto-show the new artifact)
            const preserveSheetVisibility =
              draftArtifact.kind === "sheet" && draftArtifact.isVisible;

            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
              // Keep sheet visible if it was visible before
              isVisible: preserveSheetVisibility
                ? true
                : draftArtifact.isVisible,
            };

          case "data-title": {
            // Extract short title (before pipe) if present
            const shortTitle = delta.data.includes("|")
              ? delta.data.split("|")[0].trim()
              : delta.data;
            return {
              ...draftArtifact,
              title: shortTitle,
              status: "streaming",
            };
          }

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });

      // Then, find artifact definition using current artifact state
      // For data-kind events, we need to use the delta data directly
      const artifactKind =
        delta.type === "data-kind" ? delta.data : artifact.kind;
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifactKind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream]);

  return null;
}
