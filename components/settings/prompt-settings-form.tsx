"use client";

import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../toast";

export function PromptSettingsForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState(data.prompts);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange =
    (field: keyof UserSettings["prompts"]) =>
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    // TODO: Replace with real async save operation, e.g. API call

    toast({
      type: "success",
      description: "Your prompt settings have been saved.",
    });

    setIsSaving(false);
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          onChange={handleInputChange("systemPrompt")}
          placeholder="Enter your custom system prompt..."
          rows={4}
          value={formState.systemPrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt defines the AI assistant's general behavior and
          personality.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="codePrompt">Code Generation Prompt</Label>
        <Textarea
          id="codePrompt"
          onChange={handleInputChange("codePrompt")}
          placeholder="Enter your custom code generation prompt..."
          rows={8}
          value={formState.codePrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt is used when generating code snippets and programming
          assistance.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sheetPrompt">Spreadsheet Prompt</Label>
        <Textarea
          id="sheetPrompt"
          onChange={handleInputChange("sheetPrompt")}
          placeholder="Enter your custom spreadsheet prompt..."
          rows={4}
          value={formState.sheetPrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt is used when creating spreadsheets and data analysis.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
