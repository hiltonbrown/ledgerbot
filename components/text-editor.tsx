"use client";

import { exampleSetup } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { memo, useEffect, useRef, useState } from "react";

import type { Suggestion } from "@/lib/db/schema";
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from "@/lib/editor/config";
import {
  buildContentFromDocument,
  buildDocumentFromContent,
  createDecorations,
} from "@/lib/editor/functions";
import {
  projectWithPositions,
  suggestionsPlugin,
  suggestionsPluginKey,
} from "@/lib/editor/suggestions";

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Suggestion[];
};

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [isEditorInitialized, setIsEditorInitialized] = useState(false);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      try {
        const state = EditorState.create({
          doc: buildDocumentFromContent(content),
          plugins: [
            ...exampleSetup({ schema: documentSchema, menuBar: false }),
            inputRules({
              rules: [
                headingRule(1),
                headingRule(2),
                headingRule(3),
                headingRule(4),
                headingRule(5),
                headingRule(6),
              ],
            }),
            suggestionsPlugin,
          ],
        });

        editorRef.current = new EditorView(containerRef.current, {
          state,
        });
        setIsEditorInitialized(true);
      } catch (error) {
        console.error("Failed to initialize editor:", error);
        setIsEditorInitialized(false);
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
        setIsEditorInitialized(false);
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, [content]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({
            transaction,
            editorRef,
            onSaveContent,
          });
        },
      });
    }
  }, [onSaveContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc
      );

      if (status === "streaming") {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content
        );

        transaction.setMeta("no-save", true);
        editorRef.current.dispatch(transaction);
        return;
      }

      if (currentContent !== content) {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content
        );

        transaction.setMeta("no-save", true);
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  useEffect(() => {
    const view = editorRef.current;

    if (view?.state?.doc && content) {
      const projectedSuggestions = projectWithPositions(
        view.state.doc,
        suggestions
      ).filter(
        (suggestion) => suggestion.selectionStart && suggestion.selectionEnd
      );

      const decorations = createDecorations(projectedSuggestions, view);

      const transaction = view.state.tr;
      transaction.setMeta(suggestionsPluginKey, { decorations });
      view.dispatch(transaction);
    }
  }, [suggestions, content]);

  return (
    <>
      <div
        className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert relative w-full max-w-none px-4 py-2"
        ref={containerRef}
      />
      {/* Fallback content display - shown only when editor fails to initialize */}
      {!isEditorInitialized && content && (
        <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert relative w-full max-w-none px-4 py-2">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      )}
    </>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.onSaveContent === nextProps.onSaveContent
  );
}

export const Editor = memo(PureEditor, areEqual);
