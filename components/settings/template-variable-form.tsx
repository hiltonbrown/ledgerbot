"use client";

import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../toast";
import { CustomVariablesEditor } from "./custom-variables-editor";

export function TemplateVariableForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState({
    companyName: data.personalisation.companyName || "",
    industryContext: data.personalisation.industryContext || "",
    chartOfAccounts: data.personalisation.chartOfAccounts || "",
    customVariables: data.personalisation.customVariables || {},
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange =
    (field: keyof typeof formState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

  const handleCustomVariablesChange = (variables: Record<string, string>) => {
    setFormState((state) => ({
      ...state,
      customVariables: variables,
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
          systemPrompt: data.prompts.systemPrompt,
          codePrompt: data.prompts.codePrompt,
          sheetPrompt: data.prompts.sheetPrompt,
          suggestions: data.suggestions,
          // Template variables
          companyName: formState.companyName,
          industryContext: formState.industryContext,
          chartOfAccounts: formState.chartOfAccounts,
          customVariables: formState.customVariables,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template variables");
      }

      toast({
        type: "success",
        description: "Template variables have been saved successfully.",
      });

      // Reload the page to apply the new template variables
      window.location.reload();
    } catch (error) {
      console.error("Error saving template variables:", error);
      toast({
        type: "error",
        description: "Failed to save template variables. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          disabled={data.personalisation.isLocked || isSaving}
          id="companyName"
          onChange={handleInputChange("companyName")}
          placeholder="e.g., Acme Pty Ltd"
          value={formState.companyName}
        />
        <p className="text-muted-foreground text-xs">
          Available in prompts as{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{"}
            {"{"}COMPANY_NAME{"}"}
            {"}"}
          </code>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industryContext">Industry / Business Information</Label>
        <Textarea
          disabled={data.personalisation.isLocked || isSaving}
          id="industryContext"
          onChange={handleInputChange("industryContext")}
          placeholder="e.g., Retail business selling office supplies with 3 locations across NSW. We have 15 staff members and turnover approximately $2M annually. Main customers are small businesses and schools."
          rows={6}
          value={formState.industryContext}
        />
        <p className="text-muted-foreground text-xs">
          Describe your business type, industry, size, and any specific context
          that helps the AI understand your needs. Available in prompts as{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{"}
            {"{"}INDUSTRY_CONTEXT{"}"}
            {"}"}
          </code>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chartOfAccounts">Chart of Accounts</Label>
        <Textarea
          disabled={data.personalisation.isLocked || isSaving}
          id="chartOfAccounts"
          onChange={handleInputChange("chartOfAccounts")}
          placeholder="e.g., 1000 - Cash at Bank, 1100 - Accounts Receivable, 2000 - Accounts Payable, 4000 - Sales Revenue, 5000 - Cost of Goods Sold, 6000 - Operating Expenses"
          rows={8}
          value={formState.chartOfAccounts}
        />
        <p className="text-muted-foreground text-xs">
          Paste your chart of accounts here for more accurate coding
          suggestions. Available in prompts as{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{"}
            {"{"}CHART_OF_ACCOUNTS{"}"}
            {"}"}
          </code>
        </p>
      </div>

      <CustomVariablesEditor
        disabled={data.personalisation.isLocked || isSaving}
        onChange={handleCustomVariablesChange}
        variables={formState.customVariables}
      />

      <div className="flex items-center justify-end gap-3">
        <Button
          disabled={isSaving}
          onClick={() => window.location.reload()}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Template Variables"}
        </Button>
      </div>
    </form>
  );
}
