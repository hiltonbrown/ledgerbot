"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "../toast";

export function ChatSuggestionsForm({ data }: { data: UserSettings }) {
  const [suggestionsState, setSuggestionsState] = useState(data.suggestions);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSuggestionChange =
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setSuggestionsState((state) =>
        state.map((suggestion, i) =>
          i === index ? { ...suggestion, text: event.target.value } : suggestion
        )
      );
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Include all existing settings
          country: data.personalisation.country,
          state: data.personalisation.state,
          isLocked: data.personalisation.isLocked,
          defaultModel: data.personalisation.defaultModel,
          defaultReasoning: data.personalisation.defaultReasoning,
          companyName: data.personalisation.companyName,
          industryContext: data.personalisation.industryContext,
          chartOfAccounts: data.personalisation.chartOfAccounts,
          customVariables: data.personalisation.customVariables,
          customSystemInstructions:
            data.personalisation.customSystemInstructions,
          customCodeInstructions: data.personalisation.customCodeInstructions,
          customSheetInstructions: data.personalisation.customSheetInstructions,
          // Suggestions
          suggestions: suggestionsState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save suggestions");
      }

      toast({
        type: "success",
        description: "Chat suggestions saved successfully.",
      });

      router.refresh();
    } catch (error) {
      console.error("Error saving suggestions:", error);
      toast({
        type: "error",
        description: "Failed to save chat suggestions. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat Suggestions</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <p className="text-muted-foreground text-sm">
            Customize the 4 suggested prompts shown on the main chat page.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {suggestionsState.map((suggestion, index) => (
              <div className="space-y-2" key={suggestion.id}>
                <Label htmlFor={`suggestion-${index}`}>
                  Suggestion {index + 1}
                </Label>
                <Input
                  disabled={data.personalisation.isLocked || isSaving}
                  id={`suggestion-${index}`}
                  onChange={handleSuggestionChange(index)}
                  placeholder={`Enter suggestion ${index + 1}...`}
                  value={suggestion.text}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={isSaving}
              onClick={() => {
                setSuggestionsState(data.suggestions);
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Chat Suggestions"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
