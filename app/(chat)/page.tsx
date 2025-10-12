import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { generateUUID } from "@/lib/utils";

export default async function Page() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialModelId = modelIdFromCookie?.value;
  const isValidModelId =
    initialModelId && chatModelIds.includes(initialModelId);

  if (!isValidModelId) {
    return (
      <>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={initialModelId}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
