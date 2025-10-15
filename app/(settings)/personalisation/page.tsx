import { SettingsSection } from "@/components/settings/settings-section";
import { SuggestionsForm } from "@/components/settings/suggestions-form";
import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { getUserSettings } from "../api/user/data";

export const dynamic = "force-dynamic";

export default async function PersonalisationPage() {
  const userSettings = await getUserSettings();

  return (
    <div className="space-y-8">
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
