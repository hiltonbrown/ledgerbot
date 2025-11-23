import { Files } from "lucide-react";
import { FileManager } from "@/components/files/file-manager";

export const dynamic = "force-dynamic";

export default function FilesPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <Files className="h-8 w-8 text-primary" />
            File Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your context files and control which files are used in all
            conversations
          </p>
        </div>
      </div>

      <FileManager />
    </div>
  );
}
