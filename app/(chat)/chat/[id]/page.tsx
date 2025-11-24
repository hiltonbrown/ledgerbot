import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getUserSettings } from "@/app/(settings)/api/user/data";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getChatById,
  getDocumentsByChatId,
  getMessagesByChatId,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const userSettings = await getUserSettings();

  if (chat.visibility === "private") {
    if (!user) {
      return notFound();
    }

    if (user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const documents = await getDocumentsByChatId({ chatId: id });

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const initialModelId = chatModelFromCookie?.value;
  const isValidModelId =
    initialModelId && chatModelIds.includes(initialModelId);

  // Get the most recent document to restore artifact
  const latestDocument = documents.length > 0 ? documents.at(-1) : null;

  if (!isValidModelId) {
    return (
      <>
        <Chat
          autoResume={true}
          firstName={userSettings.personalisation.firstName}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialDocument={latestDocument}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={user.id !== chat.userId}
          key={chat.id}
        />
        <DataStreamHandler chatId={chat.id} />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        firstName={userSettings.personalisation.firstName}
        id={chat.id}
        initialChatModel={initialModelId}
        initialDocument={latestDocument}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={user.id !== chat.userId}
        key={chat.id}
      />
      <DataStreamHandler chatId={chat.id} />
    </>
  );
}
