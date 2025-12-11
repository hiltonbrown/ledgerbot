"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TemplatePreviewProps = {
  companyName: string;
  industryContext: string;
  chartOfAccounts: string;
  customVariables: Record<string, string>;
  firstName?: string;
  lastName?: string;
};

/**
 * Substitute template variables in text
 */
function substituteVariables(
  text: string,
  values: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, value || `[${key} not set]`);
  }
  return result;
}

/**
 * Extract used variables from text
 */
function extractUsedVariables(text: string): string[] {
  const regex = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: Regex matching requires assignment in loop condition
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

export function TemplatePreview({
  companyName,
  industryContext,
  chartOfAccounts,
  customVariables,
  firstName = "",
  lastName = "",
  systemPromptTemplate,
}: TemplatePreviewProps & { systemPromptTemplate: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build substitution values
  const substitutionValues: Record<string, string> = {
    COMPANY_NAME: companyName,
    FIRST_NAME: firstName,
    LAST_NAME: lastName,
    INDUSTRY_CONTEXT: industryContext,
    CHART_OF_ACCOUNTS: chartOfAccounts,
    CUSTOM_SYSTEM_INSTRUCTIONS: "",
    CUSTOM_CODE_INSTRUCTIONS: "",
    CUSTOM_SHEET_INSTRUCTIONS: "",
    ...customVariables,
  };

  // Extract which variables are actually used in the prompt
  const usedVariables = extractUsedVariables(systemPromptTemplate);

  // Substitute variables in preview text
  const previewText = substituteVariables(
    systemPromptTemplate,
    substitutionValues
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Template Variable Preview</CardTitle>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="mr-1 h-4 w-4" />
                Expand Preview
              </>
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          See how your variables will appear in the system prompt
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold text-xs">Variables in Use:</h4>
            <div className="flex flex-wrap gap-2">
              {usedVariables.map((varName) => {
                const hasValue = substitutionValues[varName]?.trim();
                return (
                  <span
                    className={
                      hasValue
                        ? "rounded-md bg-primary/10 px-2 py-1 font-mono text-primary text-xs"
                        : "rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs"
                    }
                    key={varName}
                  >
                    {varName}
                    {hasValue ? " ✓" : " ⚠"}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-xs">
              Substituted Prompt Preview:
            </h4>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {previewText}
              </pre>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            This preview shows a simplified version of how your template
            variables will be substituted in the system prompt. The full prompt
            includes additional instructions and capabilities.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
