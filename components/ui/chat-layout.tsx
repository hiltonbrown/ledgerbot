import type { ReactNode } from "react";
import { ChatHeader } from "@/components/chat-header";
import { PageContainer } from "@/components/ui/page-container";

interface ChatLayoutProps {
  children: ReactNode;
  maxWidth?: "4xl" | "6xl" | "7xl";
}

/**
 * Standard layout wrapper for pages in the (chat) route group.
 * Provides consistent ChatHeader and main content wrapper.
 *
 * Usage:
 * ```tsx
 * <ChatLayout>
 *   <PageHeader icon={Files} title="File Manager" description="..." />
 *   <YourContent />
 * </ChatLayout>
 * ```
 */
export function ChatLayout({ children, maxWidth = "6xl" }: ChatLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <ChatHeader chatId="" isReadonly={false} />
      <main className="flex-1 px-6 py-8">
        <PageContainer maxWidth={maxWidth}>{children}</PageContainer>
      </main>
    </div>
  );
}
