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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../toast";

export function PromptSettingsForm({ data }: { data: UserSettings }) {
  const [personalState, setPersonalState] = useState(data.personalisation);
  const [promptState, setPromptState] = useState(data.prompts);
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
    (field: "country" | "state") =>
    (value: string) => {
      setPersonalState((state) => ({
        ...state,
        [field]: value,
      }));
    };

  const handleLockChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isLocked = event.target.checked;
    setPersonalState((state) => ({
      ...state,
      isLocked,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    // TODO: Replace with real async save operation, e.g. API call

    toast({
      type: "success",
      description: "Your prompt settings have been saved.",
    });

    setIsSaving(false);
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
          <label className="flex items-center gap-2 text-sm font-medium">
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
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="gb">United Kingdom</SelectItem>
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
                <SelectItem value="ca">California</SelectItem>
                <SelectItem value="ny">New York</SelectItem>
                <SelectItem value="on">Ontario</SelectItem>
              </SelectContent>
            </Select>
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
