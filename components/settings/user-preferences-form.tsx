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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    // TODO: Replace with real async save operation, e.g. API call

    toast({
      type: "success",
      description: "Your preferences have been saved.",
    });

    setIsSaving(false);
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            onChange={handleInputChange("name")}
            placeholder="Jane Doe"
            value={formState.name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            onChange={handleInputChange("email")}
            placeholder="you@example.com"
            type="email"
            value={formState.email}
          />
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
