import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { generateUUID } from "@/lib/utils";
import { getUserSettings } from "../(settings)/api/user/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const id = generateUUID();
  const userSettings = await getUserSettings();
  const suggestions = userSettings.suggestions;
  const defaultModel = userSettings.personalisation.defaultModel;
  const defaultReasoning = userSettings.personalisation.defaultReasoning;

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialModelId = modelIdFromCookie?.value;
  const isValidModelId =
    initialModelId && chatModelIds.includes(initialModelId);

  // Use cookie model if valid, otherwise fall back to user's default model, then system default
  const selectedModel = isValidModelId
    ? initialModelId
    : defaultModel || DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={false}
        firstName={userSettings.personalisation.firstName}
        id={id}
        initialChatModel={selectedModel}
        initialDefaultReasoning={defaultReasoning}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        suggestions={suggestions}
      />
      <DataStreamHandler />
    </>
  );
}
