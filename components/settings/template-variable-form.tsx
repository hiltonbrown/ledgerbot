"use client";

import { AlertCircle, ExternalLink, HelpCircle, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const TIMEZONE_OPTIONS = [
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT/AEST)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACDT/ACST)" },
  { value: "Australia/Hobart", label: "Hobart (AEDT/AEST)" },
  { value: "Australia/Darwin", label: "Darwin (ACST)" },
  { value: "Australia/Canberra", label: "Canberra (AEDT/AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT/NZST)" },
  { value: "America/New_York", label: "New York (EDT/EST)" },
  { value: "America/Chicago", label: "Chicago (CDT/CST)" },
  { value: "America/Denver", label: "Denver (MDT/MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PDT/PST)" },
  { value: "America/Toronto", label: "Toronto (EDT/EST)" },
  { value: "America/Vancouver", label: "Vancouver (PDT/PST)" },
  { value: "Europe/London", label: "London (BST/GMT)" },
  { value: "Europe/Paris", label: "Paris (CEST/CET)" },
  { value: "Europe/Berlin", label: "Berlin (CEST/CET)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const STATE_PROVINCE_OPTIONS: Record<
  string,
  { value: string; label: string }[]
> = {
  us: [
    { value: "al", label: "Alabama" },
    { value: "ak", label: "Alaska" },
    { value: "az", label: "Arizona" },
    { value: "ar", label: "Arkansas" },
    { value: "ca", label: "California" },
    { value: "co", label: "Colorado" },
    { value: "ct", label: "Connecticut" },
    { value: "de", label: "Delaware" },
    { value: "fl", label: "Florida" },
    { value: "ga", label: "Georgia" },
    { value: "hi", label: "Hawaii" },
    { value: "ia", label: "Iowa" },
    { value: "id", label: "Idaho" },
    { value: "il", label: "Illinois" },
    { value: "in", label: "Indiana" },
    { value: "ks", label: "Kansas" },
    { value: "ky", label: "Kentucky" },
    { value: "la", label: "Louisiana" },
    { value: "ma", label: "Massachusetts" },
    { value: "md", label: "Maryland" },
    { value: "me", label: "Maine" },
    { value: "mi", label: "Michigan" },
    { value: "mn", label: "Minnesota" },
    { value: "mo", label: "Missouri" },
    { value: "ms", label: "Mississippi" },
    { value: "mt", label: "Montana" },
    { value: "nc", label: "North Carolina" },
    { value: "nd", label: "North Dakota" },
    { value: "ne", label: "Nebraska" },
    { value: "nh", label: "New Hampshire" },
    { value: "nj", label: "New Jersey" },
    { value: "nm", label: "New Mexico" },
    { value: "nv", label: "Nevada" },
    { value: "ny", label: "New York" },
    { value: "oh", label: "Ohio" },
    { value: "ok", label: "Oklahoma" },
    { value: "or", label: "Oregon" },
    { value: "pa", label: "Pennsylvania" },
    { value: "ri", label: "Rhode Island" },
    { value: "sc", label: "South Carolina" },
    { value: "sd", label: "South Dakota" },
    { value: "tn", label: "Tennessee" },
    { value: "tx", label: "Texas" },
    { value: "ut", label: "Utah" },
    { value: "va", label: "Virginia" },
    { value: "vt", label: "Vermont" },
    { value: "wa", label: "Washington" },
    { value: "wi", label: "Wisconsin" },
    { value: "wv", label: "West Virginia" },
    { value: "wy", label: "Wyoming" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  ca: [
    { value: "ab", label: "Alberta" },
    { value: "bc", label: "British Columbia" },
    { value: "mb", label: "Manitoba" },
    { value: "nb", label: "New Brunswick" },
    { value: "nl", label: "Newfoundland and Labrador" },
    { value: "ns", label: "Nova Scotia" },
    { value: "nt", label: "Northwest Territories" },
    { value: "nu", label: "Nunavut" },
    { value: "on", label: "Ontario" },
    { value: "pe", label: "Prince Edward Island" },
    { value: "qc", label: "Quebec" },
    { value: "sk", label: "Saskatchewan" },
    { value: "yt", label: "Yukon" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  gb: [
    { value: "eng", label: "England" },
    { value: "nir", label: "Northern Ireland" },
    { value: "sct", label: "Scotland" },
    { value: "wls", label: "Wales" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  au: [
    { value: "act", label: "Australian Capital Territory" },
    { value: "nsw", label: "New South Wales" },
    { value: "nt", label: "Northern Territory" },
    { value: "qld", label: "Queensland" },
    { value: "sa", label: "South Australia" },
    { value: "tas", label: "Tasmania" },
    { value: "vic", label: "Victoria" },
    { value: "wa", label: "Western Australia" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  za: [
    { value: "ec", label: "Eastern Cape" },
    { value: "fs", label: "Free State" },
    { value: "gp", label: "Gauteng" },
    { value: "kzn", label: "KwaZulu-Natal" },
    { value: "lp", label: "Limpopo" },
    { value: "mp", label: "Mpumalanga" },
    { value: "nc", label: "Northern Cape" },
    { value: "nw", label: "North West" },
    { value: "wc", label: "Western Cape" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
  nz: [
    { value: "auk", label: "Auckland" },
    { value: "bop", label: "Bay of Plenty" },
    { value: "can", label: "Canterbury" },
    { value: "gis", label: "Gisborne" },
    { value: "hkb", label: "Hawke's Bay" },
    { value: "mbh", label: "Marlborough" },
    { value: "mwt", label: "Manawatu-Whanganui" },
    { value: "nsn", label: "Nelson" },
    { value: "ntl", label: "Northland" },
    { value: "ota", label: "Otago" },
    { value: "stl", label: "Southland" },
    { value: "tki", label: "Taranaki" },
    { value: "tkm", label: "Tasman" },
    { value: "wko", label: "Waikato" },
    { value: "wgn", label: "Wellington" },
    { value: "wtc", label: "West Coast" },
  ].sort((a, b) => a.label.localeCompare(b.label)),
};

export function TemplateVariableForm({
  data,
  xeroConnection,
}: {
  data: UserSettings;
  xeroConnection?: XeroConnection;
}) {
  const [formState, setFormState] = useState({
    country: data.personalisation.country,
    state: data.personalisation.state,
    timezone: data.personalisation.timezone || "Australia/Sydney",
    companyName:
      xeroConnection?.tenantName || data.personalisation.companyName || "",
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

  const handleSelectChange =
    (field: "country" | "state" | "timezone") => (value: string) => {
      setFormState((state) => ({
        ...state,
        [field]: value,
        ...(field === "country" && { state: "" }),
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
      if (!textarea) {
        return;
      }

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
          isLocked: data.personalisation.isLocked,
          defaultModel: data.personalisation.defaultModel,
          defaultReasoning: data.personalisation.defaultReasoning,
          customSystemInstructions:
            data.personalisation.customSystemInstructions,
          customCodeInstructions: data.personalisation.customCodeInstructions,
          customSheetInstructions: data.personalisation.customSheetInstructions,
          suggestions: data.suggestions,
          // Location and template variables (Business Information)
          country: formState.country,
          state: formState.state,
          timezone: formState.timezone,
          // Only save manual company name if no Xero connection
          companyName: xeroConnection ? "" : formState.companyName,
          industryContext: formState.industryContext,
          // Only save manual chart if no Xero connection
          // Only save manual chart if no Xero connection
          chartOfAccounts: xeroConnection ? "" : formState.chartOfAccounts,
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
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Help section */}
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Business Information</strong> helps personalize AI
                responses with context about your location and operations.{" "}
                <strong>Template Variables</strong> are placeholders like{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  {"{{COMPANY_NAME}}"}
                </code>{" "}
                that get replaced with actual values in prompts.
              </AlertDescription>
            </Alert>

            {/* Country and State */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  disabled={data.personalisation.isLocked || isSaving}
                  onValueChange={handleSelectChange("country")}
                  value={formState.country}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="au">Australia</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                    <SelectItem value="gb">United Kingdom</SelectItem>
                    <SelectItem value="nz">New Zealand</SelectItem>
                    <SelectItem value="za">South Africa</SelectItem>
                    <SelectItem value="us">United States</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Your business location for tax and regulatory context
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Select
                  disabled={data.personalisation.isLocked || isSaving}
                  onValueChange={handleSelectChange("state")}
                  value={formState.state}
                >
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(STATE_PROVINCE_OPTIONS[formState.country] || []).map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  State or province for location-specific guidance
                </p>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                disabled={data.personalisation.isLocked || isSaving}
                onValueChange={handleSelectChange("timezone")}
                value={formState.timezone}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Your local timezone for date/time context in AI responses
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="companyName">Company Name</Label>
                {xeroConnection && (
                  <Badge className="gap-1" variant="secondary">
                    <ExternalLink className="h-3 w-3" />
                    From Xero
                  </Badge>
                )}
              </div>
              <Input
                disabled={
                  data.personalisation.isLocked || isSaving || !!xeroConnection
                }
                id="companyName"
                onChange={handleInputChange("companyName")}
                placeholder={
                  xeroConnection
                    ? "Company name is automatically synced from Xero"
                    : "e.g., Acme Pty Ltd"
                }
                value={formState.companyName}
              />
              <p className="text-muted-foreground text-xs">
                {xeroConnection ? (
                  "Company name is automatically populated from your active Xero organization. To use a manual entry, disconnect Xero or switch organizations."
                ) : (
                  <>
                    Your company or business name. Or{" "}
                    <Link
                      className="text-primary hover:underline"
                      href="/settings/integrations"
                    >
                      connect to Xero
                    </Link>{" "}
                    to sync automatically.
                  </>
                )}{" "}
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
                        Describe your business for context-aware AI responses.
                        You can insert variables using the button on the right.
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
                maxLength={200}
                onChange={handleInputChange("industryContext")}
                placeholder="e.g., Retail business selling office supplies with 3 locations across NSW. We have 15 staff members and turnover approximately $2M annually. Main customers are small businesses and schools."
                ref={industryContextRef}
                rows={6}
                value={formState.industryContext}
              />
              <div className="text-right text-muted-foreground text-xs">
                {formState.industryContext.length}/200 characters
              </div>
              <VariableValidationWarning
                undefinedVariables={
                  industryContextValidation.undefinedVariables
                }
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
                        Click to insert template variables at your cursor
                        position
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
                maxLength={1000}
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
                <div className="text-right text-muted-foreground text-xs">
                  {formState.chartOfAccounts.length}/1000 characters
                </div>
              )}
              {!xeroConnection && (
                <VariableValidationWarning
                  undefinedVariables={
                    chartOfAccountsValidation.undefinedVariables
                  }
                />
              )}
              <p className="text-muted-foreground text-xs">
                {xeroConnection ? (
                  "Your chart of accounts is automatically populated from your active Xero connection. To use a manual chart, disconnect Xero or switch to a different organization."
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
                    country: data.personalisation.country,
                    state: data.personalisation.state,
                    timezone:
                      data.personalisation.timezone || "Australia/Sydney",
                    companyName:
                      xeroConnection?.tenantName ||
                      data.personalisation.companyName ||
                      "",
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
                {isSaving ? "Saving..." : "Save Business Information"}
              </Button>
            </div>
          </form>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
