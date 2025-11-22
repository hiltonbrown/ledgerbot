"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { chatModels } from "@/lib/ai/models";
import { toast } from "../toast";

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
    { value: "fs", label: "Free State" },
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

export function PromptSettingsForm({ data }: { data: UserSettings }) {
  const [personalState, setPersonalState] = useState(data.personalisation);
  const [customInstructionsState, setCustomInstructionsState] = useState({
    systemInstructions: data.personalisation.customSystemInstructions || "",
    codeInstructions: data.personalisation.customCodeInstructions || "",
    sheetInstructions: data.personalisation.customSheetInstructions || "",
  });
  const [suggestionsState, setSuggestionsState] = useState(data.suggestions);
  const [isSaving, setIsSaving] = useState(false);

  const handleCustomInstructionsChange =
    (field: "systemInstructions" | "codeInstructions" | "sheetInstructions") =>
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCustomInstructionsState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

  // firstName and lastName removed - managed by Clerk

  const handlePersonalSelectChange =
    (field: "country" | "state" | "defaultModel") => (value: string) => {
      setPersonalState((state) => ({
        ...state,
        [field]: value,
      }));
    };

  const handleReasoningChange = (checked: boolean) => {
    setPersonalState((state) => ({
      ...state,
      defaultReasoning: checked,
    }));
  };

  const handleLockChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isLocked = event.target.checked;
    setPersonalState((state) => ({
      ...state,
      isLocked,
    }));
  };

  const handleSuggestionChange =
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setSuggestionsState((state) =>
        state.map((suggestion, i) =>
          i === index ? { ...suggestion, text: event.target.value } : suggestion
        )
      );
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
          // firstName and lastName removed - managed by Clerk
          country: personalState.country,
          state: personalState.state,
          isLocked: personalState.isLocked,
          defaultModel: personalState.defaultModel,
          defaultReasoning: personalState.defaultReasoning,
          customSystemInstructions: customInstructionsState.systemInstructions,
          customCodeInstructions: customInstructionsState.codeInstructions,
          customSheetInstructions: customInstructionsState.sheetInstructions,
          suggestions: suggestionsState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        type: "success",
        description: "Your personalisation settings have been saved.",
      });
    } catch (_error) {
      toast({
        type: "error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Lock personalisation</h3>
            <p className="text-muted-foreground text-xs">
              Prevent accidental edits to your personalisation details and
              prompt templates.
            </p>
          </div>
          <label className="flex items-center gap-2 font-medium text-sm">
            <input
              checked={personalState.isLocked}
              className="h-4 w-4 rounded border border-input"
              onChange={handleLockChange}
              type="checkbox"
            />
            Lock settings for this page
          </label>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              disabled={personalState.isLocked}
              onValueChange={handlePersonalSelectChange("country")}
              value={personalState.country}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Select
              disabled={personalState.isLocked}
              onValueChange={handlePersonalSelectChange("state")}
              value={personalState.state}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state or province" />
              </SelectTrigger>
              <SelectContent>
                {(STATE_PROVINCE_OPTIONS[personalState.country] || []).map(
                  (option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="defaultModel">Default Chat Model</Label>
              <Select
                disabled={personalState.isLocked}
                onValueChange={handlePersonalSelectChange("defaultModel")}
                value={personalState.defaultModel}
              >
                <SelectTrigger id="defaultModel">
                  <SelectValue placeholder="Select default model" />
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
                  checked={personalState.defaultReasoning}
                  disabled={personalState.isLocked}
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
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-base">Custom Instructions</h3>
          <p className="text-muted-foreground text-sm">
            Add your own instructions to customize how the AI responds. These
            will be combined with LedgerBot's base prompts.
          </p>
        </div>

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
              accounting capabilities, GST/BAS compliance knowledge, Australian
              terminology, and best practices for bookkeeping and tax
              compliance.
            </CollapsibleContent>
          </Collapsible>
          <Textarea
            disabled={personalState.isLocked}
            id="customSystemInstructions"
            onChange={handleCustomInstructionsChange("systemInstructions")}
            placeholder="Add your custom instructions here (optional)..."
            rows={4}
            value={customInstructionsState.systemInstructions}
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
              The base code prompt defines LedgerBot as a Python code generator
              that creates self-contained, executable code snippets. It includes
              guidelines for clean code, proper error handling, and meaningful
              outputs without external dependencies.
            </CollapsibleContent>
          </Collapsible>
          <Textarea
            disabled={personalState.isLocked}
            id="customCodeInstructions"
            onChange={handleCustomInstructionsChange("codeInstructions")}
            placeholder="Add your custom code instructions here (optional)..."
            rows={4}
            value={customInstructionsState.codeInstructions}
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
            disabled={personalState.isLocked}
            id="customSheetInstructions"
            onChange={handleCustomInstructionsChange("sheetInstructions")}
            placeholder="Add your custom spreadsheet instructions here (optional)..."
            rows={4}
            value={customInstructionsState.sheetInstructions}
          />
          <p className="text-muted-foreground text-xs">
            Add specific spreadsheet formatting or data preferences. These will
            be combined with the base spreadsheet prompt.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-base">Suggested Prompts</h3>
          <p className="text-muted-foreground text-sm">
            Customize the 4 suggested prompts shown on the main chat page.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {suggestionsState.map((suggestion, index) => (
            <div className="space-y-2" key={suggestion.id}>
              <Label htmlFor={`suggestion-${index}`}>
                Suggestion {index + 1}
              </Label>
              <Input
                disabled={personalState.isLocked}
                id={`suggestion-${index}`}
                onChange={handleSuggestionChange(index)}
                placeholder={`Enter suggestion ${index + 1}...`}
                value={suggestion.text}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
