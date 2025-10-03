import { FileList } from "@/components/settings/file-list";
import { SettingsSection } from "@/components/settings/settings-section";
import { getFileSummary } from "../api/files/data";

export default function FilesPage() {
  const summary = getFileSummary();

  return (
    <div className="space-y-8">
      <SettingsSection
        description={`You are using ${summary.usage.used} GB of ${summary.usage.capacity} GB available.`}
        title="Workspace files"
      >
        <FileList files={summary.files} />
      </SettingsSection>
    </div>
  );
}
