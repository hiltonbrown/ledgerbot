import { Files } from "lucide-react";
import { ChatHeader } from "@/components/chat-header";
import { FileManager } from "@/components/files/file-manager";

export const dynamic = "force-dynamic";

export default function FilesPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <ChatHeader chatId="" isReadonly={false} />
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
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
      </main>
    </div>
  );
}
