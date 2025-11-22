import { count, eq } from "drizzle-orm";
import {
  BarChart3,
  ChevronRight,
  FileText,
  Plug,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { chat } from "@/lib/db/schema";
import { getFileSummary } from "../api/files/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, fileSummary] = await Promise.all([
    getAuthUser(),
    getFileSummary(),
  ]);

  // Get actual chat count
  let totalChats = 0;
  if (user) {
    const result = await db
      .select({ count: count() })
      .from(chat)
      .where(eq(chat.userId, user.id));
    totalChats = result[0]?.count ? Number(result[0].count) : 0;
  }

  const settingsSections = [
    {
      title: "Personalisation",
      description: "Customize AI behavior, prompts, and preferences",
      icon: Sparkles,
      href: "/settings/personalisation",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-500/10",
    },
    {
      title: "Usage & Analytics",
      description: "Track token usage, costs, and performance metrics",
      icon: BarChart3,
      href: "/settings/usage",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Context Files",
      description: "Manage files for persistent AI context",
      icon: FileText,
      href: "/settings/files",
      iconColor: "text-green-600",
      iconBg: "bg-green-500/10",
    },
    {
      title: "Integrations",
      description: "Connect accounting and payroll systems",
      icon: Plug,
      href: "/settings/integrations",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-500/10",
    },
    {
      title: "Agent Configuration",
      description: "Configure specialized accounting agents",
      icon: Users,
      href: "/settings/agents",
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your preferences, integrations, and AI configuration
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-muted-foreground text-sm">
                Total Chats
              </p>
              <p className="mt-2 font-bold text-3xl">
                {totalChats.toLocaleString()}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Conversation history
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-muted-foreground text-sm">
                Storage Used
              </p>
              <p className="mt-2 font-bold text-3xl">
                {fileSummary.usage.used} GB
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                of {fileSummary.usage.capacity} GB
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-muted-foreground text-sm">
                Total Files
              </p>
              <p className="mt-2 font-bold text-3xl">
                {fileSummary.usage.fileCount}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Context files uploaded
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Sections */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">Configuration</h3>
          <p className="text-muted-foreground text-sm">
            Customize your LedgerBot experience
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link href={section.href} key={section.title}>
                <Card className="group cursor-pointer p-6 transition-colors hover:border-primary">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${section.iconBg}`}
                      >
                        <Icon className={`h-6 w-6 ${section.iconColor}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">
                          {section.title}
                        </h4>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
