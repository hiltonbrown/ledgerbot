"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "../toast";

export function SuggestionsForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState(data.suggestions);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleTextChange = (index: number, text: string) => {
    setFormState((state) =>
      state.map((suggestion, i) =>
        i === index ? { ...suggestion, text } : suggestion
      )
    );
  };

  const handleToggleEnabled = (index: number) => {
    setFormState((state) =>
      state.map((suggestion, i) =>
        i === index
          ? { ...suggestion, enabled: !suggestion.enabled }
          : suggestion
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedItem === null || draggedItem === targetIndex) {
      setDraggedItem(null);
      return;
    }

    const newState = [...formState];
    const draggedSuggestion = newState[draggedItem];
    newState.splice(draggedItem, 1);
    newState.splice(targetIndex, 0, draggedSuggestion);

    // Update order values
    const updatedState = newState.map((suggestion, index) => ({
      ...suggestion,
      order: index,
    }));

    setFormState(updatedState);
    setDraggedItem(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    // TODO: Replace with real async save operation, e.g. API call

    toast({
      type: "success",
      description: "Your suggestions have been saved.",
    });

    setIsSaving(false);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <h3 className="mb-4 font-medium text-foreground text-sm">
            Customize Main Page Suggestions
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Drag to reorder, toggle to enable/disable, or edit the text of each
            suggestion.
          </p>
        </div>

        <div className="space-y-3">
          {formState.map((suggestion, index) => (
            <div
              className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
              key={suggestion.id}
              style={{
                opacity: draggedItem === index ? 0.5 : 1,
              }}
            >
              <button
                aria-label={`Drag to reorder suggestion ${index + 1}`}
                className="mt-2 flex-shrink-0 cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
                draggable
                onDragOver={handleDragOver}
                onDragStart={() => handleDragStart(index)}
                onDrop={() => handleDrop(index)}
                type="button"
              >
                <GripVertical size={18} />
              </button>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    checked={suggestion.enabled}
                    className="h-4 w-4 cursor-pointer rounded border border-input"
                    id={`suggestion-${suggestion.id}`}
                    onChange={() => handleToggleEnabled(index)}
                    type="checkbox"
                  />
                  <Label
                    className="cursor-pointer font-medium text-muted-foreground text-xs"
                    htmlFor={`suggestion-${suggestion.id}`}
                  >
                    Enable suggestion {index + 1}
                  </Label>
                </div>
                <Input
                  className="text-sm"
                  disabled={!suggestion.enabled}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  placeholder="Enter suggestion text"
                  value={suggestion.text}
                />
              </div>

              <button
                aria-label={`Delete suggestion ${index + 1}`}
                className="mt-2 text-muted-foreground transition-colors hover:text-destructive"
                onClick={() => {
                  setFormState((state) => state.filter((_, i) => i !== index));
                }}
                type="button"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save suggestions"}
        </Button>
      </div>
    </form>
  );
}
