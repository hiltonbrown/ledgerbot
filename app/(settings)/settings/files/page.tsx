import { Info } from "lucide-react";
import { ContextFileList } from "@/components/settings/context-file-list";
import { ContextFileUpload } from "@/components/settings/context-file-upload";
import { SettingsSection } from "@/components/settings/settings-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getContextFilesByUserId, getUserStorageUsage } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-3xl">Context Files</h1>
          <p className="text-muted-foreground">
            Manage files for persistent AI context across conversations
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold text-lg">Authentication Required</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Please sign in to manage context files
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [files, usage] = await Promise.all([
    getContextFilesByUserId({ userId: user.id }),
    getUserStorageUsage(user.id),
  ]);

  const maxStorage = entitlementsByUserType[user.type].maxStorageBytes;
  const usedBytes = usage?.totalSize ?? 0;
  const usedMb = (usedBytes / (1024 * 1024)).toFixed(2);
  const capacityMb = (maxStorage / (1024 * 1024)).toFixed(2);
  const usagePercentage = Math.round((usedBytes / maxStorage) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-3xl">Context Files</h1>
        <p className="text-muted-foreground">
          Manage files for persistent AI context across conversations
        </p>
      </div>

      {/* Storage Usage Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <p>
                <strong className="font-medium">Storage:</strong> {usedMb} MB of{" "}
                {capacityMb} MB used ({usagePercentage}%)
              </p>
            </div>
            <Progress value={usagePercentage} />
            <p className="text-xs">
              Files uploaded here are automatically included in all
              conversations as persistent context.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Upload and File List */}
      <SettingsSection title="Your Files">
        <ContextFileUpload currentUsage={usedBytes} maxStorage={maxStorage} />
        <ContextFileList files={files} />
      </SettingsSection>
    </div>
  );
}
