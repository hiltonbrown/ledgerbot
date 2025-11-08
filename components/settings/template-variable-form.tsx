"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../toast";
import { CustomVariablesEditor } from "./custom-variables-editor";
import { VariableBrowser } from "./variable-browser";

type XeroConnection = {
  id: string;
  tenantName: string | null;
  accountCount?: number;
  chartOfAccountsSyncedAt: Date | null;
};

export function TemplateVariableForm({
  data,
  xeroConnection,
}: {
  data: UserSettings;
  xeroConnection?: XeroConnection;
}) {
  const [formState, setFormState] = useState({
    companyName: data.personalisation.companyName || "",
    industryContext: data.personalisation.industryContext || "",
    chartOfAccounts: data.personalisation.chartOfAccounts || "",
    customVariables: data.personalisation.customVariables || {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const industryContextRef = useRef<HTMLTextAreaElement>(null);
  const chartOfAccountsRef = useRef<HTMLTextAreaElement>(null);

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

  const handleInsertVariable =
    (
      field: "industryContext" | "chartOfAccounts",
      ref: React.RefObject<HTMLTextAreaElement>
    ) =>
    (variableName: string) => {
      const textarea = ref.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = formState[field];
      const variablePlaceholder = `{{${variableName}}}`;

      // Insert at cursor position or replace selection
      const newValue =
        currentValue.substring(0, start) +
        variablePlaceholder +
        currentValue.substring(end);

      setFormState((state) => ({
        ...state,
        [field]: newValue,
      }));

      // Move cursor after inserted variable
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + variablePlaceholder.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
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
        description: "Template variables saved successfully.",
      });

      // Refresh the router to get updated data without full page reload
      router.refresh();
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
        <div className="flex items-center justify-between">
          <Label htmlFor="industryContext">
            Industry / Business Information
          </Label>
          <VariableBrowser
            customVariables={formState.customVariables}
            onInsert={handleInsertVariable(
              "industryContext",
              industryContextRef
            )}
            size="sm"
          />
        </div>
        <Textarea
          disabled={data.personalisation.isLocked || isSaving}
          id="industryContext"
          onChange={handleInputChange("industryContext")}
          placeholder="e.g., Retail business selling office supplies with 3 locations across NSW. We have 15 staff members and turnover approximately $2M annually. Main customers are small businesses and schools."
          ref={industryContextRef}
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
        <div className="flex items-center justify-between">
          <Label htmlFor="chartOfAccounts">Chart of Accounts</Label>
          {xeroConnection ? (
            <Badge className="gap-1" variant="secondary">
              <ExternalLink className="h-3 w-3" />
              Synced from Xero
            </Badge>
          ) : (
            <VariableBrowser
              customVariables={formState.customVariables}
              onInsert={handleInsertVariable(
                "chartOfAccounts",
                chartOfAccountsRef
              )}
              size="sm"
            />
          )}
        </div>

        {xeroConnection && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{xeroConnection.tenantName}</strong> -{" "}
              {xeroConnection.accountCount || 0} accounts
              {xeroConnection.chartOfAccountsSyncedAt && (
                <>
                  {" "}
                  • Last synced{" "}
                  {new Date(
                    xeroConnection.chartOfAccountsSyncedAt
                  ).toLocaleDateString()}
                </>
              )}
              {" • "}
              <Link
                className="text-primary hover:underline"
                href="/settings/chartofaccounts"
              >
                View/Manage Chart
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <Textarea
          disabled={
            data.personalisation.isLocked || isSaving || !!xeroConnection
          }
          id="chartOfAccounts"
          onChange={handleInputChange("chartOfAccounts")}
          placeholder={
            xeroConnection
              ? "Chart of accounts is automatically synced from Xero. Disable Xero integration to edit manually."
              : "e.g., 1000 - Cash at Bank, 1100 - Accounts Receivable, 2000 - Accounts Payable, 4000 - Sales Revenue, 5000 - Cost of Goods Sold, 6000 - Operating Expenses"
          }
          ref={chartOfAccountsRef}
          rows={8}
          value={formState.chartOfAccounts}
        />
        <p className="text-muted-foreground text-xs">
          {xeroConnection ? (
            <>
              Your chart of accounts is automatically populated from your active
              Xero connection. To use a manual chart, disconnect Xero or switch
              to a different organization.
            </>
          ) : (
            <>
              Paste your chart of accounts here for more accurate coding
              suggestions. Or{" "}
              <Link
                className="text-primary hover:underline"
                href="/settings/integrations"
              >
                connect to Xero
              </Link>{" "}
              for automatic sync.
            </>
          )}{" "}
          Available in prompts as{" "}
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
          onClick={() => {
            // Reset form to original data
            setFormState({
              companyName: data.personalisation.companyName || "",
              industryContext: data.personalisation.industryContext || "",
              chartOfAccounts: data.personalisation.chartOfAccounts || "",
              customVariables: data.personalisation.customVariables || {},
            });
          }}
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
