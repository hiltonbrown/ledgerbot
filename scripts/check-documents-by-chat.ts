import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL!);

async function checkDocuments() {
  const chatId = process.argv[2];
  if (!chatId) {
    console.error("Usage: tsx scripts/check-documents-by-chat.ts <chatId>");
    process.exit(1);
  }

  try {
    const result = await client`
      SELECT id, "chatId", title, kind, "createdAt"
      FROM "Document"
      WHERE "chatId" = ${chatId}
      ORDER BY "createdAt" ASC;
    `;

    console.log(`Documents for chat ${chatId}:`);
    console.table(result);

    await client.end();
  } catch (error) {
    console.error("Error:", error);
    await client.end();
    process.exit(1);
  }
}

checkDocuments();
