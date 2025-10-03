import { SettingsSection } from "@/components/settings/settings-section";
import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { getUserSettings } from "../../api/user/data";

export default function UserSettingsPage() {
  const settings = getUserSettings();

  return (
    <div className="space-y-8">
      <SettingsSection
        description="These preferences sync to identity providers and invitations."
        title="Profile"
      >
        <UserPreferencesForm data={settings} />
      </SettingsSection>
    </div>
  );
}
