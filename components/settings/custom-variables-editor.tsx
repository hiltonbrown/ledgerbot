"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const handleAddVariable = () => {
    // Validate variable name (uppercase letters, numbers, and underscores only)
    const cleanVarName = newVarName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");

    if (!cleanVarName || !newVarValue.trim()) {
      return;
    }

    // Check if variable already exists
    if (variables[cleanVarName]) {
      return;
    }

    onChange({
      ...variables,
      [cleanVarName]: newVarValue.trim(),
    });

    setNewVarName("");
    setNewVarValue("");
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Custom Variables</Label>
        <p className="text-muted-foreground text-xs">
          Create your own template variables to use in system prompts. Variable
          names must be uppercase (e.g., MY_VARIABLE).
        </p>
      </div>

      {/* Existing variables */}
      {variableEntries.length > 0 && (
        <div className="space-y-2">
          {variableEntries.map(([varName, varValue]) => (
            <div className="flex gap-2" key={varName}>
              <div className="flex-1">
                <Input
                  disabled
                  placeholder="VARIABLE_NAME"
                  readOnly
                  value={varName}
                />
                <p className="mt-1 text-muted-foreground text-xs">
                  Use as{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    {"{"}
                    {"{"}
                    {varName}
                    {"}"}
                    {"}"}
                  </code>
                </p>
              </div>
              <div className="flex-1">
                <Input
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateVariable(varName, e.target.value)
                  }
                  placeholder="Variable value"
                  value={varValue}
                />
              </div>
              <Button
                disabled={disabled}
                onClick={() => handleRemoveVariable(varName)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new variable */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">
          Add New Variable
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              disabled={disabled}
              onChange={(e) => setNewVarName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="VARIABLE_NAME"
              value={newVarName}
            />
          </div>
          <div className="flex-1">
            <Input
              disabled={disabled}
              onChange={(e) => setNewVarValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
              placeholder="Variable value"
              value={newVarValue}
            />
          </div>
          <Button
            disabled={disabled || !newVarName.trim() || !newVarValue.trim()}
            onClick={handleAddVariable}
            size="icon"
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
