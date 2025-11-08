import { ProfileInfoCard } from "@/components/settings/profile-info-card";
import { PromptSettingsForm } from "@/components/settings/prompt-settings-form";
import { TemplateVariableForm } from "@/components/settings/template-variable-form";
import { getUserSettings } from "../../api/user/data";

export const dynamic = "force-dynamic";

export default async function PersonalisationSettingsPage() {
  const data = await getUserSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Profile</h2>
        <p className="text-muted-foreground text-sm">
          Your profile information is managed through Clerk authentication.
        </p>
      </div>
      <ProfileInfoCard data={data} />

      <div className="pt-4">
        <h2 className="font-semibold text-lg">Template Variables</h2>
        <p className="text-muted-foreground text-sm">
          Define variables that will be automatically substituted in your system
          prompts. Use these to personalize the AI assistant with your business
          information.
        </p>
      </div>
      <TemplateVariableForm data={data} />

      <div className="pt-4">
        <h2 className="font-semibold text-lg">System Prompts</h2>
        <p className="text-muted-foreground text-sm">
          Customize the prompts used by the AI assistant for different types of
          tasks. You can use template variables like {"{"}
          {"{"}COMPANY_NAME{"}"}
          {"}"} in your prompts.
        </p>
      </div>
      <PromptSettingsForm data={data} />
    </div>
  );
}
