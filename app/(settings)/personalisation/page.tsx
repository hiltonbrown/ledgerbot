import { Sparkles } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { SuggestionsForm } from "@/components/settings/suggestions-form";
import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { getUserSettings } from "../api/user/data";

export const dynamic = "force-dynamic";

export default async function PersonalisationPage() {
  const userSettings = await getUserSettings();

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <Sparkles className="h-8 w-8 text-primary" />
            Personalisation
          </h1>
          <p className="text-muted-foreground">
            Customize AI behavior, prompts, and preferences
          </p>
        </div>
      </div>

      <SettingsSection
        description="Customize your AI prompts for different document types"
        title="AI Prompts"
      >
        <UserPreferencesForm data={userSettings} />
      </SettingsSection>

      <SettingsSection
        description="Manage the suggestions displayed on your main chat page"
        title="Main Page Suggestions"
      >
        <SuggestionsForm data={userSettings} />
      </SettingsSection>
    </div>
  );
}
