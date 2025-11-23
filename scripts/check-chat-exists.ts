import { eq } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import { chat } from "@/lib/db/schema";

async function checkChat() {
  const chatId = process.argv[2];
  if (!chatId) {
    console.error("Usage: tsx scripts/check-chat-exists.ts <chatId>");
    process.exit(1);
  }

  try {
    const result = await db.select().from(chat).where(eq(chat.id, chatId));
    console.log(`Chat ${chatId}:`, result.length > 0 ? "EXISTS" : "NOT FOUND");
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkChat();
