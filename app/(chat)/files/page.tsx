import { Files } from "lucide-react";
import { FileManager } from "@/components/files/file-manager";
import { ChatLayout } from "@/components/ui/chat-layout";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function FilesPage() {
  return (
    <ChatLayout>
      <PageHeader
        description="Manage your context files and control which files are used in all conversations"
        icon={Files}
        title="File Manager"
      />
      <FileManager />
    </ChatLayout>
  );
}
