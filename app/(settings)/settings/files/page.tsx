import { ContextFileList } from "@/components/settings/context-file-list";
import { ContextFileUpload } from "@/components/settings/context-file-upload";
import { SettingsSection } from "@/components/settings/settings-section";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getContextFilesByUserId, getUserStorageUsage } from "@/lib/db/queries";

export default async function FilesPage() {
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const [files, usage] = await Promise.all([
    getContextFilesByUserId({ userId: user.id }),
    getUserStorageUsage(user.id),
  ]);

  const maxStorage = entitlementsByUserType[user.type].maxStorageBytes;
  const usedBytes = usage?.totalSize ?? 0;
  const usedMb = (usedBytes / (1024 * 1024)).toFixed(2);
  const capacityMb = (maxStorage / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-8">
      <SettingsSection
        description={`You are using ${usedMb} MB of ${capacityMb} MB available. Files uploaded here are automatically included in all conversations.`}
        title="Persistent context files"
      >
        <ContextFileUpload currentUsage={usedBytes} maxStorage={maxStorage} />
        <ContextFileList files={files} />
      </SettingsSection>
    </div>
  );
}
