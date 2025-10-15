"use client";

import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Button } from "@/components/ui/button";
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
  const [promptState, setPromptState] = useState(data.prompts);
  const [suggestionsState, setSuggestionsState] = useState(data.suggestions);
  const [isSaving, setIsSaving] = useState(false);

  const handlePromptChange =
    (field: keyof UserSettings["prompts"]) =>
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPromptState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

  const handlePersonalInputChange =
    (field: "firstName" | "lastName") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPersonalState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

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
          firstName: personalState.firstName,
          lastName: personalState.lastName,
          country: personalState.country,
          state: personalState.state,
          isLocked: personalState.isLocked,
          defaultModel: personalState.defaultModel,
          defaultReasoning: personalState.defaultReasoning,
          systemPrompt: promptState.systemPrompt,
          codePrompt: promptState.codePrompt,
          sheetPrompt: promptState.sheetPrompt,
          suggestions: suggestionsState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        type: "success",
        description: "Your prompt settings have been saved.",
      });
    } catch (error) {
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
            <Label htmlFor="firstName">First name</Label>
            <Input
              disabled={personalState.isLocked}
              id="firstName"
              onChange={handlePersonalInputChange("firstName")}
              placeholder="Alex"
              value={personalState.firstName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              disabled={personalState.isLocked}
              id="lastName"
              onChange={handlePersonalInputChange("lastName")}
              placeholder="Rivers"
              value={personalState.lastName}
            />
          </div>
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
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          disabled={personalState.isLocked}
          id="systemPrompt"
          onChange={handlePromptChange("systemPrompt")}
          placeholder="Enter your custom system prompt..."
          rows={4}
          value={promptState.systemPrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt defines the AI assistant's general behavior and
          personality.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="codePrompt">Code Generation Prompt</Label>
        <Textarea
          disabled={personalState.isLocked}
          id="codePrompt"
          onChange={handlePromptChange("codePrompt")}
          placeholder="Enter your custom code generation prompt..."
          rows={8}
          value={promptState.codePrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt is used when generating code snippets and programming
          assistance.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sheetPrompt">Spreadsheet Prompt</Label>
        <Textarea
          disabled={personalState.isLocked}
          id="sheetPrompt"
          onChange={handlePromptChange("sheetPrompt")}
          placeholder="Enter your custom spreadsheet prompt..."
          rows={4}
          value={promptState.sheetPrompt}
        />
        <p className="text-muted-foreground text-xs">
          This prompt is used when creating spreadsheets and data analysis.
        </p>
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
        <Button disabled={isSaving || personalState.isLocked} type="submit">
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
