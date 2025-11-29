"use client";

import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { DOMParser, type Node } from "prosemirror-model";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { renderToString } from "react-dom/server";

import { Response } from "@/components/elements/response";

import { documentSchema } from "./config";
import { createSuggestionWidget, type UISuggestion } from "./suggestions";

export const buildDocumentFromContent = (content: string) => {
  // Safety check for browser environment
  if (typeof document === "undefined") {
    console.error("buildDocumentFromContent called in non-browser environment");
    // Return empty document as fallback
    return documentSchema.node("doc", null, [
      documentSchema.node("paragraph", null, [
        documentSchema.text(content || ""),
      ]),
    ]);
  }

  try {
    const parser = DOMParser.fromSchema(documentSchema);
    const stringFromMarkdown = renderToString(<Response>{content}</Response>);
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = stringFromMarkdown;
    return parser.parse(tempContainer);
  } catch (error) {
    console.error("Error building document from content:", error);
    // Return simple text document as fallback
    return documentSchema.node("doc", null, [
      documentSchema.node("paragraph", null, [
        documentSchema.text(content || "Error loading content"),
      ]),
    ]);
  }
};

export const buildContentFromDocument = (document: Node) => {
  return defaultMarkdownSerializer.serialize(document);
};

export const createDecorations = (
  suggestions: UISuggestion[],
  view: EditorView
) => {
  const decorations: Decoration[] = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: "suggestion-highlight",
        },
        {
          suggestionId: suggestion.id,
          type: "highlight",
        }
      )
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (currentView) => {
          const { dom } = createSuggestionWidget(suggestion, currentView);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: "widget",
        }
      )
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};
