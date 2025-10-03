import { SettingsSection } from "@/components/settings/settings-section";
import { UsageSummary } from "@/components/settings/usage-summary";
import { getUsageSummary } from "../../api/usage/data";

export default function UsagePage() {
  const summary = getUsageSummary();

  return (
    <div className="space-y-8">
      <SettingsSection
        description="Understand consumption across the workspace and proactively upgrade."
        title="Usage tracking"
      >
        <UsageSummary summary={summary} />
      </SettingsSection>
    </div>
  );
}
