"use client";

import { Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "../toast";

export function LockSettingsBanner({ data }: { data: UserSettings }) {
  const [isLocked, setIsLocked] = useState(data.personalisation.isLocked);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleLockChange = async (checked: boolean) => {
    setIsSaving(true);
    setIsLocked(checked);

    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Include all existing settings
          country: data.personalisation.country,
          state: data.personalisation.state,
          defaultModel: data.personalisation.defaultModel,
          defaultReasoning: data.personalisation.defaultReasoning,
          companyName: data.personalisation.companyName,
          industryContext: data.personalisation.industryContext,
          chartOfAccounts: data.personalisation.chartOfAccounts,
          customVariables: data.personalisation.customVariables,
          customSystemInstructions:
            data.personalisation.customSystemInstructions,
          customCodeInstructions: data.personalisation.customCodeInstructions,
          customSheetInstructions: data.personalisation.customSheetInstructions,
          suggestions: data.suggestions,
          // Lock state
          isLocked: checked,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update lock settings");
      }

      toast({
        type: "success",
        description: checked
          ? "Settings locked successfully. Your personalisation settings are now protected."
          : "Settings unlocked successfully. You can now edit your personalisation settings.",
      });

      router.refresh();
    } catch (error) {
      console.error("Error updating lock settings:", error);
      // Revert the state on error
      setIsLocked(!checked);
      toast({
        type: "error",
        description: "Failed to update lock settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Alert
      className={
        isLocked
          ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20"
          : ""
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLocked ? (
            <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          ) : (
            <LockOpen className="h-5 w-5" />
          )}
          <AlertDescription className="mb-0">
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {isLocked ? "Settings Locked" : "Lock Personalisation Settings"}
              </p>
              <p className="text-muted-foreground text-xs">
                {isLocked
                  ? "Your personalisation settings are locked to prevent accidental edits. Toggle to unlock."
                  : "Prevent accidental edits to your business information, template variables, and custom instructions."}
              </p>
            </div>
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isLocked ? "Locked" : "Unlocked"}
          </span>
          <Switch
            checked={isLocked}
            disabled={isSaving}
            onCheckedChange={handleLockChange}
          />
        </div>
      </div>
    </Alert>
  );
}
