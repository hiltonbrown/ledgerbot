"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../toast";

export function CustomInstructionsForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState({
    systemInstructions: data.personalisation.customSystemInstructions || "",
    codeInstructions: data.personalisation.customCodeInstructions || "",
    sheetInstructions: data.personalisation.customSheetInstructions || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleChange =
    (field: "systemInstructions" | "codeInstructions" | "sheetInstructions") =>
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormState((state) => ({
        ...state,
        [field]: event.target.value,
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
          defaultModel: data.personalisation.defaultModel,
          defaultReasoning: data.personalisation.defaultReasoning,
          companyName: data.personalisation.companyName,
          industryContext: data.personalisation.industryContext,
          chartOfAccounts: data.personalisation.chartOfAccounts,
          customVariables: data.personalisation.customVariables,
          suggestions: data.suggestions,
          // Custom instructions
          customSystemInstructions: formState.systemInstructions,
          customCodeInstructions: formState.codeInstructions,
          customSheetInstructions: formState.sheetInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save custom instructions");
      }

      toast({
        type: "success",
        description: "Custom instructions saved successfully.",
      });

      router.refresh();
    } catch (error) {
      console.error("Error saving custom instructions:", error);
      toast({
        type: "error",
        description: "Failed to save custom instructions. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Instructions</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <p className="text-muted-foreground text-sm">
            Add your own instructions to customize how the AI responds. These
            will be combined with LedgerBot's base prompts.
          </p>

          <div className="space-y-2">
            <Label htmlFor="customSystemInstructions">
              Custom System Instructions
            </Label>
            <Collapsible>
              <CollapsibleTrigger className="mb-2 flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground">
                <ChevronDown className="h-3 w-3" />
                About the base system prompt
              </CollapsibleTrigger>
              <CollapsibleContent className="mb-2 rounded-md border bg-muted/30 p-3 text-muted-foreground text-xs">
                The base system prompt defines LedgerBot as an expert accounting
                assistant for Australian businesses. It includes comprehensive
                accounting capabilities, GST/BAS compliance knowledge,
                Australian terminology, and best practices for bookkeeping and
                tax compliance.
              </CollapsibleContent>
            </Collapsible>
            <Textarea
              disabled={data.personalisation.isLocked || isSaving}
              id="customSystemInstructions"
              onChange={handleChange("systemInstructions")}
              placeholder="Add your custom instructions here (optional)..."
              rows={4}
              value={formState.systemInstructions}
            />
            <p className="text-muted-foreground text-xs">
              Add specific instructions for your business context. These will be
              combined with the base LedgerBot system prompt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCodeInstructions">
              Custom Code Instructions
            </Label>
            <Collapsible>
              <CollapsibleTrigger className="mb-2 flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground">
                <ChevronDown className="h-3 w-3" />
                About the base code prompt
              </CollapsibleTrigger>
              <CollapsibleContent className="mb-2 rounded-md border bg-muted/30 p-3 text-muted-foreground text-xs">
                The base code prompt defines LedgerBot as a Python code
                generator that creates self-contained, executable code snippets.
                It includes guidelines for clean code, proper error handling,
                and meaningful outputs without external dependencies.
              </CollapsibleContent>
            </Collapsible>
            <Textarea
              disabled={data.personalisation.isLocked || isSaving}
              id="customCodeInstructions"
              onChange={handleChange("codeInstructions")}
              placeholder="Add your custom code instructions here (optional)..."
              rows={4}
              value={formState.codeInstructions}
            />
            <p className="text-muted-foreground text-xs">
              Add specific coding preferences or requirements. These will be
              combined with the base code generation prompt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customSheetInstructions">
              Custom Spreadsheet Instructions
            </Label>
            <Collapsible>
              <CollapsibleTrigger className="mb-2 flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground">
                <ChevronDown className="h-3 w-3" />
                About the base spreadsheet prompt
              </CollapsibleTrigger>
              <CollapsibleContent className="mb-2 rounded-md border bg-muted/30 p-3 text-muted-foreground text-xs">
                The base spreadsheet prompt defines how LedgerBot creates CSV
                spreadsheets with meaningful column headers, realistic data, and
                proper formatting for business and accounting use cases.
              </CollapsibleContent>
            </Collapsible>
            <Textarea
              disabled={data.personalisation.isLocked || isSaving}
              id="customSheetInstructions"
              onChange={handleChange("sheetInstructions")}
              placeholder="Add your custom spreadsheet instructions here (optional)..."
              rows={4}
              value={formState.sheetInstructions}
            />
            <p className="text-muted-foreground text-xs">
              Add specific spreadsheet formatting or data preferences. These
              will be combined with the base spreadsheet prompt.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={isSaving}
              onClick={() => {
                setFormState({
                  systemInstructions:
                    data.personalisation.customSystemInstructions || "",
                  codeInstructions:
                    data.personalisation.customCodeInstructions || "",
                  sheetInstructions:
                    data.personalisation.customSheetInstructions || "",
                });
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Custom Instructions"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
