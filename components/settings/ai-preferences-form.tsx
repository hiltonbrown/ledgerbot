"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { chatModels } from "@/lib/ai/models";
import { toast } from "../toast";

export function AIPreferencesForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState({
    defaultModel: data.personalisation.defaultModel,
    defaultReasoning: data.personalisation.defaultReasoning,
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleModelChange = (value: string) => {
    setFormState((state) => ({
      ...state,
      defaultModel: value,
    }));
  };

  const handleReasoningChange = (checked: boolean) => {
    setFormState((state) => ({
      ...state,
      defaultReasoning: checked,
    }));
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
          companyName: data.personalisation.companyName,
          industryContext: data.personalisation.industryContext,
          chartOfAccounts: data.personalisation.chartOfAccounts,
          customVariables: data.personalisation.customVariables,
          customSystemInstructions:
            data.personalisation.customSystemInstructions,
          customCodeInstructions: data.personalisation.customCodeInstructions,
          customSheetInstructions: data.personalisation.customSheetInstructions,
          suggestions: data.suggestions,
          // AI preferences
          defaultModel: formState.defaultModel,
          defaultReasoning: formState.defaultReasoning,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save AI preferences");
      }

      toast({
        type: "success",
        description: "AI preferences saved successfully.",
      });

      router.refresh();
    } catch (error) {
      console.error("Error saving AI preferences:", error);
      toast({
        type: "error",
        description: "Failed to save AI preferences. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="defaultModel">Default Chat Model</Label>
                <Select
                  disabled={data.personalisation.isLocked || isSaving}
                  onValueChange={handleModelChange}
                  value={formState.defaultModel}
                >
                  <SelectTrigger id="defaultModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chatModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {model.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  This model will be used by default when starting new chats.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 pt-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm" htmlFor="defaultReasoning">
                    Reasoning
                  </Label>
                  <Switch
                    checked={formState.defaultReasoning}
                    disabled={data.personalisation.isLocked || isSaving}
                    id="defaultReasoning"
                    onCheckedChange={handleReasoningChange}
                  />
                </div>
                <p className="text-right text-muted-foreground text-xs">
                  Enable extended thinking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={isSaving}
              onClick={() => {
                setFormState({
                  defaultModel: data.personalisation.defaultModel,
                  defaultReasoning: data.personalisation.defaultReasoning,
                });
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save AI Preferences"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
