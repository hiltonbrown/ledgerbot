import { PromptSettingsForm } from "@/components/settings/prompt-settings-form";
import { getUserSettings } from "../../api/user/data";

export const dynamic = "force-dynamic";

export default async function PersonalisationSettingsPage() {
  const data = await getUserSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">System Prompts</h2>
        <p className="text-muted-foreground text-sm">
          Customize the prompts used by the AI assistant for different types of
          tasks.
        </p>
      </div>
      <PromptSettingsForm data={data} />
    </div>
  );
}
