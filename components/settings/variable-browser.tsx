"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TemplateVariable = {
  name: string;
  description: string;
  category: "standard" | "custom";
};

const STANDARD_VARIABLES: TemplateVariable[] = [
  {
    name: "FIRST_NAME",
    description: "Your first name from your profile",
    category: "standard",
  },
  {
    name: "LAST_NAME",
    description: "Your last name from your profile",
    category: "standard",
  },
  {
    name: "COMPANY_NAME",
    description: "Your company or business name",
    category: "standard",
  },
  {
    name: "INDUSTRY_CONTEXT",
    description: "Industry and business information",
    category: "standard",
  },
  {
    name: "CHART_OF_ACCOUNTS",
    description: "Your chart of accounts (manual or from Xero)",
    category: "standard",
  },
];

type VariableBrowserProps = {
  customVariables?: Record<string, string>;
  onInsert: (variableName: string) => void;
  size?: "sm" | "default";
};

export function VariableBrowser({
  customVariables = {},
  onInsert,
  size = "default",
}: VariableBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);

  const customVars: TemplateVariable[] = Object.keys(customVariables).map(
    (key) => ({
      name: key,
      description:
        customVariables[key].substring(0, 50) +
        (customVariables[key].length > 50 ? "..." : ""),
      category: "custom" as const,
    })
  );

  const allVariables = [...STANDARD_VARIABLES, ...customVars];

  const handleInsert = (variableName: string) => {
    onInsert(variableName);
    setIsOpen(false);
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gap-1" size={size} type="button" variant="outline">
          Insert Variable
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Standard Variables</DropdownMenuLabel>
        {STANDARD_VARIABLES.map((variable) => (
          <DropdownMenuItem
            className="flex cursor-pointer flex-col items-start py-2"
            key={variable.name}
            onClick={() => handleInsert(variable.name)}
          >
            <code className="font-mono text-sm">{`{{${variable.name}}}`}</code>
            <span className="text-muted-foreground text-xs">
              {variable.description}
            </span>
          </DropdownMenuItem>
        ))}

        {customVars.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Custom Variables</DropdownMenuLabel>
            {customVars.map((variable) => (
              <DropdownMenuItem
                className="flex cursor-pointer flex-col items-start py-2"
                key={variable.name}
                onClick={() => handleInsert(variable.name)}
              >
                <code className="font-mono text-sm">
                  {`{{${variable.name}}}`}
                </code>
                <span className="text-muted-foreground text-xs">
                  {variable.description}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {allVariables.length === STANDARD_VARIABLES.length && (
          <div className="px-2 py-4 text-center text-muted-foreground text-xs">
            No custom variables defined yet
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
