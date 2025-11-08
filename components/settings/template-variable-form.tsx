"use client";

import { AlertCircle, ExternalLink, HelpCircle, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getStandardVariables,
  validateVariables,
} from "@/lib/ai/template-validation";
import { toast } from "../toast";
import { CustomVariablesEditor } from "./custom-variables-editor";
import { TemplatePreview } from "./template-preview";
import { VariableBrowser } from "./variable-browser";
import { VariableValidationWarning } from "./variable-validation-warning";

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

  // Get all defined variables (standard + custom)
  const definedVariables = useMemo(() => {
    const standard = getStandardVariables();
    const custom = Object.keys(formState.customVariables);
    return [...standard, ...custom];
  }, [formState.customVariables]);

  // Validate Industry Context field
  const industryContextValidation = useMemo(() => {
    return validateVariables(formState.industryContext, definedVariables);
  }, [formState.industryContext, definedVariables]);

  // Validate Chart of Accounts field
  const chartOfAccountsValidation = useMemo(() => {
    return validateVariables(formState.chartOfAccounts, definedVariables);
  }, [formState.chartOfAccounts, definedVariables]);

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
    <TooltipProvider>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Help section */}
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Template Variables</strong> let you personalize AI responses
            with your business information. Variables are placeholders like{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              {"{{COMPANY_NAME}}"}
            </code>{" "}
            that get replaced with actual values.
            <div className="mt-2">
              <strong>Available features:</strong>
            </div>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Use the <strong>Insert Variable</strong> button to add variables
                to text fields
              </li>
              <li>
                <strong>Validation</strong> shows warnings for undefined
                variables
              </li>
              <li>
                <strong>Preview</strong> shows how variables will appear in
                prompts
              </li>
              <li>
                Create <strong>custom variables</strong> for frequently used
                information
              </li>
            </ul>
          </AlertDescription>
        </Alert>

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
            <div className="flex items-center gap-2">
              <Label htmlFor="industryContext">
                Industry / Business Information
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Describe your business for context-aware AI responses. You
                    can insert variables using the button on the right.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <VariableBrowser
                    customVariables={formState.customVariables}
                    onInsert={handleInsertVariable(
                      "industryContext",
                      industryContextRef
                    )}
                    size="sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Click to insert template variables at your cursor position
                </p>
              </TooltipContent>
            </Tooltip>
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
          <VariableValidationWarning
            undefinedVariables={industryContextValidation.undefinedVariables}
          />
          <p className="text-muted-foreground text-xs">
            Describe your business type, industry, size, and any specific
            context that helps the AI understand your needs. Available in
            prompts as{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              {"{"}
              {"{"}INDUSTRY_CONTEXT{"}"}
              {"}"}
            </code>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="chartOfAccounts">Chart of Accounts</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {xeroConnection
                      ? "Your chart of accounts is automatically synced from Xero and cannot be edited manually."
                      : "Paste your chart of accounts for accurate coding suggestions, or connect to Xero for automatic sync."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {xeroConnection ? (
              <Badge className="gap-1" variant="secondary">
                <ExternalLink className="h-3 w-3" />
                Synced from Xero
              </Badge>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <VariableBrowser
                      customVariables={formState.customVariables}
                      onInsert={handleInsertVariable(
                        "chartOfAccounts",
                        chartOfAccountsRef
                      )}
                      size="sm"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Click to insert template variables at your cursor position
                  </p>
                </TooltipContent>
              </Tooltip>
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
          {!xeroConnection && (
            <VariableValidationWarning
              undefinedVariables={chartOfAccountsValidation.undefinedVariables}
            />
          )}
          <p className="text-muted-foreground text-xs">
            {xeroConnection ? (
              <>
                Your chart of accounts is automatically populated from your
                active Xero connection. To use a manual chart, disconnect Xero
                or switch to a different organization.
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

        <TemplatePreview
          chartOfAccounts={formState.chartOfAccounts}
          companyName={formState.companyName}
          customVariables={formState.customVariables}
          firstName={data.personalisation.firstName}
          industryContext={formState.industryContext}
          lastName={data.personalisation.lastName}
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
    </TooltipProvider>
  );
}
