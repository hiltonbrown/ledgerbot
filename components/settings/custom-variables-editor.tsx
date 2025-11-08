"use client";

import { AlertCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isValidVariableName,
  sanitizeVariableName,
} from "@/lib/ai/template-validation";

type CustomVariablesEditorProps = {
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
  disabled?: boolean;
};

export function CustomVariablesEditor({
  variables,
  onChange,
  disabled = false,
}: CustomVariablesEditorProps) {
  const [newVarName, setNewVarName] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleAddVariable = () => {
    // Clear previous validation errors
    setValidationError("");

    // Sanitize and validate variable name
    const cleanVarName = sanitizeVariableName(newVarName.trim());

    if (!cleanVarName) {
      setValidationError("Variable name is required");
      return;
    }

    if (!isValidVariableName(cleanVarName)) {
      setValidationError(
        "Variable name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores"
      );
      return;
    }

    if (!newVarValue.trim()) {
      setValidationError("Variable value is required");
      return;
    }

    // Check if variable already exists
    if (variables[cleanVarName]) {
      setValidationError(`Variable "${cleanVarName}" already exists`);
      return;
    }

    onChange({
      ...variables,
      [cleanVarName]: newVarValue.trim(),
    });

    setNewVarName("");
    setNewVarValue("");
    setValidationError("");
  };

  const handleRemoveVariable = (varName: string) => {
    const newVariables = { ...variables };
    delete newVariables[varName];
    onChange(newVariables);
  };

  const handleUpdateVariable = (varName: string, value: string) => {
    onChange({
      ...variables,
      [varName]: value,
    });
  };

  const variableEntries = Object.entries(variables);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custom Variables</CardTitle>
        <p className="text-muted-foreground text-sm">
          Create your own template variables to use in Industry Context and
          Chart of Accounts fields.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing variables */}
        {variableEntries.length > 0 && (
          <div className="space-y-3">
            {variableEntries.map(([varName, varValue]) => (
              <div className="rounded-lg border bg-muted/50 p-3" key={varName}>
                <div className="mb-2 flex items-center justify-between">
                  <code className="font-mono font-semibold text-sm">
                    {"{{"}
                    {varName}
                    {"}}"}
                  </code>
                  <Button
                    disabled={disabled}
                    onClick={() => handleRemoveVariable(varName)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <X className="mr-1 size-3" />
                    Remove
                  </Button>
                </div>
                <Textarea
                  className="mt-2"
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateVariable(varName, e.target.value)
                  }
                  placeholder="Variable value"
                  rows={2}
                  value={varValue}
                />
                <p className="mt-1 text-muted-foreground text-xs">
                  Use the "Insert Variable" button to add this variable to your
                  templates
                </p>
              </div>
            ))}
          </div>
        )}

        {variableEntries.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>No custom variables defined yet.</strong>
              <br />
              Custom variables let you create reusable placeholders for
              information you frequently reference. Examples:
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <code className="rounded bg-muted px-1 py-0.5">
                    {"{{BUSINESS_ADDRESS}}"}
                  </code>{" "}
                  - Your business address for quick reference
                </li>
                <li>
                  <code className="rounded bg-muted px-1 py-0.5">
                    {"{{REPORTING_PERIOD}}"}
                  </code>{" "}
                  - Current financial reporting period
                </li>
                <li>
                  <code className="rounded bg-muted px-1 py-0.5">
                    {"{{KEY_CONTACTS}}"}
                  </code>{" "}
                  - Important client or supplier contacts
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Add new variable */}
        <div className="space-y-3">
          <Label className="font-semibold text-sm">Add New Variable</Label>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="new-var-name">
              Variable Name
            </Label>
            <Input
              disabled={disabled}
              id="new-var-name"
              onChange={(e) => {
                setNewVarName(e.target.value);
                setValidationError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="e.g., BUSINESS_ADDRESS"
              value={newVarName}
            />
            <p className="text-muted-foreground text-xs">
              Must be uppercase letters, numbers, and underscores only (e.g.,
              MY_VARIABLE)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="new-var-value">
              Variable Value
            </Label>
            <Textarea
              disabled={disabled}
              id="new-var-value"
              onChange={(e) => {
                setNewVarValue(e.target.value);
                setValidationError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="The actual text that will replace the variable"
              rows={3}
              value={newVarValue}
            />
            <p className="text-muted-foreground text-xs">
              Press Ctrl+Enter to add the variable
            </p>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {validationError}
              </AlertDescription>
            </Alert>
          )}

          <Button
            disabled={disabled || !newVarName.trim() || !newVarValue.trim()}
            onClick={handleAddVariable}
            type="button"
            variant="outline"
          >
            <Plus className="mr-2 size-4" />
            Add Variable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
