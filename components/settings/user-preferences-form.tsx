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
import { toast } from "../toast";

export function UserPreferencesForm({ data }: { data: UserSettings }) {
  const [formState, setFormState] = useState(data);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange =
    (field: keyof UserSettings) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((state) => ({
        ...state,
        [field]: event.target.value,
      }));
    };

  const handleCheckboxChange =
    (field: keyof UserSettings["notifications"]) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((state) => ({
        ...state,
        notifications: {
          ...state.notifications,
          [field]: event.target.checked,
        },
      }));
    };

  const handleSelectChange =
    (field: "language" | "timezone") => (value: string) => {
      setFormState((state) => ({
        ...state,
        [field]: value,
      }));
    };

  const handlePersonalisationChange =
    (field: keyof UserSettings["personalisation"]) =>
    (value: string | boolean) => {
      setFormState((state) => ({
        ...state,
        personalisation: {
          ...state.personalisation,
          [field]: value,
        },
      }));
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
          // firstName and lastName are managed by Clerk, not sent in update
          country: formState.personalisation.country,
          state: formState.personalisation.state,
          isLocked: formState.personalisation.isLocked,
          defaultModel: formState.personalisation.defaultModel,
          defaultReasoning: formState.personalisation.defaultReasoning,
          suggestions: formState.suggestions,
          // New personalisation fields
          companyName: formState.personalisation.companyName,
          industryContext: formState.personalisation.industryContext,
          toneAndGrammar: formState.personalisation.toneAndGrammar,
          customSystemInstructions:
            formState.personalisation.customSystemInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        type: "success",
        description: "Your preferences have been saved.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        type: "error",
        description: "Failed to save preferences. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            className="bg-muted"
            disabled
            id="firstName"
            placeholder="Jane"
            value={formState.personalisation.firstName}
          />
          <p className="text-muted-foreground text-xs">
            Managed by Clerk authentication
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            className="bg-muted"
            disabled
            id="lastName"
            placeholder="Doe"
            value={formState.personalisation.lastName}
          />
          <p className="text-muted-foreground text-xs">
            Managed by Clerk authentication
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            className="bg-muted"
            disabled
            id="email"
            placeholder="you@example.com"
            type="email"
            value={formState.email}
          />
          <p className="text-muted-foreground text-xs">
            Managed by Clerk authentication
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Role</Label>
          <Input
            id="jobTitle"
            onChange={handleInputChange("jobTitle")}
            placeholder="Product Manager"
            value={formState.jobTitle}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            onValueChange={handleSelectChange("language")}
            value={formState.language}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            onValueChange={handleSelectChange("timezone")}
            value={formState.timezone}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Los_Angeles">
                Pacific Time (PT)
              </SelectItem>
              <SelectItem value="America/New_York">
                Eastern Time (ET)
              </SelectItem>
              <SelectItem value="Europe/London">
                Greenwich Mean Time (GMT)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-lg">Organisation</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              onChange={(e) =>
                handlePersonalisationChange("companyName")(e.target.value)
              }
              placeholder="Acme Corp"
              value={formState.personalisation.companyName || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industryContext">Industry Context</Label>
            <Input
              id="industryContext"
              onChange={(e) =>
                handlePersonalisationChange("industryContext")(e.target.value)
              }
              placeholder="e.g. Retail, Construction, Tech"
              value={formState.personalisation.industryContext || ""}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-lg">AI Behavior</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Select
              onValueChange={handlePersonalisationChange("defaultModel")}
              value={formState.personalisation.defaultModel}
            >
              <SelectTrigger id="defaultModel">
                <SelectValue placeholder="Select default model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic-claude-sonnet-4-5">
                  Claude Sonnet 4.5
                </SelectItem>
                <SelectItem value="anthropic-claude-haiku-4-5">
                  Claude Haiku 4.5
                </SelectItem>
                <SelectItem value="anthropic-claude-sonnet-3-5">
                  Claude Sonnet 3.5
                </SelectItem>
                <SelectItem value="openai-gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="openai-gpt-4o-mini">GPT-4o Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="toneAndGrammar">Tone & Style</Label>
            <Select
              onValueChange={handlePersonalisationChange("toneAndGrammar")}
              value={formState.personalisation.toneAndGrammar || "professional"}
            >
              <SelectTrigger id="toneAndGrammar">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="concise">Concise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="defaultReasoning">
              Enable Reasoning by Default
            </Label>
            <p className="text-muted-foreground text-xs">
              Automatically enable reasoning mode for supported models
            </p>
          </div>
          <Switch
            checked={formState.personalisation.defaultReasoning}
            id="defaultReasoning"
            onCheckedChange={(checked) =>
              handlePersonalisationChange("defaultReasoning")(checked)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customSystemInstructions">Custom Instructions</Label>
          <Textarea
            id="customSystemInstructions"
            maxLength={400}
            onChange={(e) =>
              handlePersonalisationChange("customSystemInstructions")(
                e.target.value
              )
            }
            placeholder="e.g. Always explain accounting terms, prefer bullet points..."
            value={formState.personalisation.customSystemInstructions || ""}
          />
          <p className="text-muted-foreground text-xs">
            Specific instructions for how Ledgerbot should respond (max 400
            chars).
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="about">About</Label>
        <Textarea
          id="about"
          maxLength={240}
          onChange={handleInputChange("about")}
          placeholder="Tell teammates how you collaborate."
          value={formState.about}
        />
        <p className="text-muted-foreground text-xs">
          This description appears in mentions and workspace invites.
        </p>
      </div>
      <fieldset className="space-y-4">
        <legend className="font-medium text-foreground text-sm">
          Notifications
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-start gap-3 rounded-md border p-3">
            <input
              checked={formState.notifications.productUpdates}
              className="mt-1 h-4 w-4 rounded border border-input"
              onChange={handleCheckboxChange("productUpdates")}
              type="checkbox"
            />
            <div>
              <span className="font-medium text-foreground text-sm">
                Product updates
              </span>
              <p className="text-muted-foreground text-xs">
                Highlights on new capabilities and templates.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border p-3">
            <input
              checked={formState.notifications.securityAlerts}
              className="mt-1 h-4 w-4 rounded border border-input"
              onChange={handleCheckboxChange("securityAlerts")}
              type="checkbox"
            />
            <div>
              <span className="font-medium text-foreground text-sm">
                Security alerts
              </span>
              <p className="text-muted-foreground text-xs">
                Receive login alerts and policy changes immediately.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border p-3">
            <input
              checked={formState.notifications.weeklySummary}
              className="mt-1 h-4 w-4 rounded border border-input"
              onChange={handleCheckboxChange("weeklySummary")}
              type="checkbox"
            />
            <div>
              <span className="font-medium text-foreground text-sm">
                Weekly summary
              </span>
              <p className="text-muted-foreground text-xs">
                Friday recap of usage, artifacts, and automations.
              </p>
            </div>
          </label>
        </div>
      </fieldset>
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
